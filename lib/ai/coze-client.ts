/**
 * Coze API 客户端（国内版）
 * 用于调用扣子 Bot API
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

export class CozeClient {
  private apiKey: string;
  private botId: string;
  private baseUrl = 'https://api.coze.cn'; // 国内版扣子 API 地址

  constructor(apiKey: string, botId: string) {
    this.apiKey = apiKey;
    this.botId = botId;
  }

  /**
   * 发送聊天消息并获取回复（使用流式响应）
   */
  async chat(userMessage: string, userId: string = 'default_user'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v3/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: this.botId,
        user_id: userId,
        stream: true, // 国内版扣子必须使用流式响应
        auto_save_history: false,
        additional_messages: [
          {
            role: 'user',
            content: userMessage,
            content_type: 'text',
          },
        ],
      } as CozeChatRequest),
    });

    if (!response.ok) {
      throw new Error(`Coze API error: ${response.status} ${response.statusText}`);
    }

    // 解析 SSE 流式响应
    const text = await response.text();
    const lines = text.split('\n');
    
    let fullContent = '';
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (dataStr === '"[DONE]"') {
          break;
        }
        
        try {
          const data = JSON.parse(dataStr);
          // 只收集 answer 类型的完整消息
          if (data.type === 'answer' && data.role === 'assistant') {
            // 检查是否是 conversation.message.completed 事件（包含完整内容）
            if (data.content && data.time_cost) {
              fullContent = data.content;
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    if (!fullContent) {
      throw new Error('No assistant response found in stream');
    }

    return fullContent;
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
