import express, { Request, Response } from 'express';
import { IDataBase, ServerError } from './types';
import { logError, registerUser, validateCreateUserData } from './helpers';
import HttpStatusCodes from 'http-status-codes';

export function createUsersRouter(dbClient: IDataBase) {
  const usersRouters = express.Router();

  usersRouters.post('/add', async (req: Request, res: Response) => {
    try {
      const request = req.body;
      const validatedData = validateCreateUserData(request);

      if (!validatedData.isValid) {
        return res.status(HttpStatusCodes.UNPROCESSABLE_ENTITY).json({
          message: `${validatedData.errorMessage}`,
        });
      }
      const result = await registerUser(dbClient, validatedData.rawUser);

      return res.status(result.status).json({
        message: result.message,
        userId: result.userId,
      });
    } catch (error) {
      logError('userRouters', 'Error occurred while processing /users/add' + error);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).send(`${ServerError.INTERNAL_SERVER_ERROR}`);
    }
  });

  return usersRouters;
}
