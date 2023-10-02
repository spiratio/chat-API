import express, { Request, Response } from 'express';
import { IDataBase, ServerError } from './types';
import { createNewMessage, getMessages, logError, validateCreateMessageData, validateGetMessageData } from './helpers';
import HttpStatusCodes from 'http-status-codes';

export function createMessagesRouter(dbClient: IDataBase) {
  const messagesRoutes = express.Router();

  messagesRoutes.post('/add', async (req: Request, res: Response) => {
    try {
      const request = req.body;

      const validatedData = validateCreateMessageData(request);

      if (!validatedData.isValid) {
        return res.status(HttpStatusCodes.UNPROCESSABLE_ENTITY).json({
          message: `${validatedData.errorMessage}`,
        });
      }
      const result = await createNewMessage(dbClient, validatedData.rawMessage);
      return res.status(result.status).json({
        message: result.message,
        messageId: result.messageId,
      });
    } catch (error) {
      logError('messagesRoutes', 'Error occurred while processing /message/add' + error);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(`${ServerError.INTERNAL_SERVER_ERROR}`);
    }
  });

  messagesRoutes.post('/get', async (req: Request, res: Response) => {
    try {
      const request = req.body;

      const validatedData = validateGetMessageData(request);

      if (!validatedData.isValid) {
        return res.status(HttpStatusCodes.UNPROCESSABLE_ENTITY).json({
          message: `${validatedData.errorMessage}`,
        });
      }

      const result = await getMessages(dbClient, validatedData.chatId);

      return res.status(result.status).json({
        message: result.message,
        messages: result.messages,
      });
    } catch (error) {
      logError('messagesRoutes', 'Error occurred while processing /message/add' + error);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(`${ServerError.INTERNAL_SERVER_ERROR}`);
    }
  });

  return messagesRoutes;
}
