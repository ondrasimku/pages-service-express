import 'reflect-metadata';
import express from 'express';
import container from './config/container';
import { TYPES } from './types/di.types';
import { ILogger } from './logging/logger.interface';
import { asyncContextMiddleware } from './middlewares/asyncContext';
import { createErrorHandler } from './middlewares/errorHandler';
import healthRoutes from './routes/healthRoutes';
import pageRoutes from './routes/pageRoutes';
import folderRoutes from './routes/folderRoutes';
import publicRoutes from './routes/publicRoutes';
import binRoutes from './routes/binRoutes';
import { createHttpLoggerMiddleware } from './middlewares/httpLogger';

const app = express();

const logger = container.get<ILogger>(TYPES.Logger);

app.use(asyncContextMiddleware);
app.use(createHttpLoggerMiddleware(logger));
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/bin', binRoutes);

app.use(createErrorHandler(logger));

export default app;

