/**
 * Coze API 客户端
 * 用于调用 Coze Bot API
 */

interface CozeMessage {
  role: 'user' | 'assistant';
  content: string;
  content_type: 'text';
}

interface CozeChatRequest {
  bot_id: string;
  user_id: string;
  stream: boolean;
  auto_save_history: boolean;
  additional_messages: CozeMessage[];
}

interface CozeChatResponse {
  code: number;
  msg: string;
  data?: {
    id: string;
    conversation_id: string;
    bot_id: string;
    created_at: number;
    completed_at?: number;
    status: string;
    last_error?: {
      code: number;
      msg: string;
    };
  };
}

interface CozeMessageResponse {
  code: number;
  msg: string;
  data?: Array<{
    id: string;
    conversation_id: string;
    bot_id: string;
    chat_id: string;
    role: string;
    type: string;
    content: string;
    content_type: string;
  }>;
}

export class CozeClient {
  private apiKey: string;
  private botId: string;
  private baseUrl = 'https://api.coze.com';

  constructor(apiKey: string, botId: string) {
    this.apiKey = apiKey;
    this.botId = botId;
  }

  /**
   * 发送聊天消息并获取回复
   */
  async chat(userMessage: string, userId: string = 'default_user'): Promise<string> {
    // 1. 发起聊天
    const chatResponse = await this.createChat(userMessage, userId);
    
    if (chatResponse.code !== 0 || !chatResponse.data) {
      throw new Error(`Coze chat failed: ${chatResponse.msg}`);
    }

    const { id: chatId, conversation_id: conversationId } = chatResponse.data;

    // 2. 轮询等待聊天完成
    let status = chatResponse.data.status;
    let attempts = 0;
    const maxAttempts = 60; // 最多等待60秒

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      await this.sleep(1000);
      const statusResponse = await this.getChatStatus(conversationId, chatId);
      if (statusResponse.data) {
        status = statusResponse.data.status;
      }
      attempts++;
    }

    if (status === 'failed') {
      throw new Error('Coze chat failed');
    }

    if (status !== 'completed') {
      throw new Error('Coze chat timeout');
    }

    // 3. 获取聊天消息
    const messagesResponse = await this.getChatMessages(conversationId, chatId);
    
    if (messagesResponse.code !== 0 || !messagesResponse.data) {
      throw new Error(`Failed to get chat messages: ${messagesResponse.msg}`);
    }

    // 找到 assistant 的回复
    const assistantMessage = messagesResponse.data.find(
      msg => msg.role === 'assistant' && msg.type === 'answer'
    );

    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    return assistantMessage.content;
  }

  /**
   * 创建聊天
   */
  private async createChat(message: string, userId: string): Promise<CozeChatResponse> {
    const response = await fetch(`${this.baseUrl}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: this.botId,
        user_id: userId,
        stream: false,
        auto_save_history: true,
        additional_messages: [
          {
            role: 'user',
            content: message,
            content_type: 'text',
          },
        ],
      } as CozeChatRequest),
    });

    return response.json();
  }

  /**
   * 获取聊天状态
   */
  private async getChatStatus(conversationId: string, chatId: string): Promise<CozeChatResponse> {
    const response = await fetch(
      `${this.baseUrl}/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json();
  }

  /**
   * 获取聊天消息
   */
  private async getChatMessages(conversationId: string, chatId: string): Promise<CozeMessageResponse> {
    const response = await fetch(
      `${this.baseUrl}/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建 Coze 客户端实例
 */
export function createCozeClient(): CozeClient {
  const apiKey = process.env.COZE_API_KEY;
  const botId = process.env.COZE_BOT_ID;

  if (!apiKey || !botId) {
    throw new Error('COZE_API_KEY and COZE_BOT_ID environment variables are required');
  }

  return new CozeClient(apiKey, botId);
}
