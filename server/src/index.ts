import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { checkDatabaseHealth, initDatabase } from './db.js';
import { checkFirestoreHealth } from './firestore.js';
import { setupWebSocket } from './ws/socketHandler.js';
import { friendsRouter } from './routes/friends.js';
import { roomsRouter } from './routes/rooms.js';
import { profileRouter } from './routes/profile.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicWebDir = path.resolve(__dirname, '../public-web');

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
  const [dbHealth, firestoreHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkFirestoreHealth(),
  ]);
  const isHealthy = firestoreHealth.connected || dbHealth.connected;
  res.json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'holhuashi-server',
    version: '0.5.4',
    timestamp: new Date().toISOString(),
    firestore: firestoreHealth,
    database: dbHealth,
  });
});

// Mount Routes
app.use('/api/friends', friendsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/profile', profileRouter);

// Serve static web app and downloads if present
if (fs.existsSync(publicWebDir)) {
  app.use(express.static(publicWebDir));
  console.log(`[Thaasbai Game Server] Mounted static web client from: ${publicWebDir}`);
}

// Fallback SPA routing for client-side navigation (non-API routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(publicWebDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

setupWebSocket(wss);

server.listen(port, async () => {
  console.log(`[Thaasbai Game Server] Running on http://localhost:${port}`);
  console.log(`[Thaasbai Game Server] WebSocket mounted at ws://localhost:${port}`);
  await initDatabase();
});
