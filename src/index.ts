import { MongoDBClient } from './mongoDBClient';
import { Server } from './server';
import dotenv from 'dotenv';

dotenv.config();

const URL = process.env.MONGO_URL;
const PORT = process.env.PORT;

async function main() {
  const dbClient = new MongoDBClient(URL);
  await dbClient.connect();
  const server = new Server(PORT, dbClient);
  server.start();
}

main();


// проверить чтобы логирование не сильно низким было
// не логируется 409 ошибка в создании пользователя