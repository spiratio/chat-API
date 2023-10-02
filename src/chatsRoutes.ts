import express, { Request, Response } from 'express';
import { IDataBase, ServerError } from './types';
import { createNewChat, getChats, logError, validateCreateChatData, validateGetChatsData } from './helpers';
import HttpStatusCodes from 'http-status-codes';

export function createChatsRouter(dbClient: IDataBase) {
  const chatsRouters = express.Router();

  chatsRouters.post('/add', async (req: Request, res: Response) => {
    try {
      const request = req.body;
      const validatedData = validateCreateChatData(request);

      if (!validatedData.isValid) {
        return res.status(HttpStatusCodes.UNPROCESSABLE_ENTITY).json({
          message: `${validatedData.errorMessage}`,
        });
      }
      const result = await createNewChat(dbClient, validatedData.rawChat);
      return res.status(result.status).json({
        message: result.message,
        chatId: result.chatId,
      });
    } catch (error) {
      const errorMessage = 'Error occurred while processing /chats/add';
      logError('chatsRouters', errorMessage);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(`${ServerError.INTERNAL_SERVER_ERROR}`);
    }
  });

  chatsRouters.post('/get', async (req: Request, res: Response) => {
    try {
      const request = req.body;

      const validatedData = validateGetChatsData(request);

      if (!validatedData.isValid) {
        return res.status(HttpStatusCodes.UNPROCESSABLE_ENTITY).json({
          message: `${validatedData.errorMessage}`,
        });
      }

      const result = await getChats(dbClient, validatedData.userId);

      return res.status(result.status).json({
        message: result.message,
        chats: result.chats,
      });
    } catch (error) {
      const errorMessage = 'Error occurred while processing /chats/get';
      logError('chatsRouters', errorMessage);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(`${ServerError.INTERNAL_SERVER_ERROR}`);
    }
  });

  return chatsRouters;
}
