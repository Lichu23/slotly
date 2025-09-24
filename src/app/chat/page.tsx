"use client";

import { useEffect } from "react";
import { ChatContainer, ConversationHeader, MessageList, Message, MessageInput, TypingIndicator } from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { useChatStore } from "./store";

export default function ChatPage() {
  const { messages, isBotTyping, sendUserMessage, ensureBootstrapped } = useChatStore();

  useEffect(() => {
    ensureBootstrapped();
  }, [ensureBootstrapped]);

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="h-[90vh] w-full max-w-[900px]">
        <ChatContainer>
          <ConversationHeader>
            <ConversationHeader.Content userName="Asesoría de Visas" info="Chat de consulta" />
          </ConversationHeader>
          <MessageList typingIndicator={isBotTyping ? <TypingIndicator content="Escribiendo..." /> : undefined} autoScrollToBottom autoScrollToBottomOnMount>
            {messages.map((m) => {
              const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const bubbleColor = m.role === "user"
                ? "bg-[#dcf8c6] text-neutral-900 dark:bg-[#0b4f3a] dark:text-neutral-200"
                : "bg-gray-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100";
              return (
                <Message key={m.id} model={{ message: "", direction: m.role === "user" ? "outgoing" : "incoming", position: "single" }}>
                  <Message.CustomContent>
                    <div className={`relative pr-10 ${m.render ? "custom-block" : ""}`}>
                      {(m.text) ? (
                        <div className={`inline-block rounded-[14px] px-3 py-2 ${bubbleColor}`}>
                          <span className="whitespace-pre-wrap">{m.text}</span>
                        </div>
                      ) : null}
                      {m.render ? m.render : null}
                      <span className="absolute right-1 bottom-1 text-[11px] opacity-70 select-none whitespace-nowrap">{time}</span>
                    </div>
                  </Message.CustomContent>
                </Message>
              );
            })}
          </MessageList>
          {/* Input visible solo en modo preguntas */}
          {useChatStore.getState().mode === "asking" ? (
            <MessageInput placeholder="Escribe tu respuesta..." attachButton={false} onSend={(text) => sendUserMessage(text)} />
          ) : null}
        </ChatContainer>
      </div>
    </div>
  );
}


