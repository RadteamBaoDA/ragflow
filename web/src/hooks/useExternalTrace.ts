import { useCallback, useState } from 'react';
import { externalTraceApi } from '../services/externalTraceApi';

interface UseExternalTraceOptions {
  email: string;
  chatId: string;
}

export function useExternalTrace({ email, chatId }: UseExternalTraceOptions) {
  const [isTracing, setIsTracing] = useState(false);
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);

  const traceUserMessage = useCallback(
    async (message: string) => {
      console.log('[Debug] traceUserMessage:', { message, email, chatId });
      setIsTracing(true);
      try {
        const result = await externalTraceApi.sendUserMessage(
          email,
          message,
          chatId,
        );
        if (result.traceId) setLastTraceId(result.traceId);
        return result;
      } finally {
        setIsTracing(false);
      }
    },
    [email, chatId],
  );

  const traceAssistantResponse = useCallback(
    async (
      message: string,
      response: string,
      model?: string,
      usage?: { promptTokens?: number; completionTokens?: number },
    ) => {
      console.log('[Debug] traceAssistantResponse:', {
        message,
        response,
        model,
        usage,
        email,
        chatId,
      });
      setIsTracing(true);
      try {
        const result = await externalTraceApi.sendAssistantResponse(
          email,
          message,
          response,
          chatId,
          model,
          usage,
        );
        if (result.traceId) setLastTraceId(result.traceId);
        return result;
      } finally {
        setIsTracing(false);
      }
    },
    [email, chatId],
  );

  return {
    traceUserMessage,
    traceAssistantResponse,
    isTracing,
    lastTraceId,
    setLastTraceId,
  };
}
