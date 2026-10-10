import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Structured logging
  const timestamp = new Date().toISOString();
  console.error(`[Error] [${timestamp}] [${req.method} ${req.originalUrl}]:`, err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.name === 'MulterError') {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      success: false,
      error: status === 413 ? 'Uploaded file exceeds the 10 MB limit' : 'Invalid multipart file upload',
    });
  }

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'A record with this unique identifier already exists.',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'The requested resource was not found.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : (process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message);

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}
