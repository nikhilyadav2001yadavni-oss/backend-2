import express from 'express'
import { apiLimiter } from '../utils/rateLimiter'
import { authenticate, requireAdmin } from '../middleware/authentication'
import { apkUpload } from '../utils/uploadHelper'
import AppVersionController from '../controllers/AppVersionController'

const router = express.Router()

/**
 * App version self-update endpoints.
 *
 * Public endpoints (used by the React Native app and the public website):
 *   GET  /check?platform=android&versionCode=12   — installed app polls this on launch
 *   GET  /latest?platform=android                  — public site "Download App" button
 *
 * Admin endpoints (require admin JWT):
 *   GET    /            — list version history
 *   GET    /:id         — get one
 *   POST   /            — create a new version (multipart/form-data with `apk` file, or JSON with apkUrl)
 *   PUT    /:id         — update metadata
 *   PATCH  /:id/activate — set this version as the live one for its platform
 *   DELETE /:id         — delete a version (also removes APK from Cloudinary)
 */
router
    // Public
    .get('/check', apiLimiter, AppVersionController.checkUpdate)
    .get('/latest', apiLimiter, AppVersionController.getLatest)

    // Admin
    .get('/', apiLimiter, authenticate, requireAdmin, AppVersionController.listVersions)
    .get('/:id', apiLimiter, authenticate, requireAdmin, AppVersionController.getVersionById)
    .post(
        '/',
        apiLimiter,
        authenticate,
        requireAdmin,
        apkUpload.single('apk'),
        AppVersionController.createVersion
    )
    .put('/:id', apiLimiter, authenticate, requireAdmin, AppVersionController.updateVersion)
    .patch('/:id/activate', apiLimiter, authenticate, requireAdmin, AppVersionController.setActive)
    .delete('/:id', apiLimiter, authenticate, requireAdmin, AppVersionController.deleteVersion)

export default router
