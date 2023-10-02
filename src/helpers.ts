import logger from './logger';
import { Chat, CollectionName, EntityType, IDataBase, Message, RawChat, RawMessage, RawUser, User } from './types';
import HttpStatusCodes from 'http-status-codes';

export function validateCreateChatData(chatData: any): { isValid: boolean; errorMessage: string; rawChat?: RawChat } {
  if (
    !chatData ||
    typeof chatData.chatName !== 'string' ||
    !Array.isArray(chatData.users) ||
    !chatData.users.every((user) => typeof user === 'string')
  ) {
    return { isValid: false, errorMessage: 'Invalid chat data format' };
  }

  const rawChat: RawChat = {
    chatName: chatData.chatName,
    chatUsers: chatData.users,
  };

  return { isValid: true, errorMessage: '', rawChat };
}

export function validateGetChatsData(chatData: any): { isValid: boolean; errorMessage: string; userId?: string } {
  if (!chatData || typeof chatData.userId !== 'string') {
    return { isValid: false, errorMessage: 'Invalid data format for user ID' };
  }

  const userId: string = chatData.userId;

  return { isValid: true, errorMessage: '', userId };
}

export function validateGetMessageData(messageData: any): { isValid: boolean; errorMessage: string; chatId?: string } {
  if (!messageData || typeof messageData.chatId !== 'string') {
    return { isValid: false, errorMessage: 'Invalid data format for chat ID' };
  }

  const chatId: string = messageData.chatId;

  return { isValid: true, errorMessage: '', chatId };
}

export function validateCreateUserData(userData: any): { isValid: boolean; errorMessage: string; rawUser?: RawUser } {
  if (!userData || typeof userData.userName !== 'string') {
    return { isValid: false, errorMessage: 'Invalid user data format' };
  }

  const rawUser: RawUser = {
    userName: userData.userName,
  };

  return { isValid: true, errorMessage: '', rawUser };
}

export function validateCreateMessageData(messageData: any): { isValid: boolean; errorMessage: string; rawMessage?: RawMessage } {
  if (
    !messageData ||
    typeof messageData.chatId !== 'string' ||
    typeof messageData.authorId !== 'string' ||
    typeof messageData.text !== 'string'
  ) {
    return { isValid: false, errorMessage: 'Invalid message data format' };
  }

  const rawMessage: RawMessage = {
    chatId: messageData.chatId,
    authorId: messageData.authorId,
    text: messageData.text,
  };

  return { isValid: true, errorMessage: '', rawMessage };
}

export async function registerUser(dbClient: IDataBase, userData: RawUser): Promise<{ status: number; message: string; userId?: string }> {
  try {
    const existingUser = await dbClient.findOneDocument(CollectionName.Users, { userName: userData.userName });

    if (existingUser) {
      return {
        status: HttpStatusCodes.CONFLICT,
        message: 'User with this username already exists',
      };
    }

    const user: User = await createUserObject(dbClient, userData);

    await dbClient.insertOneDocument(user, CollectionName.Users);

    return {
      status: HttpStatusCodes.CREATED,
      message: 'User created successfully',
      userId: user._id,
    };
  } catch (error) {
    this.logError('Error registering user: ' + error.message);
    throw new Error('Failed to register user');
  }
}

async function createUserObject(dbClient: IDataBase, userData: RawUser): Promise<User> {
  const user: User = {
    _id: await dbClient.generateId(CollectionName.Users, EntityType.User),
    userName: userData.userName,
    createdAt: new Date(),
  };

  return user;
}

export async function createNewChat(dbClient: IDataBase, chatData: RawChat): Promise<{ status: number; message: string; chatId?: string }> {
  try {
    const usersExistence = await dbClient.checkUsersExistence(chatData.chatUsers);

    const invalidUserIndex = usersExistence.findIndex((userExists) => !userExists);

    if (invalidUserIndex !== -1) {
      return {
        status: HttpStatusCodes.NOT_FOUND,
        message: `User with ID - ${chatData.chatUsers[invalidUserIndex]} not found`,
      };
    }

    const chat: Chat = await createChatObject(dbClient, chatData);

    await dbClient.insertOneDocument(chat, CollectionName.Chats);
    await dbClient.addChatToUsers(CollectionName.Users, chat);

    return {
      status: HttpStatusCodes.CREATED,
      message: 'Chat created successfully',
      chatId: chat._id,
    };
  } catch (error) {
    this.logError('Error creating chat: ' + error.message);
    throw new Error('Failed to create chat');
  }
}

export async function getChats(dbClient: IDataBase, userId: string): Promise<{ status: number; message: string; chats?: Chat[] }> {
  try {
    const user: string[] = [userId];
    const usersExistence = await dbClient.checkUsersExistence(user);

    const invalidUserIndex = usersExistence.findIndex((userExists) => !userExists);

    if (invalidUserIndex !== -1) {
      return {
        status: HttpStatusCodes.NOT_FOUND,
        message: `User with ID - ${user[invalidUserIndex]} not found`,
      };
    }

    const result = await dbClient.getSortedChatsForUser(userId);

    return {
      status: HttpStatusCodes.OK,
      message: 'Chats successfully retrieved',
      chats: result,
    };
  } catch (error) {
    this.logError('Error creating chat: ' + error.message);
    throw new Error('Failed to create chat');
  }
}

export async function getMessages(dbClient: IDataBase, chatId: string): Promise<{ status: number; message: string; messages?: Message[] }> {
  try {
    const chat: string[] = [chatId];
    const usersExistence = await dbClient.findDocumentsExistence(CollectionName.Chats, chat);

    const invalidChatIndex = usersExistence.findIndex((userExists) => !userExists);

    if (invalidChatIndex !== -1) {
      return {
        status: HttpStatusCodes.NOT_FOUND,
        message: `Chat with ID - ${chat[invalidChatIndex]} not found`,
      };
    }

    const result = await dbClient.getMessagesForChat(chatId);

    return {
      status: HttpStatusCodes.OK,
      message: 'Messages successfully retrieved',
      messages: result,
    };
  } catch (error) {
    this.logError('Error creating chat: ' + error.message);
    throw new Error('Failed to create chat');
  }
}

async function createChatObject(dbClient: IDataBase, chatData: RawChat): Promise<Chat> {
  const chat: Chat = {
    _id: await dbClient.generateId(CollectionName.Chats, EntityType.Chat),
    chatName: chatData.chatName,
    chatUsers: chatData.chatUsers,
    createdAt: new Date(),
  };

  return chat;
}

export async function createNewMessage(
  dbClient: IDataBase,
  messagesData: RawMessage,
): Promise<{ status: number; message: string; messageId?: string }> {
  try {
    const chatDoc = await dbClient.findOneDocument(CollectionName.Chats, { _id: messagesData.chatId });

    if (!chatDoc) {
      return {
        status: HttpStatusCodes.NOT_FOUND,
        message: `Chat with ID - ${messagesData.chatId} not found`,
      };
    }

    const foundAuthor = chatDoc.chatUsers.indexOf(messagesData.authorId);
    if (foundAuthor === -1) {
      return {
        status: HttpStatusCodes.NOT_FOUND,
        message: `Author with ID - ${messagesData.authorId} in chat with ID - ${messagesData.chatId} not found`,
      };
    }

    const message: Message = await createMessageObject(dbClient, messagesData);

    await dbClient.addMessageToChat(CollectionName.Chats, message);
    await dbClient.updateOneDocument(CollectionName.Chats, { _id: message.chatId }, { $set: { updatedAt: message.createdAt } });

    return {
      status: HttpStatusCodes.CREATED,
      message: 'Message created successfully',
      messageId: message.messageId,
    };
  } catch (error) {
    this.logError('Error creating message: ' + error.message);
    throw new Error('Failed to create message');
  }
}

async function createMessageObject(dbClient: IDataBase, messagesData: RawMessage): Promise<Message> {
  const message: Message = {
    messageId: await dbClient.generateId(CollectionName.Chats, EntityType.Message),
    chatId: messagesData.chatId,
    authorId: messagesData.authorId,
    text: messagesData.text,
    createdAt: new Date(),
  };

  return message;
}

export function logInfo(address: string, message: string): void {
  logger.info(`[${address}] ${message}`);
}

export function logError(address: string, message: string): void {
  logger.error(`[${address}] ${message}`);
}
