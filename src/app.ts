import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
const ENV = process.env.ENV || 'development';
dotenv.config({path: `./.env.${ENV}`});
console.log(`🔧 Environment: ${ENV} (.env.${ENV} loaded)`);

// Now import everything else (after env vars are loaded)
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import config from './config/config';
import mongoose from './db/mongoose';
import { Request, Response, NextFunction } from 'express';
import routes from './routes/index';
import { apiLimiter } from './utils/rateLimiter';
import swaggerSpec from './config/swagger';
import { HttpStatusCode } from './enums/App';
import './services/FirebaseService'; // Initialize Firebase Admin SDK
import { seedDefaultGameConfigs } from './models/GameConfigModel'; // Initialize Game Configs
import { seedDefaultSystemConfig } from './models/SystemConfigModel'; // Initialize System Config

const app = express();

// connect database
const dbUri = config.databases[ENV as keyof typeof config.databases];
if (!dbUri) {
    console.error(`FATAL: DB_URI is not set for environment "${ENV}". Set DB_URI in .env.${ENV} and restart.`);
    process.exit(1);
}
mongoose(dbUri);

// Seed default game configurations
seedDefaultGameConfigs().catch((error) => {
    console.error('Failed to seed game configurations:', error);
});

// Seed default system configuration
seedDefaultSystemConfig().catch((error) => {
    console.error('Failed to seed system configuration:', error);
});

// Trust reverse proxy (nginx / ALB) — required for correct client IPs in rate limiting
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Express Middleware (BEFORE routes)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0
        ? (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, server-to-server)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin "${origin}" not allowed`));
            }
          }
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true, parameterLimit: 1000 }))
app.use(cookieParser());
app.use(express.static('public'))

// Swagger Documentation — only in non-production environments
if (ENV !== 'production') {
    app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'W-Invest API Documentation',
    }));
}

// Routes (AFTER middleware)
app.use('/api/', apiLimiter)
app.use('/api/v1/user', routes.UserRoutes);
app.use('/api/v1/admin', routes.AdminRoutes);
app.use('/api/v1/wallet', routes.WalletRoutes);
app.use('/api/v1/notifications', routes.NotificationRoutes);
app.use('/api/v1/team', routes.TeamRoutes);
app.use('/api/v1/games', routes.GamesRoutes);
app.use('/api/v1/helper', routes.HelperRoutes);
app.use('/api/v1/banner', routes.BannerRoutes);
app.use('/api/v1/roi', routes.RoiRoutes);
app.use('/api/v1/cron', routes.CronRoutes);
app.use('/api/v1/support-tickets', routes.SupportTicketRoutes);
app.use('/api/v1/app-version', routes.AppVersionRoutes);

// 404 for unknown routes (must be before error handler)
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.warn('[404]', req.method, req.originalUrl);
    const err: any = new Error(
        `Not Found: ${req.method} ${req.originalUrl}. Expected API prefix /api/v1 (e.g. /api/v1/admin/..., /api/v1/support-tickets/...).`
    );
    err.statusCode = HttpStatusCode.NOT_FOUND;
    next(err);
});

// Global error handler: catch ALL errors from routes/middleware so the server never crashes
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode && typeof err.statusCode === 'number'
        ? err.statusCode
        : HttpStatusCode.INTERNAL_SERVER_ERROR;
    const message = err.message && typeof err.message === 'string' ? err.message : 'Internal server error';

    if (statusCode >= 500) {
        console.error('[Error]', err.name || 'Error', message, err.stack || '');
    }

    try {
        res.status(statusCode).json({
            message,
            data: null,
            ...(process.env.ENV === 'development' && err.stack && { stack: err.stack }),
        });
    } catch (sendError) {
        console.error('[Error] Failed to send error response:', sendError);
    }
});

export default app;