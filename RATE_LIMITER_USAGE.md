# 🚦 Rate Limiter Usage Guide

## Available Rate Limiters

### 1. **apiLimiter** - General API
- 100 requests per 15 minutes
- Use for general API endpoints

### 2. **authLimiter** - Authentication
- 5 requests per 15 minutes
- Use for login, register endpoints
- Skips successful requests

### 3. **createAccountLimiter** - Account Creation
- 3 accounts per hour
- Use for signup/register endpoints

### 4. **passwordResetLimiter** - Password Reset
- 3 requests per hour
- Use for forgot password endpoints

### 5. **heavyOperationLimiter** - Heavy Operations
- 10 requests per minute
- Use for file uploads, exports

---

## Usage Examples

### Example 1: Protect Auth Routes

```typescript
// src/routes/authRoutes.ts
import express from 'express';
import { authLimiter, createAccountLimiter } from '../middleware/rateLimiter';
import { login, register, logout } from '../controllers/authController';

const router = express.Router();

// Apply rate limiters to auth endpoints
router.post('/login', authLimiter, login);
router.post('/register', createAccountLimiter, register);
router.post('/logout', logout);

export default router;
```

### Example 2: Protect Admin Routes

```typescript
// src/routes/AdminRoutes.ts
import express from 'express';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/Authentication';
import AdminController from '../controllers/AdminController';

const router = express.Router();

router.post('/signup', authLimiter, AdminController.signup);
router.post('/signin', authLimiter, AdminController.signin);
router.get('/profile', authenticate, AdminController.getProfile);

export default router;
```

### Example 3: Apply to All Routes

```typescript
// src/app.ts
import { apiLimiter } from './middleware/rateLimiter';

const app = express();

// Apply to all API routes
app.use('/api/', apiLimiter);

// Then your routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
```

### Example 4: Custom Rate Limiter

```typescript
import { createRateLimiter } from '../middleware/rateLimiter';

// Custom: 50 requests per 5 minutes
const customLimiter = createRateLimiter(
    5 * 60 * 1000,  // 5 minutes
    50,             // 50 requests
    'Custom rate limit exceeded'
);

router.get('/custom', customLimiter, customHandler);
```

### Example 5: Multiple Rate Limiters

```typescript
// Combine general API limiter + specific auth limiter
router.post('/login', 
    apiLimiter,      // 100 req per 15 min
    authLimiter,     // 5 req per 15 min (stricter)
    login
);
```

---

## Complete Example

```typescript
// src/routes/AdminRoutes.ts
import express from 'express';
import { 
    authLimiter, 
    createAccountLimiter 
} from '../middleware/rateLimiter';
import { authenticate } from '../middleware/Authentication';
import AdminService from '../services/AdminService';

const router = express.Router();

// Signup with strict rate limit
router.post('/signup', createAccountLimiter, async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        await AdminService.signup(name, email, password);
        res.status(201).json({ 
            success: true, 
            message: 'Admin created successfully' 
        });
    } catch (error) {
        next(error);
    }
});

// Login with auth rate limit
router.post('/signin', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // Your login logic
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// No rate limit on authenticated routes (already protected)
router.get('/profile', authenticate, async (req, res, next) => {
    try {
        res.json({ success: true, user: req.user });
    } catch (error) {
        next(error);
    }
});

export default router;
```

---

## Configuration Tips

### Environment-Based Limits

```typescript
// src/middleware/rateLimiter.ts
const isProduction = process.env.ENV === 'production';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 5 : 100, // Relaxed in development
    message: {
        success: false,
        message: 'Too many attempts',
        statusCode: 429
    }
});
```

### Skip Certain IPs

```typescript
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skip: (req) => {
        // Skip rate limiting for localhost in development
        return req.ip === '127.0.0.1' && process.env.ENV !== 'production';
    }
});
```

---

## Best Practices

1. **Always rate limit authentication endpoints**
   ```typescript
   router.post('/login', authLimiter, login);
   router.post('/register', createAccountLimiter, register);
   ```

2. **Use stricter limits for sensitive operations**
   ```typescript
   router.post('/password-reset', passwordResetLimiter, resetPassword);
   router.delete('/account', heavyOperationLimiter, deleteAccount);
   ```

3. **Apply general limiter to all API routes**
   ```typescript
   app.use('/api/', apiLimiter);
   ```

4. **Don't rate limit static files**
   ```typescript
   // Static files are before rate limiter
   app.use(express.static('public'));
   app.use('/api/', apiLimiter);
   ```

5. **Monitor rate limit headers**
   ```
   RateLimit-Limit: 100
   RateLimit-Remaining: 95
   RateLimit-Reset: 1634567890
   ```

---

## Testing Rate Limits

```bash
# Test with cURL (repeat quickly)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/admin/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
done

# After 5 requests, you should get 429 (Too Many Requests)
```

---

✅ **Rate limiting is now implemented and ready to use!**

