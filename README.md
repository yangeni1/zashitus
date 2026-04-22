# Zashitus

Проект разделен на два workspace-пакета:

- `client` - React/Vite интерфейс.
- `server` - Node.js сервер для будущих API-запросов к внешним сервисам.

## Установка

```bash
npm install
```

## Запуск клиента

```bash
npm run dev:client
```

Обычно клиент откроется на `http://localhost:5173`.

## Запуск сервера

```bash
npm run dev:server
```

Сервер слушает `http://localhost:3000`. Проверка:

```bash
curl http://localhost:3000/api/health
```

## Проверки

```bash
npm run build:client
npm run lint:client
npm run check:server
```

