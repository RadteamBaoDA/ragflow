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

  /**
   * Sends a trace payload to the external tracing API.
   * @param payload The trace data to send.
   * @returns A promise that resolves to a TraceResponse indicating success or failure.
   */
  async sendTrace(payload: TracePayload): Promise<TraceResponse> {
    // Determine the correct path. If baseURL already includes the path, use empty string.
    const baseURL = this.client.defaults.baseURL || '';
    const path = baseURL.includes('/api/external/trace')
      ? ''
      : '/api/external/trace';

    const { data } = await this.client.post<TraceResponse>(path, payload);
    return data;
  }

  /**
   * Sends a user message to the external tracing API.
   * @param email The email of the user.
   * @param message The user's message.
   * @param chatId The ID of the chat.
   * @param sessionId The ID of the session.
   * @returns A promise that resolves to a TraceResponse indicating success or failure.
   */
  async sendUserMessage(
    email: string,
    message: string,
    chatId: string,
    sessionId?: string,
  ): Promise<TraceResponse> {
    return this.sendTrace({
      email,
      message,
      role: 'user',
      metadata: { chatId, source: 'knowledge-base', sessionId },
    });
  }

  /**
   * Sends an assistant response to the external tracing API.
   * @param email The email of the user.
   * @param message The assistant's message.
   * @param response The assistant's response.
   * @param chatId The ID of the chat.
   * @param model The model used for the assistant's response.
   * @param usage The usage data for the assistant's response.
   * @param sessionId The ID of the session.
   * @returns A promise that resolves to a TraceResponse indicating success or failure.
   */
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
    sessionId?: string,
  ): Promise<TraceResponse> {
    return this.sendTrace({
      email,
      message,
      role: 'assistant',
      response,
      metadata: {
        chatId,
        source: 'knowledge-base',
        model,
        task: 'llm_response',
        usage,
        sessionId,
      },
    });
  }
}

export const externalTraceApi = new ExternalTraceApi();
