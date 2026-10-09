import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './modules/auth/authRoutes.js';
import profileRoutes from './modules/profiles/profileRoutes.js';
import projectRoutes from './modules/projects/projectRoutes.js';
import applicationRoutes from './modules/applications/applicationRoutes.js';
import hiringRoutes from './modules/hiring/hiringRoutes.js';
import taskRoutes from './modules/tasks/taskRoutes.js';
import reviewRoutes from './modules/reviews/reviewRoutes.js';
import notificationRoutes from './modules/notifications/notificationRoutes.js';
import fileRoutes from './modules/files/fileRoutes.js';
import intelligentRoutes from './modules/intelligent/intelligentRoutes.js';
import adminRoutes from './modules/admin/adminRoutes.js';

export const app = express();

// Security and utility middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser(config.cookieSecret));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Cloud-Based Intelligent Freelancing Marketplace API',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: config.env,
  });
});

// Mount modular domain routers
const prefix = config.apiPrefix;
app.use(`${prefix}/auth`, authRoutes);
app.use(`${prefix}/profiles`, profileRoutes);
app.use(`${prefix}/projects`, projectRoutes);
app.use(`${prefix}/applications`, applicationRoutes);
app.use(`${prefix}/hiring`, hiringRoutes);
app.use(`${prefix}/tasks`, taskRoutes);
app.use(`${prefix}/reviews`, reviewRoutes);
app.use(`${prefix}/notifications`, notificationRoutes);
app.use(`${prefix}/files`, fileRoutes);
app.use(`${prefix}/intelligent`, intelligentRoutes);
app.use(`${prefix}/admin`, adminRoutes);

// Centralized error handling
app.use(errorHandler);
