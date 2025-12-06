import { EmbedContainer } from '@/components/embed-container';
import { NextMessageInput } from '@/components/message-input/next';
import MessageItem from '@/components/message-item';
import PdfSheet from '@/components/pdf-drawer';
import { useClickDrawer } from '@/components/pdf-drawer/hooks';
import { useSyncThemeFromParams } from '@/components/theme-provider';
import { MessageType, SharedFrom } from '@/constants/chat';
import { useFetchFlowSSE } from '@/hooks/use-agent-request';
import {
  useFetchExternalChatInfo,
  useFetchNextConversationSSE,
} from '@/hooks/use-chat-request';
import i18n from '@/locales/config';
import { buildMessageUuidWithRole } from '@/utils/chat';
import axios from 'axios';
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'umi';
import { v4 as uuidv4 } from 'uuid';
import { useSendButtonDisabled } from '../hooks/use-button-disabled';
import {
  useGetSharedChatSearchParams,
  useSendSharedMessage,
} from '../hooks/use-send-shared-message';
import { buildMessageItemReference } from '../utils';

const ChatContainer = () => {
  const {
    sharedId: conversationId,
    from,
    locale,
    theme,
    visibleAvatar,
  } = useGetSharedChatSearchParams();
  useSyncThemeFromParams(theme);
  const { visible, hideModal, documentId, selectedChunk, clickDocumentButton } =
    useClickDrawer();

  const {
    handlePressEnter,
    handleInputChange,
    value,
    sendLoading,
    derivedMessages,
    hasError,
    stopOutputMessage,
    scrollRef,
    messageContainerRef,
    removeAllMessagesExceptFirst,
  } = useSendSharedMessage();
  const sendDisabled = useSendButtonDisabled(value);
  const { data: chatInfo } = useFetchExternalChatInfo();
  const [searchParams] = useSearchParams();
  const [traceId, setTraceId] = useState<string>(uuidv4());
  const [lastQuestion, setLastQuestion] = useState<string>('');
  const prevSendLoading = useRef(false);

  // Get user ID (email) from URL params
  const email =
    searchParams.get('email') || searchParams.get('user_id') || 'anonymous';

  const sendTrace = async (
    role: 'user' | 'assistant',
    messageContent: string,
    responseContent: string | null = null,
  ) => {
    try {
      const apiUrl =
        process.env.EXTERNAL_TRACE_API_URL ||
        process.env.EXTERNAL_TRACE_URL ||
        '/api/external/trace';
      await axios.post(apiUrl, {
        email,
        message: messageContent,
        role,
        response: responseContent,
        metadata: {
          chatId: conversationId || 'unknown',
          traceId,
          source: 'next-chats-share',
        },
      });
    } catch (e) {
      console.error('Failed to send trace:', e);
    }
  };

  const handlePressEnterWrapped = (documentIds: string[]) => {
    const currentQuestion = value;
    setLastQuestion(currentQuestion);
    handlePressEnter(documentIds);
    sendTrace('user', currentQuestion);
  };

  useEffect(() => {
    if (
      !sendLoading &&
      prevSendLoading.current &&
      derivedMessages &&
      derivedMessages.length > 0
    ) {
      const lastMsg = derivedMessages[derivedMessages.length - 1];
      if (lastMsg.role === MessageType.Assistant) {
        sendTrace('assistant', lastQuestion, lastMsg.content);
      }
    }
    prevSendLoading.current = sendLoading;
  }, [sendLoading, derivedMessages, lastQuestion]);

  const handleReset = () => {
    removeAllMessagesExceptFirst();
    setTraceId(uuidv4());
  };

  const useFetchAvatar = useMemo(() => {
    return from === SharedFrom.Agent
      ? useFetchFlowSSE
      : useFetchNextConversationSSE;
  }, [from]);
  React.useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, visibleAvatar]);

  const { data: avatarData } = useFetchAvatar();

  if (!conversationId) {
    return <div>empty</div>;
  }

  return (
    <>
      <EmbedContainer
        title={chatInfo.title}
        avatar={chatInfo.avatar}
        handleReset={handleReset}
      >
        <div className="flex flex-1 flex-col p-2.5  h-[90vh] m-3">
          <div
            className={
              'flex flex-1 flex-col overflow-auto scrollbar-auto m-auto w-5/6'
            }
            ref={messageContainerRef}
          >
            <div>
              {derivedMessages?.map((message, i) => {
                return (
                  <MessageItem
                    visibleAvatar={visibleAvatar}
                    key={buildMessageUuidWithRole(message)}
                    avatarDialog={avatarData?.avatar}
                    item={message}
                    nickname="You"
                    reference={buildMessageItemReference(
                      {
                        message: derivedMessages,
                        reference: [],
                      },
                      message,
                    )}
                    loading={
                      message.role === MessageType.Assistant &&
                      sendLoading &&
                      derivedMessages?.length - 1 === i
                    }
                    index={i}
                    clickDocumentButton={clickDocumentButton}
                    showLikeButton={false}
                    showLoudspeaker={false}
                  ></MessageItem>
                );
              })}
            </div>
            <div ref={scrollRef} />
          </div>
          <div className="flex w-full justify-center mb-8">
            <div className="w-5/6">
              <NextMessageInput
                isShared
                value={value}
                disabled={hasError}
                sendDisabled={sendDisabled}
                conversationId={conversationId}
                onInputChange={handleInputChange}
                onPressEnter={handlePressEnterWrapped}
                sendLoading={sendLoading}
                uploadMethod="external_upload_and_parse"
                showUploadIcon={false}
                stopOutputMessage={stopOutputMessage}
              ></NextMessageInput>
            </div>
          </div>
        </div>
      </EmbedContainer>
      {visible && (
        <PdfSheet
          visible={visible}
          hideModal={hideModal}
          documentId={documentId}
          chunk={selectedChunk}
          width={'90vw'}
        ></PdfSheet>
      )}
    </>
  );
};

export default forwardRef(ChatContainer);
