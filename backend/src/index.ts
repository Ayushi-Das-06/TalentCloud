import { app } from './app.js';
import { config } from './config/index.js';
import { checkDatabaseConnection, prisma } from './db/prisma.js';
import { initializeWorkerHandlers } from './worker.js';
import { queueService } from './queue/queueAdapter.js';

async function bootstrap() {
  console.log('--- Starting Cloud Marketplace API & Services ---');

  const isDbConnected = await checkDatabaseConnection();
  if (isDbConnected) {
    console.log(`[Database] Connected to ${config.databaseProvider} successfully.`);
  } else {
    console.warn('[Database] Database connection check encountered an issue. Ensure migrations/seed have been run.');
  }

  // The in-memory adapter needs an in-process consumer. BullMQ consumption belongs to worker.ts.
  if (config.queue.driver === 'memory') initializeWorkerHandlers();

  const server = app.listen(config.port, () => {
    console.log(`[Server] API Server listening on http://localhost:${config.port}`);
    console.log(`[Server] Health check available at http://localhost:${config.port}/api/v1/health`);
  });
  const stop = (signal: string) => {
    console.log(`[Server] Received ${signal}; closing HTTP and queue workers...`);
    server.close(async () => {
      await queueService.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]:', err);
});
