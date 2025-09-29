"use client";

import { useEffect } from "react";
import { ChatContainer, ConversationHeader, MessageList, Message, TypingIndicator } from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { useChatStore } from "./store";
import CustomMessageInput from "./CustomMessageInput";

// CSS para sobrescribir el fondo azul de ChatScope
const customStyles = `
  .cs-message__content {
    background: transparent !important;
  }
  .cs-message--incoming .cs-message__content {
    background: transparent !important;
  }
  .cs-message--outgoing .cs-message__content {
    background: transparent !important;
  }
`;

export default function ChatPage() {
  const { messages, isBotTyping, sendUserMessage, ensureBootstrapped, mode } = useChatStore();

  useEffect(() => {
    ensureBootstrapped();
  }, [ensureBootstrapped]);

  return (
    <div className="h-screen w-full flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="h-full w-full max-w-4xl mx-auto flex flex-col">
        <ChatContainer className="h-full flex flex-col">
          <ConversationHeader className="bg-white border-b border-gray-200 flex-shrink-0">
            <ConversationHeader.Content 
              userName="Asesoría de Visas" 
              info="Chat de consulta" 
              className="text-black font-semibold text-sm sm:text-base"
            />
          </ConversationHeader>
          <MessageList 
            className="bg-white flex-1 overflow-y-auto [&_.cs-message]:mb-4"
            typingIndicator={isBotTyping ? <TypingIndicator content="Escribiendo..." /> : undefined} 
            autoScrollToBottom 
            autoScrollToBottomOnMount
          >
            {messages.map((m) => {
              const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <Message key={m.id} data-message-id={m.id} model={{ message: "", direction: m.role === "user" ? "outgoing" : "incoming", position: "single" }}>
                  <Message.CustomContent>
                    {(m.text) ? (
                      <div className={`rounded-xl relative px-3 py-3 border ${
                        m.role === "user" 
                          ? "bg-black text-white border-black" 
                          : "bg-white text-black border-gray-300"
                      }`}>
                        <div className="pr-12">
                          <span className="whitespace-pre-wrap text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: m.text.replace(/&nbsp;/g, ' ') }} />
                        </div>
                        <span className="absolute right-2 bottom-2 text-xs opacity-60 select-none whitespace-nowrap">{time}</span>
                      </div>
                    ) : null}
                    {m.render ? (
                      <div className="w-full mt-2">
                        {m.render}
                      </div>
                    ) : null}
                  </Message.CustomContent>
                </Message>
              );
            })}
          </MessageList>
        </ChatContainer>
        {/* Input fuera del ChatContainer para asegurar visibilidad - solo visible en modo asking */}
        {mode === "asking" && (
          <CustomMessageInput 
            onSend={sendUserMessage}
            disabled={isBotTyping}
            placeholder="Escribe tu mensaje..."
          />
        )}
      </div>
    </div>
  );
}