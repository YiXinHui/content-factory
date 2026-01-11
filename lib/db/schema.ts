import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ============================================
// 原有表结构（保留兼容性）
// ============================================

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// ============================================
// 流淌内容工厂 - 新增表结构
// ============================================

// 项目阶段枚举
export const projectStageEnum = pgEnum("project_stage", [
  "mining",      // 内容挖掘
  "analysis",    // 内容分析
  "director",    // 编导
  "copywriter",  // 文案
  "planning",    // 选题策划
  "completed",   // 已完成
]);

// 产出物类型枚举
export const outputTypeEnum = pgEnum("output_type", [
  "director",    // 编导产出
  "copywriter",  // 文案产出
]);

// 发散方向枚举
export const directionEnum = pgEnum("direction", [
  "up",       // 向上（原因探究）
  "down",     // 向下（结果预测）
  "parallel", // 平行（相关场景）
]);

// 项目表
export const project = pgTable("Project", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  title: varchar("title", { length: 255 }).notNull(),
  originalText: text("originalText").notNull(),
  currentStage: projectStageEnum("currentStage").notNull().default("mining"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Project = InferSelectModel<typeof project>;

// 支撑素材类型
export type SupportMaterials = {
  cases: number;
  quotes: number;
  data: number;
};

// 主题表（内容挖掘师产出）
export const topic = pgTable("Topic", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  coreIdea: text("coreIdea").notNull(),
  emotionLevel: integer("emotionLevel").notNull().default(3), // 1-5
  supportMaterials: json("supportMaterials").$type<SupportMaterials>().notNull(),
  highlightedText: json("highlightedText").$type<string[]>().notNull(),
  reason: text("reason"), // 为什么这个主题值得深挖
  isSelected: boolean("isSelected").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Topic = InferSelectModel<typeof topic>;

// 认知对比类型
export type CognitiveContrast = {
  commonBelief: string;
  ourPoint: string;
  tension: string;
};

// 逻辑链条类型
export type LogicChain = {
  because: string;
  so: string;
  moreover: string;
};

// 传播元素类型
export type SpreadElements = {
  quotes: string[];
  cases: string[];
  data: string[];
};

// 受众问题类型
export type AudienceQuestion = {
  question: string;
  answerDirection: string;
};

// 深度分析表（内容分析师产出）
export const analysis = pgTable("Analysis", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  topicId: uuid("topicId")
    .notNull()
    .references(() => topic.id, { onDelete: "cascade" }),
  coreArgument: text("coreArgument").notNull(),
  cognitiveContrast: json("cognitiveContrast").$type<CognitiveContrast>().notNull(),
  logicChain: json("logicChain").$type<LogicChain>().notNull(),
  spreadElements: json("spreadElements").$type<SpreadElements>().notNull(),
  audienceQuestions: json("audienceQuestions").$type<AudienceQuestion[]>().notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Analysis = InferSelectModel<typeof analysis>;

// 编导内容类型
export type DirectorContent = {
  contentType: string; // 观点类/知识类/故事类
  structure: {
    name: string;
    description: string;
    parts: string[];
  };
  clipPoints: {
    part: string;
    purpose: string;
    originalText: string;
    duration: string;
  }[];
  rerecordSuggestions: {
    position: string;
    type: string;
    content: string;
  }[];
  preview: string;
};

// 文案公式类型
export type CopywriterFormula = {
  name: string;
  description: string;
  whyFit: string;
  example: string;
};

// 文案结构类型
export type CopywriterStructure = {
  section: string;
  subtitle: string;
  keyPoints: string[];
  estimatedWords: number;
}[];

// 文案标题类型
export type CopywriterTitle = {
  title: string;
  elements: string[];
  hook: string;
};

// 文案内容类型
export type CopywriterContent = {
  formulas?: CopywriterFormula[];
  selectedFormula?: CopywriterFormula;
  structure?: CopywriterStructure;
  totalEstimatedWords?: number;
  titles?: CopywriterTitle[];
  selectedTitle?: CopywriterTitle;
  fullContent?: string;
  currentStep: number; // 1-4
};

// 产出物表（编导/文案产出）
export const output = pgTable("Output", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  analysisId: uuid("analysisId")
    .notNull()
    .references(() => analysis.id, { onDelete: "cascade" }),
  type: outputTypeEnum("type").notNull(),
  directorContent: json("directorContent").$type<DirectorContent>(),
  copywriterContent: json("copywriterContent").$type<CopywriterContent>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Output = InferSelectModel<typeof output>;

// 新选题类型
export type NewTopicData = {
  title: string;
  direction: "up" | "down" | "parallel";
  directionLabel: string;
  description: string;
  potentialAngle: string;
};

// 新选题表（选题策划产出）
export const newTopic = pgTable("NewTopic", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  outputId: uuid("outputId")
    .notNull()
    .references(() => output.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  direction: directionEnum("direction").notNull(),
  directionLabel: varchar("directionLabel", { length: 50 }).notNull(),
  description: text("description").notNull(),
  potentialAngle: text("potentialAngle"),
  isUsed: boolean("isUsed").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type NewTopic = InferSelectModel<typeof newTopic>;
