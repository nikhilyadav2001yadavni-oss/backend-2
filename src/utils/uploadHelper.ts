import { v2 as cloudinary } from 'cloudinary'
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary'
import multer from 'multer'
import { Request } from 'express'
import path from 'path'
import fs from 'fs'

// Public folder for serving static assets (APKs, etc.) — express.static('public') in app.ts
// makes anything inside `public/` accessible at the URL root.
export const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
export const APK_DIR = path.join(PUBLIC_DIR, 'apks')
// Public URL path prefix corresponding to APK_DIR (clients use `${baseUrl}${APK_URL_PREFIX}/<file>`)
export const APK_URL_PREFIX = '/apks'

// Ensure the APK directory exists at module load — multer's diskStorage assumes the
// destination already exists, so this prevents first-upload-after-deploy failures.
try {
    fs.mkdirSync(APK_DIR, { recursive: true })
} catch (err: any) {
    console.warn('[uploadHelper] Failed to ensure APK directory exists:', err?.message || err)
}

// Configure Cloudinary - ensure it's configured before use
const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUDNAME
    const apiKey = process.env.CLOUDINARY_API
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    // Debug: Log if variables are missing (without exposing secrets)
    if (!cloudName || !apiKey || !apiSecret) {
        const missing = []
        if (!cloudName) missing.push('CLOUDINARY_CLOUDNAME')
        if (!apiKey) missing.push('CLOUDINARY_API')
        if (!apiSecret) missing.push('CLOUDINARY_API_SECRET')
        
        throw new Error(
            `Cloudinary configuration is missing. Missing variables: ${missing.join(', ')}. ` +
            `Please check your .env.${process.env.ENV || 'development'} file.`
        )
    }

    cloudinary.config({
        cloud_name: cloudName.trim(),
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
    })

    return cloudinary
}

// Initialize Cloudinary configuration
let cloudinaryConfigured = false
const ensureCloudinaryConfigured = () => {
    if (!cloudinaryConfigured) {
        configureCloudinary()
        cloudinaryConfigured = true
    }
}

// Configure multer for memory storage (to upload directly to Cloudinary)
const storage = multer.memoryStorage()

export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Only image files are allowed'))
        }
    },
})

// Disk storage for APKs — files land in `public/apks/` and are served by express.static.
// We sanitize the filename and append a timestamp to avoid collisions when the same
// versionName is uploaded twice (e.g. while iterating).
const apkDiskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        try {
            fs.mkdirSync(APK_DIR, { recursive: true })
            cb(null, APK_DIR)
        } catch (err: any) {
            cb(err, APK_DIR)
        }
    },
    filename: (_req, file, cb) => {
        const original = file.originalname || 'app.apk'
        const ext = path.extname(original).toLowerCase() === '.apk' ? '.apk' : '.apk'
        const base = path
            .basename(original, path.extname(original))
            .replace(/[^a-zA-Z0-9_.-]+/g, '-')
            .slice(0, 60) || 'app'
        const stamp = Date.now()
        cb(null, `${base}-${stamp}${ext}`)
    },
})

// Separate multer instance for APK uploads (Android app self-update feature).
// APKs can be much larger than images, so a higher size limit is required.
export const apkUpload = multer({
    storage: apkDiskStorage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit for APK files
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const isApkExtension = /\.apk$/i.test(file.originalname || '')
        const isApkMime =
            file.mimetype === 'application/vnd.android.package-archive' ||
            file.mimetype === 'application/octet-stream' || // many browsers send this for .apk
            file.mimetype === 'application/x-zip-compressed'
        if (isApkExtension || isApkMime) {
            cb(null, true)
        } else {
            cb(new Error('Only .apk files are allowed'))
        }
    },
})

/**
 * Build the absolute, publicly accessible URL for an APK filename stored in `public/apks/`.
 * Honors `PUBLIC_BASE_URL` env var when set; otherwise derives from the incoming request.
 */
export const buildApkPublicUrl = (req: Request, filename: string): string => {
    const envBase = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
    if (envBase) {
        return `${envBase}${APK_URL_PREFIX}/${filename}`
    }
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http'
    const host = req.get('host')
    return `${proto}://${host}${APK_URL_PREFIX}/${filename}`
}

/**
 * Best-effort delete of a locally stored APK file by filename. Never throws —
 * a missing file should not block deleting the DB record.
 */
export const deleteApkFile = (filename?: string | null): void => {
    if (!filename) return
    // Reject anything that tries to escape APK_DIR
    const safeName = path.basename(filename)
    if (safeName !== filename) {
        console.warn('[uploadHelper] Refusing to delete APK with suspicious name:', filename)
        return
    }
    const fullPath = path.join(APK_DIR, safeName)
    fs.unlink(fullPath, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.warn(`[uploadHelper] Failed to delete APK ${safeName}:`, err.message)
        }
    })
}

/**
 * Upload image to Cloudinary
 * @param file - File buffer from multer
 * @param folder - Cloudinary folder path (optional)
 * @param publicId - Public ID for the image (optional)
 * @returns Promise with upload result containing URL and public_id
 */
export const uploadImageToCloudinary = async (
    file: Express.Multer.File,
    folder?: string,
    publicId?: string
): Promise<{ url: string; public_id: string; secure_url: string }> => {
    // Ensure Cloudinary is configured before use
    ensureCloudinaryConfigured()

    return new Promise((resolve, reject) => {
        const uploadOptions: any = {
            resource_type: 'image',
        }

        if (folder) {
            uploadOptions.folder = folder
        }

        if (publicId) {
            uploadOptions.public_id = publicId
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                if (error) {
                    let errorMessage = `Cloudinary upload failed: ${error.message}`
                    
                    // Provide more helpful error messages
                    if (error.message?.includes('cloud_name is disabled')) {
                        errorMessage = 'Cloudinary cloud_name is disabled or invalid. Please check your CLOUDINARY_CLOUDNAME environment variable.'
                    } else if (error.message?.includes('Invalid API Key')) {
                        errorMessage = 'Invalid Cloudinary API key. Please check your CLOUDINARY_API environment variable.'
                    } else if (error.message?.includes('Invalid API Secret')) {
                        errorMessage = 'Invalid Cloudinary API secret. Please check your CLOUDINARY_API_SECRET environment variable.'
                    }
                    
                    reject(new Error(errorMessage))
                } else if (result) {
                    resolve({
                        url: result.url,
                        public_id: result.public_id,
                        secure_url: result.secure_url,
                    })
                } else {
                    reject(new Error('Cloudinary upload failed: Unknown error'))
                }
            }
        )

        uploadStream.end(file.buffer)
    })
}

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Promise with deletion result
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        ensureCloudinaryConfigured()
        await cloudinary.uploader.destroy(publicId)
    } catch (error: any) {
        throw new Error(`Failed to delete image from Cloudinary: ${error.message}`)
    }
}

export default {
    upload,
    apkUpload,
    uploadImageToCloudinary,
    deleteImageFromCloudinary,
    buildApkPublicUrl,
    deleteApkFile,
}
