import { app } from './app.js';
import { config } from './config/index.js';
import { checkDatabaseConnection } from './db/prisma.js';
import { initializeWorkerHandlers } from './worker.js';

async function bootstrap() {
  console.log('--- Starting Cloud Marketplace API & Services ---');

  const isDbConnected = await checkDatabaseConnection();
  if (isDbConnected) {
    console.log('[Database] Connected to PostgreSQL successfully.');
  } else {
    console.warn('[Database] Database connection check encountered an issue. Ensure migrations/seed have been run.');
  }

  // Initialize async worker handlers inside the same runtime for single-command simplicity
  initializeWorkerHandlers();

  app.listen(config.port, () => {
    console.log(`[Server] API Server listening on http://localhost:${config.port}`);
    console.log(`[Server] Health check available at http://localhost:${config.port}/api/v1/health`);
  });
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]:', err);
});
