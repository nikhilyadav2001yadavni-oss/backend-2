import { Request, Response, NextFunction } from 'express'
import { JWT_CONFIG } from '../utils/authHelpers'
import User from '../models/UserModel'

/**
 * Extend Express Request to include user property
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string
                email: string
                role?: string
                permissions?: string[]
                _id?: string
                iat?: number
                exp?: number
            }
        }
    }
}

/**
 * Custom error for authentication failures
 */
export const createUnauthorizedError = (message: string = 'Authentication required') => {
    const error: any = new Error(message)
    error.statusCode = 401
    error.name = 'UnauthorizedError'
    return error
}

/**
 * Custom error for authorization failures
 */
export const createForbiddenError = (message: string = 'Access forbidden') => {
    const error: any = new Error(message)
    error.statusCode = 403
    error.name = 'ForbiddenError'
    return error
}

/**
 * Custom error for bad request (validation, invalid input, business rule)
 * Use for: missing/invalid fields, currency not found, min amount, duplicate tx, verification failed.
 * Do NOT use for auth failures (use createUnauthorizedError) - 401 causes app logout.
 */
export const createBadRequestError = (message: string = 'Bad request') => {
    const error: any = new Error(message)
    error.statusCode = 400
    error.name = 'BadRequestError'
    return error
}

/**
 * Custom error for resource not found
 */
export const createNotFoundError = (message: string = 'Not found') => {
    const error: any = new Error(message)
    error.statusCode = 404
    error.name = 'NotFoundError'
    return error
}

/**
 * Custom error for conflict (e.g. duplicate transaction hash)
 */
export const createConflictError = (message: string = 'Conflict') => {
    const error: any = new Error(message)
    error.statusCode = 409
    error.name = 'ConflictError'
    return error
}

/**
 * Extract JWT token from request
 * Priority: 1. HTTP Cookie, 2. Authorization Header
 */
const extractToken = (req: Request): string | null => {
    // Try to get token from cookie first (more secure)
    const cookieToken = req.cookies?.authToken
    if (cookieToken) {
        return cookieToken
    }

    // Fallback to Authorization header
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7)
    }

    return null
}

/**
 * Verify JWT token helper
 */
const verifyJWT = (token: string): any => {
    try {
        const jwt = require('jsonwebtoken')
        return jwt.verify(token, JWT_CONFIG.secret)
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw createUnauthorizedError('Token has expired')
        } else if (error.name === 'JsonWebTokenError') {
            throw createUnauthorizedError('Invalid token')
        } else {
            throw createUnauthorizedError('Token verification failed')
        }
    }
}

/**
 * Authentication Middleware (Function-based)
 * Verifies JWT token from cookie or Authorization header
 *
 * @throws UnauthorizedError if token is missing or invalid
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Extract token
        const token = extractToken(req)

        if (!token) {
            throw createUnauthorizedError('Authentication token is required')
        }

        // Verify token
        const decoded = verifyJWT(token)

        // Block suspended accounts immediately (only checked for non-admin roles to avoid extra DB hit on admin routes)
        const userId = decoded.id || decoded._id
        if (userId && decoded.role !== 'admin' && decoded.role !== 'superadmin') {
            const user = await User.findById(userId).select('status').lean()
            if (!user) {
                throw createUnauthorizedError('Account not found')
            }
            if ((user as any).status === 'suspended') {
                throw createUnauthorizedError('Your account has been suspended. Please contact support.')
            }
        }

        // Attach user data to request
        req.user = decoded

        next()
    } catch (error) {
        next(error)
    }
}

/**
 * Optional Authentication Middleware (Function-based)
 * Attaches user to request if valid token exists, but doesn't throw error if missing.
 * Suspended users are treated as unauthenticated (no req.user attached).
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = extractToken(req)

        if (token) {
            const decoded = verifyJWT(token)
            const userId = decoded.id || decoded._id
            if (userId && decoded.role !== 'admin' && decoded.role !== 'superadmin') {
                const user = await User.findById(userId).select('status').lean()
                if (user && (user as any).status === 'suspended') {
                    return next()
                }
            }
            req.user = decoded
        }

        next()
    } catch (error) {
        // Continue without user if token is invalid
        next()
    }
}

/**
 * Authorization Middleware Factory (Function-based)
 * Returns a middleware function that checks if authenticated user has required role(s)
 *
 * @param roles - Array of allowed roles
 * @returns Middleware function
 */
export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                throw createUnauthorizedError('Authentication required')
            }

            // Check if user has required role
            if (!req.user.role || !roles.includes(req.user.role)) {
                throw createForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`)
            }

            next()
        } catch (error) {
            next(error)
        }
    }
}

/**
 * Check if user is owner of resource or admin (Function-based)
 *
 * @param userIdParam - Name of the route parameter containing user ID
 * @returns Middleware function
 */
export const authorizeOwnerOrAdmin = (userIdParam: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                throw createUnauthorizedError('Authentication required')
            }

            const resourceUserId = req.params[userIdParam]
            const currentUserId = req.user.id || req.user._id

            // Allow if user is admin or resource owner
            if (req.user.role === 'admin' || currentUserId === resourceUserId) {
                return next()
            }

            throw createForbiddenError('You can only access your own resources')
        } catch (error) {
            next(error)
        }
    }
}

/**
 * Require admin role (Function-based)
 */
export const requireAdmin = authorize(['admin'])

/**
 * Require any admin role — admin, superadmin, or subadmin.
 * Use for general admin panel routes that sub-admins should also access.
 */
export const requireAnyAdmin = authorize(['admin', 'superadmin', 'subadmin'])

/**
 * Require Super Admin role (superadmin or legacy admin) - for investment config, etc.
 */
export const requireSuperAdmin = authorize(['superadmin', 'admin'])

/**
 * Require seller or admin role (Function-based)
 */
export const requireSellerOrAdmin = authorize(['seller', 'admin'])

/**
 * Refresh token middleware (Function-based)
 * Validates refresh token for token renewal
 */
export const validateRefreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = extractToken(req)

        if (!token) {
            throw createUnauthorizedError('Refresh token is required')
        }

        const decoded = verifyJWT(token)
        req.user = decoded

        next()
    } catch (error) {
        next(error)
    }
}
