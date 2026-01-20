
export type Attachment = {
  id: string;
  url: string;
  type: string;
  externalId: string;
  createdAt: number;
  name: string;
};

export type Message = {
  id: string;
  createdAt: number;
  updatedAt: number;
  urn: string;
  senderUrn: string;
  text: string;
  sentAt: number;
  isSystemMessage: boolean;
  attachments?: Attachment[];
};

export type User = {
  id: number;
  userId: string;
  firstName: string;
  lastName: string;
  publicIdentifier: string;
};

export type Person = {
  urn: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
};

export type LastMessage = {
  text: string;
  sentAt: string;
  senderUrn: string;
};

export type Conversation = {
  conversationId: string;
  sender: Person;
  attendee: Person;
  lastMessage: LastMessage;
};

export type ConversationDetail = {
  createdAtEpoch: number;
  id: string;
  createdAt: number;
  updatedAt: number;
  status: string;
  urn: string;
  lastActivityAt: number;
  accountURNs: string[];
  messages: Message[];
};
