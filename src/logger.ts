import winston from 'winston';
import { red } from 'colorette';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          const coloredLevel = level === 'error' ? red(`[${level.toUpperCase()}]`) : `[${level.toUpperCase()}]`;
          return `${coloredLevel} ${timestamp} - ${message}`;
        }),
      ),
      transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'server.log' })],
    });
  }

  public info(message: string) {
    this.logger.info(message);
  }

  public error(message: string) {
    this.logger.error(message);
  }
}

export default new Logger();
