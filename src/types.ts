export type User = RawUser & {
  _id: string;
  createdAt: Date;
  chats?: ChatInUser[];
};

export type RawUser = {
  userName: string;
};

export type ChatInUser = Omit<Chat, 'messages'>;

export type Chat = RawChat & {
  _id: string;
  createdAt: Date;
  messages?: Message[];
  updatedAt?: Date;
};

export type RawChat = {
  chatName: string;
  chatUsers: string[];
};

export type Message = {
  messageId: string;
  chatId: string;
  authorId: string;
  text: string;
  createdAt: Date;
};

export type RawMessage = {
  chatId: string;
  authorId: string;
  text: string;
};

export type dbType = 'MongoDB';

export enum constDbType {
  MongoDB = 'MongoDB',
}
export enum CollectionName {
  Users = 'Users',
  Chats = 'Chats',
}

export enum EntityType {
  User = 'user',
  Chat = 'chat',
  Message = 'message',
}
export enum ServerError {
  ROUTE_NOT_FOUND = 'Route not found',
  INTERNAL_SERVER_ERROR = 'Internal Server Error',
  INVALID_JSON_FORMAT = 'Invalid JSON format',
  INVALID_CONTENT_TYPE = 'Invalid Content-Type',
}

export interface IDataBase {
  generateId(collectionName: string, type: EntityType): Promise<string>;
  connect(): Promise<void>;
  close(): Promise<void>;
  insertOneDocument(document: any, collectionName: string): Promise<any>;
  findOneDocument(collectionName: string, query: any): Promise<any | null>;
  findDocumentsExistence(collectionName: string, documentsId: string[]): Promise<boolean[]>;
  addChatToUsers(collectionName: string, fieldValue: Chat): void;
  addMessageToChat(collectionName: string, message: Message): void;
  updateOneDocument(collectionName: string, filter: { [key: string]: any }, query: { [key: string]: any }): Promise<any | null>;
  getSortedChatsForUser(userId: string): Promise<Chat[]>;
  checkUsersExistence(userIds: string[]): Promise<boolean[]>;
  getMessagesForChat(chatId: string): Promise<Message[]>;
}
