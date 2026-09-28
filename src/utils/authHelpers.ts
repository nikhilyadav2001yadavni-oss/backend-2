import { Response } from 'express';

/**
 * JWT Configuration
 */
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Set it in your .env file and restart.');
    process.exit(1);
}

export const JWT_CONFIG = {
    secret: process.env.JWT_SECRET,
    accessTokenExpiry: process.env.JWT_EXPIRY || '7d',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
    cookieName: 'authToken',
    refreshCookieName: 'refreshToken'
};

/**
 * Get token expiry time in milliseconds
 */
export const getTokenExpiryMs = (expiresIn: string): number => {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 7 * 24 * 60 * 60 * 1000;
    }
};

export type TokenPayload = { id: string; email: string; role?: string; permissions?: string[] };

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, JWT_CONFIG.secret, {
        expiresIn: JWT_CONFIG.accessTokenExpiry
    });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, JWT_CONFIG.secret, {
        expiresIn: JWT_CONFIG.refreshTokenExpiry
    });
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokens = (payload: TokenPayload) => {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
        accessToken,
        refreshToken,
        accessTokenExpiry: JWT_CONFIG.accessTokenExpiry,
        refreshTokenExpiry: JWT_CONFIG.refreshTokenExpiry
    };
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): any => {
    try {
        const jwt = require('jsonwebtoken');
        return jwt.verify(token, JWT_CONFIG.secret);
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            const err: any = new Error('Token has expired');
            err.statusCode = 401;
            throw err;
        } else if (error.name === 'JsonWebTokenError') {
            const err: any = new Error('Invalid token');
            err.statusCode = 401;
            throw err;
        } else {
            const err: any = new Error('Token verification failed');
            err.statusCode = 401;
            throw err;
        }
    }
};

/**
 * Get default cookie options based on environment
 */
export const getDefaultCookieOptions = () => {
    const isProduction = process.env.ENV === 'production';

    return {
        httpOnly: true, // Prevents JavaScript access (XSS protection)
        secure: isProduction, // HTTPS only in production
        sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
        path: '/',
        maxAge: getTokenExpiryMs(JWT_CONFIG.accessTokenExpiry)
    };
};

/**
 * Set authentication token in HTTP-only cookie
 */
export const setAuthCookie = (res: Response, token: string): void => {
    const cookieOptions = getDefaultCookieOptions();
    res.cookie(JWT_CONFIG.cookieName, token, cookieOptions);
};

/**
 * Set refresh token in HTTP-only cookie
 */
export const setRefreshCookie = (res: Response, refreshToken: string): void => {
    const cookieOptions = {
        ...getDefaultCookieOptions(),
        maxAge: getTokenExpiryMs(JWT_CONFIG.refreshTokenExpiry)
    };
    res.cookie(JWT_CONFIG.refreshCookieName, refreshToken, cookieOptions);
};

/**
 * Set both auth and refresh tokens as cookies
 */
export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
    setAuthCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
};

/**
 * Clear authentication cookie
 */
export const clearAuthCookie = (res: Response): void => {
    res.clearCookie(JWT_CONFIG.cookieName, {
        httpOnly: true,
        secure: process.env.ENV === 'production',
        sameSite: process.env.ENV === 'production' ? 'strict' : 'lax',
        path: '/'
    });
};

/**
 * Clear refresh token cookie
 */
export const clearRefreshCookie = (res: Response): void => {
    res.clearCookie(JWT_CONFIG.refreshCookieName, {
        httpOnly: true,
        secure: process.env.ENV === 'production',
        sameSite: process.env.ENV === 'production' ? 'strict' : 'lax',
        path: '/'
    });
};

/**
 * Clear all authentication cookies
 */
export const clearAuthCookies = (res: Response): void => {
    clearAuthCookie(res);
    clearRefreshCookie(res);
};

