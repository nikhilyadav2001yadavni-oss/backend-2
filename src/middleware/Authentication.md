# 🔐 Function-Based Authentication - Usage Guide

All code is **100% function-based** - no classes!

## 📁 Files Created

✅ `src/middleware/Authentication.ts` - All authentication middleware (pure functions)
✅ `src/utils/authHelpers.ts` - JWT & cookie helper functions (pure functions)

---

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install cookie-parser jsonwebtoken
npm install --save-dev @types/cookie-parser @types/jsonwebtoken
```

### 2. Environment Variables

```env
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d
```

### 3. Update app.ts

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

// Enable CORS with credentials
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true // IMPORTANT for cookies
}));

app.use(express.json());
app.use(cookieParser()); // REQUIRED for cookies

export default app;
```

---

## 📝 Usage Examples

### Example 1: Basic Auth Controller (Function-based)

```typescript
// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import { 
    generateTokens, 
    setAuthCookies, 
    clearAuthCookies 
} from '../utils/authHelpers';

/**
 * Login function
 */
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Your login logic here
        // Example: const user = await findUserByEmail(email);
        // Example: const isValid = await comparePassword(password, user.password);

        // Mock user for demo
        const user = {
            id: '123',
            email: email,
            role: 'customer'
        };

        // Generate JWT tokens
        const { accessToken, refreshToken } = generateTokens({
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Set tokens as HTTP-only cookies
        setAuthCookies(res, accessToken, refreshToken);

        // Send response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token: accessToken // Also in body for mobile apps
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout function
 */
export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Clear cookies
        clearAuthCookies(res);

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user function
 */
export const getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // User is attached by authenticate middleware
        const user = req.user;

        res.status(200).json({
            success: true,
            data: { user }
        });
    } catch (error) {
        next(error);
    }
};
```

### Example 2: Auth Routes (Function-based)

```typescript
// src/routes/authRoutes.ts
import express from 'express';
import { login, logout, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/Authentication';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticate, getCurrentUser);

export default router;
```

### Example 3: Protected Routes with Authorization

```typescript
// src/routes/userRoutes.ts
import express from 'express';
import { 
    authenticate, 
    authorize, 
    requireAdmin,
    authorizeOwnerOrAdmin 
} from '../middleware/Authentication';
import { 
    getAllUsers, 
    getUserById, 
    updateUser, 
    deleteUser 
} from '../controllers/userController';

const router = express.Router();

// Admin only - get all users
router.get('/', authenticate, requireAdmin, getAllUsers);

// Owner or admin - get specific user
router.get('/:userId', authenticate, authorizeOwnerOrAdmin('userId'), getUserById);

// Owner or admin - update user
router.put('/:userId', authenticate, authorizeOwnerOrAdmin('userId'), updateUser);

// Admin only - delete user
router.delete('/:userId', authenticate, requireAdmin, deleteUser);

export default router;
```

### Example 4: Product Routes with Role-Based Access

```typescript
// src/routes/productRoutes.ts
import express from 'express';
import { 
    authenticate, 
    authorize, 
    optionalAuthenticate 
} from '../middleware/Authentication';
import { 
    getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} from '../controllers/productController';

const router = express.Router();

// Public routes (optional auth for personalization)
router.get('/', optionalAuthenticate, getAllProducts);
router.get('/:id', getProductById);

// Seller or admin - create product
router.post('/', authenticate, authorize(['seller', 'admin']), createProduct);

// Seller or admin - update product
router.put('/:id', authenticate, authorize(['seller', 'admin']), updateProduct);

// Admin only - delete product
router.delete('/:id', authenticate, authorize(['admin']), deleteProduct);

export default router;
```

### Example 5: User Controller Functions

```typescript
// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Your logic here
        const users = []; // Get from database

        res.status(200).json({
            success: true,
            data: { users }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user by ID
 */
export const getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.params.userId;
        
        // Your logic here
        // const user = await findUserById(userId);

        res.status(200).json({
            success: true,
            data: { user: { id: userId } }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user
 */
export const updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.params.userId;
        const updateData = req.body;
        
        // Your update logic here
        // const user = await updateUserById(userId, updateData);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { user: { id: userId, ...updateData } }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete user
 */
export const deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.params.userId;
        
        // Your delete logic here
        // await deleteUserById(userId);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
```

---

## 🎯 All Available Functions

### Authentication Middleware Functions

```typescript
import { 
    authenticate,              // Require authentication
    optionalAuthenticate,      // Optional authentication
    authorize,                 // Require specific roles
    requireAdmin,              // Require admin role
    requireSellerOrAdmin,      // Require seller or admin
    authorizeOwnerOrAdmin,     // Require resource owner or admin
    validateRefreshToken       // Validate refresh token
} from '../middleware/Authentication';
```

### Helper Functions

```typescript
import {
    generateAccessToken,       // Generate access token
    generateRefreshToken,      // Generate refresh token
    generateTokens,            // Generate both tokens
    verifyToken,               // Verify JWT token
    setAuthCookie,             // Set auth cookie
    setRefreshCookie,          // Set refresh cookie
    setAuthCookies,            // Set both cookies
    clearAuthCookie,           // Clear auth cookie
    clearRefreshCookie,        // Clear refresh cookie
    clearAuthCookies           // Clear both cookies
} from '../utils/authHelpers';
```

---

## 📊 Function Flow Diagram

```
┌─────────────────────────┐
│  Client sends request   │
│  with cookie or header  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  authenticate()         │ ← Function (not class!)
│  - Extract token        │
│  - Verify JWT           │
│  - Attach user to req   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  authorize(['admin'])   │ ← Function (not class!)
│  - Check user role      │
│  - Allow or deny        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Your controller        │ ← Function (not class!)
│  function executes      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Response sent          │
└─────────────────────────┘
```

---

## 🧪 Test with cURL

```bash
# Login (saves cookie)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Access protected route (uses cookie)
curl http://localhost:3000/api/v1/auth/me \
  -b cookies.txt

# Or use Authorization header
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -b cookies.txt
```

---

## ✅ Summary

**Everything is function-based:**
- ✅ All middleware are **functions** (not class methods)
- ✅ All controllers are **functions** (not class methods)
- ✅ All helpers are **functions** (not class methods)
- ✅ No classes anywhere in authentication code!

**Features:**
- ✅ JWT + HTTP-only cookies
- ✅ Role-based authorization
- ✅ Dual authentication (cookie + header)
- ✅ Secure & production-ready
- ✅ TypeScript type-safe
- ✅ Easy to test

**Benefits:**
- ✅ Simple and straightforward
- ✅ Easy to understand
- ✅ Easy to test
- ✅ No `this` keyword confusion
- ✅ Pure functional approach

🚀 **Ready to use!**

