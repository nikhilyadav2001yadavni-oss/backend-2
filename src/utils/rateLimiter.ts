import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * Limits: 200 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Max 200 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        statusCode: 429
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Authentication Rate Limiter (Stricter)
 * Limits: 5 requests per 15 minutes per IP
 * Use for login, register, password reset
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 attempts per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Create Account Rate Limiter (Very Strict)
 * Limits: 3 accounts per hour per IP
 */
export const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 accounts per hour
    message: {
        success: false,
        message: 'Too many accounts created from this IP, please try again after an hour',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Password Reset Rate Limiter
 * Limits: 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 requests per hour
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again after an hour',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Heavy Operation Rate Limiter
 * Limits: 10 requests per minute per IP
 * Use for file uploads, heavy computations
 */
export const heavyOperationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Max 10 requests per minute
    message: {
        success: false,
        message: 'Too many requests, please slow down',
        statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Custom Rate Limiter Factory
 * Create your own rate limiter with custom settings
 */
export const createRateLimiter = (
    windowMs: number,
    max: number,
    message: string = 'Too many requests, please try again later'
) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            message,
            statusCode: 429
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

