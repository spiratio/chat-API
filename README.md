# API Чат-Сервера
Этот проект реализует чат-сервер, предоставляющий HTTP API для управления пользователями, чатами и сообщениями.

## Установка
1. Склонируйте репозиторий:
```
git clone <repository_url>
```
2. Перейдите в директорию проекта:
```
cd <название-папки-с-сервисом>
```
3. Установите зависимости:
```
npm install
```
4. Выполните сборку:

```
npm run build
```

## Конфигурация

1. Создайте файл .env в корневой директории проекта и укажите параметры подключения к MongoDB:
```
MONGODB_URL=<MONGODB_URL>
```
Замените <MONGODB_URL> на URL вашей базы данных MongoDB.

2. Установите номер порта в .env, по умолчанию используется 9000
```
PORT=<PORT>
```
После установки переменной окружения, сервер будет слушать указанный вами порт.

## Запуск сервера

Запустите сервер:
```
npm start
```
Сервер будет доступен по адресу http://localhost:<PORT> или используемый по умолчанию 9000

## API-Методы

### Добавление нового пользователя
```
POST /users/add
```
``Запрос:``
```
{ 
   "userName": "userName"
}
```
``Ответ:``
```
{
	"message": "User created successfully",
	"userId": "651aa91ca571c871e2b59697"
}
```

### Создание нового чата
```
POST /chats/add
```
Создает новый чат между пользователями
``Запрос:``
```
{
	"chatName": "chatName",
	"users": [
	"651aa91ca571c871e2b59697","6519e288543b4c86103e93d0"
	]
}
```
``Ответ:``
```
{
	"message": "Chat created successfully",
	"chatId": "651aad1ae93fb0371b6f24a8"
}
```
### Отправка сообщения в чат от пользователя
```
POST /messages/add
```
Отправляет сообщение в чат от имени пользователя
``Запрос:``
```
{
	"chatId": "651aad1ae93fb0371b6f24a8",
	"authorId": "651aa91ca571c871e2b59697",
	"text": "text"
}
```
``Ответ:``
{
	"message": "Message created successfully",
	"messageId": "651aa79e733ebfcf65f3f2fc"
}
### Получение чатов пользователя
```
POST /chats/get
```
Получает список всех чатов для конкретного пользователя
``Запрос:``
```
{ 
	"userId": "651aa91ca571c871e2b59697"
}
```
``Ответ:``
```
{
	"message": "Chats successfully retrieved",
	"chats": [
		{
			"_id": "651aad1ae93fb0371b6f24a8",
			"chatName": "chatName",
			"chatUsers": [
				"651aa91ca571c871e2b59697",
                "6519e288543b4c86103e93d0"
			],
			"createdAt": "2023-10-01T21:04:49.676Z",
			"updatedAt": "2023-10-01T21:07:14.858Z"
		}
	]
}
```
### Получение сообщений в чате
```
POST /messages/get
```
Получает список всех сообщений в конкретном чате
``Запрос:``
```
{
	"chatId": "651aad1ae93fb0371b6f24a8"
}
```
``Ответ:``
```
{
	"message": "Messages successfully retrieved",
	"messages": [
		{
			"messageId": "651aa79e733ebfcf65f3f2fc",
			"chatId": "651aad1ae93fb0371b6f24a8",
			"authorId": "651aa91ca571c871e2b59697",
			"text": "text",
			"createdAt": "2023-10-01T21:07:14.858Z"
		}
	]
}
```