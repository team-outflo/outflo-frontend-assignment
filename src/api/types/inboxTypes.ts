import { GenericApiResponse } from "../../common/api";
import { Conversation, ConversationDetail } from "../../types/inbox";

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalConversations: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type GetConversationsResponse = GenericApiResponse<{
  conversations: Conversation[];
  pagination: PaginationInfo;
}>;

export type GetMessagesResponse = GenericApiResponse<ConversationDetail>;
