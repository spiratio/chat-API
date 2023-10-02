import { MongoClient, Db, InsertOneResult, Collection, ObjectId } from 'mongodb';
import { Logger } from './logger';
import { Chat, ChatInUser, EntityType, IDataBase, User, Message, CollectionName } from './types';

export class MongoDBClient implements IDataBase {
  private readonly uri: string;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private logger: Logger;

  constructor(uri: string) {
    this.uri = uri;
    this.logger = new Logger();
  }

  private async generateObjectId(): Promise<string> {
    return new Promise((resolve, reject) => {
      resolve(new ObjectId().toHexString());
    });
  }

  public async generateId(collectionName: string, type: EntityType): Promise<string> {
    try {
      let id = await this.generateObjectId();
      let idFromDb: any;

      switch (type) {
        case EntityType.User:
        case EntityType.Chat:
          idFromDb = await this.findOneDocument(collectionName, { _id: id });
          while (idFromDb !== null) {
            id = await this.generateObjectId();
            idFromDb = await this.findOneDocument(collectionName, { _id: id });
          }
          return id;
        case EntityType.Message:
          const filter = {
            messages: {
              $elemMatch: {
                messageId: id,
              },
            },
          };

          idFromDb = await this.findOneDocument(collectionName, filter);
          while (idFromDb !== null) {
            id = await this.generateObjectId();
            idFromDb = await this.findOneDocument(collectionName, filter);
          }
          return id;
      }
    } catch (error) {
      this.logError(`Error generating ID: ${error.message}`);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    try {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.logInfo('Connected to MongoDB');
      this.db = this.client.db();
    } catch (error) {
      this.logError('Failed to connect to MongoDB: ' + error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.logInfo('Connection to MongoDB closed');
      } else {
        this.logInfo('No active MongoDB connection to close.');
      }
    } catch (error) {
      this.logError('Error disconnecting from MongoDB: ' + error);
      throw error;
    }
  }

  public async insertOneDocument(document: any, collectionName: string): Promise<InsertOneResult<any>> {
    try {
      const result = await this.db.collection(collectionName).insertOne(document);
      this.logInfo(`Document inserted successfully into collection ${collectionName}`);
      return result;
    } catch (error) {
      this.logError(`Error inserting document into collection ${collectionName}: ${error}`);
      throw new Error(`Failed to insert document into collection ${collectionName}: ${error}`);
    }
  }

  public async getMessagesForChat(chatId: string): Promise<Message[]> {
    try {
      const chatsCollection = this.db.collection<Chat>(CollectionName.Chats);
      const chat = await chatsCollection.findOne({ _id: chatId });

      if (chat) {
        const sortedMessages = chat.messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        this.logInfo(`Fetched ${sortedMessages.length} messages for chat with ID ${chatId}`);
        return sortedMessages;
      } else {
        this.logInfo(`Chat with ID ${chatId} not found.`);
        return [];
      }
    } catch (error) {
      this.logError('Error fetching messages for chat:' + error);
      throw error;
    }
  }

  public async getSortedChatsForUser(userId: string): Promise<Chat[]> {
    try {
      const usersCollection = this.db.collection<User>(CollectionName.Users);
      const chatsCollection = this.db.collection<Chat>(CollectionName.Chats);
      const user = await this.findUserById(usersCollection, userId);

      if (user) {
        const chatIds = this.extractChatIdsFromUser(user);
        const chats = await this.aggregateAndSortChats(chatsCollection, chatIds);

        const formattedChats = this.formatChats(chats);
        return formattedChats;
      } else {
        return [];
      }
    } catch (error) {
      this.logError(`Error fetching sorted chats for user with ID ${userId}: ${error}`);
      throw new Error('Failed to fetch sorted chats for user');
    }
  }

  private async findUserById(usersCollection: Collection<User>, userId: string): Promise<User | null> {
    try {
      const user = await usersCollection.findOne<User>({ _id: userId });
      return user || null;
    } catch (error) {
      this.logError(`Error finding user by ID ${userId}: ${error}`);
      throw new Error('Failed to find user by ID');
    }
  }

  private extractChatIdsFromUser(user: User): string[] {
    this.logInfo(`Extracting chat IDs from user: ${JSON.stringify(user)}`);
    const chatIds = user.chats.map((chat) => chat._id);
    this.logInfo(`Extracted chat IDs: ${JSON.stringify(chatIds)}`);
    return chatIds;
  }

  private async aggregateAndSortChats(chatsCollection: Collection<Chat>, chatIds: string[]): Promise<any[]> {
    const aggregationPipeline = [
      {
        $match: {
          _id: { $in: chatIds },
        },
      },
      {
        $unwind: '$messages',
      },
      {
        $group: {
          _id: '$_id',
          chatName: { $first: '$chatName' },
          chatUsers: { $first: '$chatUsers' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
    ];

    try {
      this.logInfo('Starting chat aggregation and sorting...');
      const result = await chatsCollection.aggregate(aggregationPipeline).toArray();
      this.logInfo('Chat aggregation and sorting completed successfully.');
      return result;
    } catch (error) {
      this.logError('Error occurred during chat aggregation and sorting: ' + error);
      throw error;
    }
  }

  private formatChats(chats: any[]): Chat[] {
    this.logInfo(`Formatting chats: ${JSON.stringify(chats)}`);

    const formattedChats: Chat[] = chats.map((doc) => {
      return {
        _id: doc._id.toString(),
        chatName: doc.chatName,
        chatUsers: doc.chatUsers,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    this.logInfo(`Formatted chats: ${JSON.stringify(formattedChats)}`);

    return formattedChats;
  }

  public async getSortedChatsForUser2(userId: string): Promise<Chat[]> {
    this.logInfo(`Fetching sorted chats for user ${userId}`);

    const usersCollection = this.db.collection<User>(CollectionName.Users);
    const chatsCollection = this.db.collection<Chat>(CollectionName.Chats);

    try {
      const user = await usersCollection.findOne({ _id: userId });

      if (user && user.chats && user.chats.length > 0) {
        const chatIds = user.chats.map((chat) => chat._id);

        const chats = await chatsCollection
          .aggregate([
            {
              $match: {
                _id: { $in: chatIds },
              },
            },
            {
              $unwind: '$messages',
            },
            {
              $sort: {
                'messages.createdAt': -1,
              },
            },
            {
              $group: {
                _id: '$_id',
                chatName: { $first: '$chatName' },
                chatUsers: { $first: '$chatUsers' },
                createdAt: { $first: '$createdAt' },
                messages: { $push: '$messages' },
              },
            },
          ])
          .toArray();

        const formattedChats: Chat[] = chats.map((doc) => {
          return {
            _id: doc._id.toString(),
            chatName: doc.chatName,
            chatUsers: doc.chatUsers,
            createdAt: doc.createdAt,
          };
        });

        this.logInfo(`Fetched and formatted chats: ${JSON.stringify(formattedChats)}`);

        return formattedChats;
      } else {
        this.logInfo('User not found or has no chats');
        return [];
      }
    } catch (error) {
      this.logError(`Error fetching sorted chats: ${error}`);
      throw error;
    }
  }

  private async findUsersByIds(userIds: string[]): Promise<User[]> {
    this.logInfo(`Finding users by IDs: ${userIds.join(', ')}`);

    try {
      const usersCollection = this.db.collection<User>(CollectionName.Users);
      const users: User[] = await usersCollection.find({ _id: { $in: userIds } }).toArray();

      this.logInfo(`Found users: ${users.map((user) => user._id).join(', ')}`);

      return users;
    } catch (error) {
      this.logError(`Error finding users by IDs: ${error}`);
      throw error;
    }
  }

  public async checkUsersExistence(userIds: string[]): Promise<boolean[]> {
    this.logInfo(`Checking existence for users: ${userIds.join(', ')}`);

    try {
      const users: User[] = await this.findUsersByIds(userIds);

      const usersExistence: boolean[] = userIds.map((userId) => users.some((user) => user._id === userId));

      this.logInfo(`Users existence: ${usersExistence.join(', ')}`);

      return usersExistence;
    } catch (error) {
      this.logError(`Error checking user existence: ${error}`);
      throw error;
    }
  }

  public async findOneDocument(collectionName: string, query: { [key: string]: any }): Promise<any | null> {
    this.logInfo(`Finding document in collection ${collectionName} with query: ${JSON.stringify(query)}`);

    try {
      const collection = await this.getCollectionByName(collectionName);

      const document = await collection.findOne(query);

      if (document) {
        this.logInfo(`Document found: ${JSON.stringify(document)}`);
      } else {
        this.logInfo(`Document not found with query: ${JSON.stringify(query)}`);
      }

      return document;
    } catch (error) {
      this.logError(`Error finding document: ${error}`);
      throw new Error(`Error finding document: ${error}`);
    }
  }

  public async updateOneDocument(collectionName: string, filter: { [key: string]: any }, update: { [key: string]: any }): Promise<boolean> {
    this.logInfo(
      `Updating document in collection ${collectionName} with filter: ${JSON.stringify(filter)} and update: ${JSON.stringify(update)}`,
    );

    try {
      const collection = await this.getCollectionByName(collectionName);

      const result = await collection.updateOne(filter, update, { upsert: true });

      if (result.modifiedCount > 0 || result.upsertedCount > 0) {
        this.logInfo(`Document updated successfully`);
        return true;
      } else {
        this.logInfo(`No document found matching the filter, a new document inserted`);
        return true;
      }
    } catch (error) {
      this.logError(`Error updating document: ${error}`);
      throw new Error(`Error updating document: ${error}`);
    }
  }

  public async findDocumentsExistence(collectionName: string, documentsId: string[]): Promise<boolean[]> {
    try {
      const collection = await this.getCollectionByName(collectionName);

      const query = { _id: { $in: documentsId } };
      const documents = await collection.find(query).toArray();

      const existenceArray: boolean[] = documentsId.map((documentId) => documents.some((document) => document._id === documentId));

      return existenceArray;
    } catch (error) {
      this.logError(`Error finding documents: ${error}`);
      throw new Error(`Error finding documents: ${error}`);
    }
  }

  public async addChatToUsers(collectionName: string, fieldValue: ChatInUser) {
    try {
      if (!fieldValue || !fieldValue.chatUsers || !fieldValue.chatName) {
        throw new Error('Invalid chat data');
      }

      const collection: Collection<User> = this.db.collection<User>(collectionName);

      const filter = { _id: { $in: fieldValue.chatUsers } };
      const updateOperation = {
        $push: { chats: fieldValue },
      };

      const result = await collection.updateMany(filter, updateOperation);

      if (result.modifiedCount > 0) {
        this.logInfo("Chat successfully added to users' array of chats.");
      } else {
        this.logError('Error occurred while adding chat to users.');
        throw new Error('Failed to add chat to users');
      }
    } catch (error) {
      this.logError(`Error adding chat to collection "${collectionName}": ${error}`);
      throw new Error(`Error adding chat to collection "${collectionName}": ${error}`);
    }
  }

  public async addMessageToChat(collectionName: string, message: Message) {
    try {
      if (!message || !message.chatId || !message.authorId || !message.text) {
        throw new Error('Invalid message data');
      }

      const collection: Collection<Chat> = this.db.collection<Chat>(collectionName);
      const filter = { _id: message.chatId };
      const updateOperation = {
        $push: { messages: message },
      };

      const result = await collection.updateOne(filter, updateOperation);

      if (result.modifiedCount > 0) {
        this.logInfo('Message successfully added to chat.');
      } else {
        this.logError('Error occurred while adding message to chat.');
        throw new Error('Failed to add message to chat');
      }
    } catch (error) {
      this.logError(`Error adding message to collection "${collectionName}": ${error}`);
      throw new Error(`Error adding message to collection "${collectionName}": ${error}`);
    }
  }

  private getCollectionByName(collectionName: string): Collection<any> {
    const collection = this.db.collection(collectionName);
    this.logInfo(`Collection "${collectionName}" obtained`);
    return collection;
  }

  private logInfo(message: string): void {
    this.logger.info(`[MongoDB] ${message}`);
  }

  private logError(message: string): void {
    this.logger.error(`[MongoDB] ${message}`);
  }
}
