import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { checkDatabaseHealth } from './db.js';
import { setupWebSocket } from './ws/socketHandler.js';
import { friendsRouter } from './routes/friends.js';
import { roomsRouter } from './routes/rooms.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Enable CORS for web and mobile webviews
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Healthcheck endpoint for container orchestration & load balancers
app.get('/api/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth.connected ? 'ok' : 'degraded',
    service: 'thaasbai-server',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// Mount Routes
app.use('/api/friends', friendsRouter);
app.use('/api/rooms', roomsRouter);

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setupWebSocket(wss);

server.listen(port, () => {
  console.log(`[Thaasbai Game Server] Running on http://localhost:${port}`);
  console.log(`[Thaasbai Game Server] WebSocket mounted at ws://localhost:${port}`);
});
