import { Conversation } from "@/types/inbox";

/**
 * Generates a unique conversation key using conversationId
 * The conversationId should be unique per conversation regardless of sender context
 */
export const getConversationKey = (conversation: Conversation): string => {
  return conversation.conversationId;
};

/**
 * Checks if two conversations are the same using the conversation key
 */
export const isSameConversation = (conversation1: Conversation | null, conversation2: Conversation | null): boolean => {
  if (!conversation1 || !conversation2) return false;
  return getConversationKey(conversation1) === getConversationKey(conversation2);
};

/**
 * Finds a conversation in a list by its key
 */
export const findConversationByKey = (conversations: Conversation[], targetConversation: Conversation): Conversation | undefined => {
  const targetKey = getConversationKey(targetConversation);
  return conversations.find(conversation => getConversationKey(conversation) === targetKey);
};
