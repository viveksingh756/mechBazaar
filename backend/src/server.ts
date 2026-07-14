import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { logger } from './utils/logger';
import { setupTrackingSocket } from './websocket/tracking.gateway';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const prisma = new PrismaClient();

async function startServer() {
  const retries = 5;
  const delay = 3000;
  
  for (let i = 1; i <= retries; i++) {
    try {
      logger.info(`Attempting database connection ${i} of ${retries}...`);
      await prisma.$connect();
      logger.info('Database connection established successfully.');
      break;
    } catch (error: any) {
      logger.error(`Database connection attempt ${i} failed: ${error.message}`);
      if (i === retries) {
        logger.error('All database connection attempts failed. Exiting.');
        process.exit(1);
      }
      logger.info(`Waiting ${delay}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  try {
    app.set('io', io);
    // Setup Websocket live tracking logic
    setupTrackingSocket(io);
    logger.info('Socket.io server tracking gateway initialized.');

    server.listen(PORT, () => {
      logger.info(`MechBazar REST & WS API server running on port ${PORT}`);
    });
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

startServer();
