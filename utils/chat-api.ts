/**
 * Chat API URL Utilities
 *
 * Provides centralized URL management for chat API endpoints.
 * Routes requests to the configured Nova Agent service URL.
 */

/**
 * Get the chat stream endpoint URL
 * @param serviceUrl - The base service URL
 * @returns URL for the chat streaming endpoint
 */
export const getChatStreamUrl = (serviceUrl: string): string => {
  const baseUrl = serviceUrl.replace(/\/$/, "");
  return `${baseUrl}/api/chat/stream`;
};

/**
 * Get the URL for listing all chats
 * @param serviceUrl - The base service URL
 * @returns URL for the chat list endpoint
 */
export const getChatListUrl = (serviceUrl: string): string => {
  const baseUrl = serviceUrl.replace(/\/$/, "");
  return `${baseUrl}/api/chats/list`;
};

/**
 * Get the URL for fetching chat messages
 * @param serviceUrl - The base service URL
 * @param chatId - The chat ID
 * @returns URL for the chat messages endpoint
 */
export const getChatMessagesUrl = (serviceUrl: string, chatId: string): string => {
  const baseUrl = serviceUrl.replace(/\/$/, "");
  return `${baseUrl}/api/chat/${chatId}/messages`;
};

/**
 * Get the URL for updating a chat
 * @param serviceUrl - The base service URL
 * @param chatId - The chat ID
 * @returns URL for the chat update endpoint
 */
export const getChatUpdateUrl = (serviceUrl: string, chatId: string): string => {
  const baseUrl = serviceUrl.replace(/\/$/, "");
  return `${baseUrl}/api/chats/${chatId}`;
};

/**
 * Get the URL for deleting a chat
 * @param serviceUrl - The base service URL
 * @param chatId - The chat ID
 * @returns URL for the chat delete endpoint
 */
export const getChatDeleteUrl = (serviceUrl: string, chatId: string): string => {
  const baseUrl = serviceUrl.replace(/\/$/, "");
  return `${baseUrl}/api/chat/${chatId}/delete`;
};

/**
 * Get the URL for message feedback
 * @param serviceUrl - The base service URL
 * @param messageId - The message ID
 * @returns URL for the message feedback endpoint
 */
export const getMessageFeedbackUrl = (serviceUrl: string, messageId: string): string => {
  const baseUrl = serviceUrl.replace(/\/$/, "");
  return `${baseUrl}/api/chat/messages/${messageId}/feedback`;
};
