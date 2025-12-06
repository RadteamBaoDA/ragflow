import axios, { AxiosInstance } from 'axios';

interface TracePayload {
  email: string;
  message: string;
  role?: 'user' | 'assistant';
  response?: string;
  metadata?: {
    source?: string;
    chatId?: string;
    sessionId?: string;
    model?: string;
    modelName?: string;
    task?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    tags?: string[];
    [key: string]: unknown;
  };
}

interface TraceResponse {
  success: boolean;
  traceId?: string;
  error?: string;
}

class ExternalTraceApi {
  private client: AxiosInstance;

  constructor() {
    console.log(
      '[Debug] ExternalTraceApi constructor',
      process.env.EXTERNAL_TRACE_API_URL,
      process.env.EXTERNAL_TRACE_URL,
    );
    console.log(
      '[Debug] ExternalTraceApi constructor',
      process.env.EXTERNAL_TRACE_API_KEY,
    );
    this.client = axios.create({
      baseURL:
        process.env.EXTERNAL_TRACE_API_URL || process.env.EXTERNAL_TRACE_URL,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EXTERNAL_TRACE_API_KEY && {
          'x-api-key': process.env.EXTERNAL_TRACE_API_KEY,
        }),
      },
    });
  }

  async sendTrace(payload: TracePayload): Promise<TraceResponse> {
    console.log('[Debug] ExternalTraceApi sending payload:', payload);
    const { data } = await this.client.post<TraceResponse>(
      '/api/external/trace',
      payload,
    );
    return data;
  }

  async sendUserMessage(
    email: string,
    message: string,
    chatId: string,
  ): Promise<TraceResponse> {
    return this.sendTrace({
      email,
      message,
      role: 'user',
      metadata: { chatId, source: 'next-chats-share' },
    });
  }

  async sendAssistantResponse(
    email: string,
    message: string,
    response: string,
    chatId: string,
    model?: string,
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    },
  ): Promise<TraceResponse> {
    return this.sendTrace({
      email,
      message,
      role: 'assistant',
      response,
      metadata: {
        chatId,
        source: 'next-chats-share',
        model,
        task: 'llm_response',
        usage,
      },
    });
  }
}

export const externalTraceApi = new ExternalTraceApi();
