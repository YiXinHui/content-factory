import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}


// ============================================
// 流淌内容工厂 - 数据库查询函数
// ============================================

import {
  type Project,
  project,
  type Topic,
  topic,
  type Analysis,
  analysis,
  type Output,
  output,
  type NewTopic,
  newTopic,
  type SupportMaterials,
  type CognitiveContrast,
  type LogicChain,
  type SpreadElements,
  type AudienceQuestion,
  type DirectorContent,
  type CopywriterContent,
} from "./schema";

// ========== 项目相关 ==========

export async function createProject({
  userId,
  title,
  originalText,
}: {
  userId: string;
  title: string;
  originalText: string;
}): Promise<Project> {
  try {
    const [newProject] = await db
      .insert(project)
      .values({
        userId,
        title,
        originalText,
        currentStage: "mining",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newProject;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create project");
  }
}

export async function getProjectById({ id }: { id: string }): Promise<Project | null> {
  try {
    const [selectedProject] = await db
      .select()
      .from(project)
      .where(eq(project.id, id));
    return selectedProject || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get project by id");
  }
}

export async function getProjectsByUserId({
  userId,
  limit = 20,
}: {
  userId: string;
  limit?: number;
}): Promise<Project[]> {
  try {
    return await db
      .select()
      .from(project)
      .where(eq(project.userId, userId))
      .orderBy(desc(project.updatedAt))
      .limit(limit);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get projects by user id");
  }
}

export async function updateProjectStage({
  id,
  stage,
}: {
  id: string;
  stage: "mining" | "analysis" | "director" | "copywriter" | "planning" | "completed";
}): Promise<void> {
  try {
    await db
      .update(project)
      .set({ currentStage: stage, updatedAt: new Date() })
      .where(eq(project.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update project stage");
  }
}

export async function updateProjectTitle({
  id,
  title,
}: {
  id: string;
  title: string;
}): Promise<void> {
  try {
    await db
      .update(project)
      .set({ title, updatedAt: new Date() })
      .where(eq(project.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update project title");
  }
}

export async function deleteProject({ id }: { id: string }): Promise<void> {
  try {
    // 级联删除会自动处理关联数据
    await db.delete(project).where(eq(project.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete project");
  }
}

// ========== 主题相关 ==========

export async function createTopics({
  topics,
}: {
  topics: {
    projectId: string;
    title: string;
    coreIdea: string;
    emotionLevel: number;
    supportMaterials: SupportMaterials;
    highlightedText: string[];
    reason?: string;
  }[];
}): Promise<Topic[]> {
  try {
    return await db.insert(topic).values(topics).returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create topics");
  }
}

export async function getTopicsByProjectId({
  projectId,
}: {
  projectId: string;
}): Promise<Topic[]> {
  try {
    return await db
      .select()
      .from(topic)
      .where(eq(topic.projectId, projectId))
      .orderBy(desc(topic.emotionLevel));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get topics by project id");
  }
}

export async function getTopicById({ id }: { id: string }): Promise<Topic | null> {
  try {
    const [selectedTopic] = await db.select().from(topic).where(eq(topic.id, id));
    return selectedTopic || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get topic by id");
  }
}

export async function selectTopic({ id }: { id: string }): Promise<void> {
  try {
    await db.update(topic).set({ isSelected: true }).where(eq(topic.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to select topic");
  }
}

// ========== 分析相关 ==========

export async function createAnalysis({
  topicId,
  coreArgument,
  cognitiveContrast,
  logicChain,
  spreadElements,
  audienceQuestions,
}: {
  topicId: string;
  coreArgument: string;
  cognitiveContrast: CognitiveContrast;
  logicChain: LogicChain;
  spreadElements: SpreadElements;
  audienceQuestions: AudienceQuestion[];
}): Promise<Analysis> {
  try {
    const [newAnalysis] = await db
      .insert(analysis)
      .values({
        topicId,
        coreArgument,
        cognitiveContrast,
        logicChain,
        spreadElements,
        audienceQuestions,
        createdAt: new Date(),
      })
      .returning();
    return newAnalysis;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create analysis");
  }
}

export async function getAnalysisByTopicId({
  topicId,
}: {
  topicId: string;
}): Promise<Analysis | null> {
  try {
    const [selectedAnalysis] = await db
      .select()
      .from(analysis)
      .where(eq(analysis.topicId, topicId));
    return selectedAnalysis || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get analysis by topic id");
  }
}

export async function getAnalysisById({ id }: { id: string }): Promise<Analysis | null> {
  try {
    const [selectedAnalysis] = await db
      .select()
      .from(analysis)
      .where(eq(analysis.id, id));
    return selectedAnalysis || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get analysis by id");
  }
}

// ========== 产出物相关 ==========

export async function createOutput({
  analysisId,
  type,
  directorContent,
  copywriterContent,
}: {
  analysisId: string;
  type: "director" | "copywriter";
  directorContent?: DirectorContent;
  copywriterContent?: CopywriterContent;
}): Promise<Output> {
  try {
    const [newOutput] = await db
      .insert(output)
      .values({
        analysisId,
        type,
        directorContent,
        copywriterContent,
        createdAt: new Date(),
      })
      .returning();
    return newOutput;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create output");
  }
}

export async function updateOutput({
  id,
  directorContent,
  copywriterContent,
}: {
  id: string;
  directorContent?: DirectorContent;
  copywriterContent?: CopywriterContent;
}): Promise<void> {
  try {
    const updateData: Partial<Output> = {};
    if (directorContent) updateData.directorContent = directorContent;
    if (copywriterContent) updateData.copywriterContent = copywriterContent;
    
    await db.update(output).set(updateData).where(eq(output.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update output");
  }
}

export async function getOutputByAnalysisId({
  analysisId,
  type,
}: {
  analysisId: string;
  type?: "director" | "copywriter";
}): Promise<Output | null> {
  try {
    let query = db.select().from(output).where(eq(output.analysisId, analysisId));
    
    if (type) {
      query = db
        .select()
        .from(output)
        .where(and(eq(output.analysisId, analysisId), eq(output.type, type)));
    }
    
    const [selectedOutput] = await query;
    return selectedOutput || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get output by analysis id");
  }
}

export async function getOutputById({ id }: { id: string }): Promise<Output | null> {
  try {
    const [selectedOutput] = await db.select().from(output).where(eq(output.id, id));
    return selectedOutput || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get output by id");
  }
}

// ========== 新选题相关 ==========

export async function createNewTopics({
  topics,
}: {
  topics: {
    outputId: string;
    title: string;
    direction: "up" | "down" | "parallel";
    directionLabel: string;
    description: string;
    potentialAngle?: string;
  }[];
}): Promise<NewTopic[]> {
  try {
    return await db.insert(newTopic).values(topics).returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create new topics");
  }
}

export async function getNewTopicsByOutputId({
  outputId,
}: {
  outputId: string;
}): Promise<NewTopic[]> {
  try {
    return await db
      .select()
      .from(newTopic)
      .where(eq(newTopic.outputId, outputId))
      .orderBy(asc(newTopic.createdAt));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get new topics by output id");
  }
}

export async function markNewTopicAsUsed({ id }: { id: string }): Promise<void> {
  try {
    await db.update(newTopic).set({ isUsed: true }).where(eq(newTopic.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to mark new topic as used");
  }
}

// ========== 复合查询 ==========

export async function getProjectWithDetails({ id }: { id: string }) {
  try {
    const projectData = await getProjectById({ id });
    if (!projectData) return null;

    const topics = await getTopicsByProjectId({ projectId: id });
    
    // 获取每个主题的分析
    const topicsWithAnalysis = await Promise.all(
      topics.map(async (t) => {
        const analysisData = await getAnalysisByTopicId({ topicId: t.id });
        let outputs: Output[] = [];
        
        if (analysisData) {
          const directorOutput = await getOutputByAnalysisId({
            analysisId: analysisData.id,
            type: "director",
          });
          const copywriterOutput = await getOutputByAnalysisId({
            analysisId: analysisData.id,
            type: "copywriter",
          });
          outputs = [directorOutput, copywriterOutput].filter(Boolean) as Output[];
        }
        
        return {
          ...t,
          analysis: analysisData,
          outputs,
        };
      })
    );

    return {
      ...projectData,
      topics: topicsWithAnalysis,
    };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get project with details");
  }
}
