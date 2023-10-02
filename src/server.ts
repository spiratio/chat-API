import express, { Express, NextFunction, Request, Response } from 'express';
import { Logger } from './logger';
import { createUsersRouter } from './usersRoutes';
import { IDataBase, ServerError } from './types';
import { createChatsRouter } from './chatsRoutes';
import { createMessagesRouter } from './messagesRoutes';
import HttpStatusCodes from 'http-status-codes';

export class Server {
  private app: Express;
  private port: number;
  private logger: Logger;
  private dbClient: IDataBase;

  constructor(port: string, dbClient: IDataBase) {
    this.app = express();
    this.port = parseInt(port || '9000');
    this.logger = new Logger();
    this.dbClient = dbClient;

    this.setupJsonMiddleware();
    this.setupRoutes();
    this.setupErrorHandlingMiddleware();
  }

  private async setupRoutes() {
    const usersRouters = createUsersRouter(this.dbClient);
    const chatsRouters = createChatsRouter(this.dbClient);
    const messagesRoutes = createMessagesRouter(this.dbClient);
    this.app.use('/users', usersRouters);
    this.app.use('/chats', chatsRouters);
    this.app.use('/messages', messagesRoutes);

    this.app.use((req: Request, res: Response) => {
      this.logError(`${ServerError.ROUTE_NOT_FOUND}`);
      res.status(HttpStatusCodes.UNPROCESSABLE_ENTITY).send(`${ServerError.ROUTE_NOT_FOUND}`);
    });
  }

  private setupErrorHandlingMiddleware() {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error(`${ServerError.INTERNAL_SERVER_ERROR}: ${err.message}`);
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ error: `${ServerError.INTERNAL_SERVER_ERROR}` });
    });
  }

  private setupJsonMiddleware() {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.headers['content-type'] === 'application/json') {
        let body = '';

        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            req.body = JSON.parse(body);
            next();
          } catch (error) {
            this.logError(`${ServerError.INVALID_JSON_FORMAT}`);
            res.status(HttpStatusCodes.BAD_REQUEST).json({ error: `${ServerError.INVALID_JSON_FORMAT}` });
          }
        });
      } else {
        this.logError(`${ServerError.INVALID_CONTENT_TYPE}`);
        res.status(HttpStatusCodes.BAD_REQUEST).json({ error: `${ServerError.INVALID_CONTENT_TYPE}` });
      }
    });
  }

  public start() {
    const server = this.app.listen(this.port, () => {
      this.logInfo(`Server is running on port ${this.port}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        this.logError(`Port ${this.port} is already in use. Server failed to start.`);
      } else {
        this.logError(`Server encountered an error: ${error.message}`);
      }
    });
  }

  private logInfo(message: string): void {
    this.logger.info(`[Server] ${message}`);
  }

  private logError(message: string): void {
    this.logger.error(`[Server] ${message}`);
  }
}
