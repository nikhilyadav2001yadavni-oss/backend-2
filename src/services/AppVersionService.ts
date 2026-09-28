import { Request } from 'express'
import {
    createBadRequestError,
    createConflictError,
    createNotFoundError,
} from '../middleware/authentication'
import AppVersion, { AppVersionPlatform, APP_VERSION_PLATFORMS } from '../models/AppVersionModel'
import { buildApkPublicUrl, deleteApkFile } from '../utils/uploadHelper'

const normalizePlatform = (platform?: string): AppVersionPlatform => {
    const value = (platform || 'android').toLowerCase() as AppVersionPlatform
    if (!APP_VERSION_PLATFORMS.includes(value)) {
        throw createBadRequestError(`Invalid platform. Allowed: ${APP_VERSION_PLATFORMS.join(', ')}`)
    }
    return value
}

const parseInteger = (value: any, field: string): number => {
    const num = typeof value === 'number' ? value : parseInt(String(value), 10)
    if (!Number.isFinite(num) || Number.isNaN(num)) {
        throw createBadRequestError(`${field} must be a valid integer`)
    }
    return num
}

interface CreateVersionInput {
    platform?: string
    versionName: string
    versionCode: number | string
    apkUrl?: string // optional: if file is uploaded, this is filled by service
    apkSizeBytes?: number | null
    checksumSha256?: string | null
    releaseNotes?: string | null
    forceUpdate?: boolean
    minSupportedVersionCode?: number | string | null
    isActive?: boolean
    file?: Express.Multer.File
    req?: Request // used to build the public APK URL when a file is uploaded
    uploadedBy?: {
        adminId?: string | null
        name?: string | null
        email?: string | null
    } | null
}

export default {
    /**
     * Public: lightweight check used by the installed app on launch.
     * Returns whether an update is available, and whether it must be forced.
     */
    checkUpdate: async (
        platformInput: string | undefined,
        currentVersionCodeInput: any
    ): Promise<{
        updateAvailable: boolean
        forceUpdate: boolean
        latest: any | null
    }> => {
        const platform = normalizePlatform(platformInput)
        const currentVersionCode = parseInteger(currentVersionCodeInput ?? 0, 'currentVersionCode')

        const latest = await AppVersion.findOne({ platform, isActive: true })
            .sort({ versionCode: -1 })
            .lean()

        if (!latest) {
            return { updateAvailable: false, forceUpdate: false, latest: null }
        }

        const updateAvailable = latest.versionCode > currentVersionCode
        const minSupported = latest.minSupportedVersionCode ?? 0
        const belowMinSupported = currentVersionCode > 0 && currentVersionCode < minSupported
        const forceUpdate = updateAvailable && (!!latest.forceUpdate || belowMinSupported)

        return { updateAvailable, forceUpdate, latest }
    },

    /**
     * Public: returns the current "live" version metadata (no comparison).
     * Used by the website's Download button.
     */
    getLatest: async (platformInput?: string): Promise<any | null> => {
        const platform = normalizePlatform(platformInput)
        return AppVersion.findOne({ platform, isActive: true })
            .sort({ versionCode: -1 })
            .lean()
    },

    /** Admin: full history list. */
    listVersions: async (platformInput?: string): Promise<any[]> => {
        const filter: any = {}
        if (platformInput) {
            filter.platform = normalizePlatform(platformInput)
        }
        return AppVersion.find(filter).sort({ createdAt: -1 }).lean()
    },

    getById: async (id: string): Promise<any> => {
        const doc = await AppVersion.findById(id).lean()
        if (!doc) throw createNotFoundError('App version not found')
        return doc
    },

    /**
     * Admin: create a new version. Either:
     *   - `file` is provided (multipart/form-data) → APK is uploaded to Cloudinary, OR
     *   - `apkUrl` is provided directly (e.g. external CDN-hosted build).
     *
     * On success, previous active versions for the same platform are deactivated
     * (single "live" version per platform), unless `isActive=false` is passed.
     */
    createVersion: async (input: CreateVersionInput): Promise<any> => {
        const platform = normalizePlatform(input.platform)
        const versionName = (input.versionName || '').trim()
        if (!versionName) throw createBadRequestError('versionName is required')

        const versionCode = parseInteger(input.versionCode, 'versionCode')
        if (versionCode < 1) throw createBadRequestError('versionCode must be >= 1')

        const minSupportedVersionCode =
            input.minSupportedVersionCode === undefined ||
            input.minSupportedVersionCode === null ||
            input.minSupportedVersionCode === ''
                ? null
                : parseInteger(input.minSupportedVersionCode, 'minSupportedVersionCode')

        const toBool = (v: any): boolean => v === true || v === 'true' || v === 1 || v === '1'
        const forceUpdate = toBool(input.forceUpdate)
        const isActive = input.isActive === undefined ? true : toBool(input.isActive)

        // Reject duplicate versionCode for same platform up-front (also enforced by unique index).
        const duplicate = await AppVersion.findOne({ platform, versionCode }).lean()
        if (duplicate) {
            throw createConflictError(
                `Version code ${versionCode} already exists for ${platform}. Use a higher versionCode.`
            )
        }

        let apkUrl = (input.apkUrl || '').trim()
        let apkFilename: string | null = null
        let apkSizeBytes: number | null =
            input.apkSizeBytes === undefined || input.apkSizeBytes === null
                ? null
                : parseInteger(input.apkSizeBytes, 'apkSizeBytes')

        if (input.file) {
            // multer.diskStorage has already saved the file to public/apks/<filename>.
            // We just need to record where it lives and build the public URL.
            if (!input.req) {
                // safety net — should never happen since the controller always passes req.
                deleteApkFile(input.file.filename)
                throw createBadRequestError('Internal error: missing request context for APK upload')
            }
            apkFilename = input.file.filename
            apkUrl = buildApkPublicUrl(input.req, input.file.filename)
            apkSizeBytes = input.file.size ?? null
        }

        if (!apkUrl) {
            throw createBadRequestError('Either an APK file upload or apkUrl is required')
        }

        const doc = await AppVersion.create({
            platform,
            versionName,
            versionCode,
            apkUrl,
            apkFilename,
            apkSizeBytes,
            checksumSha256: input.checksumSha256?.trim() || null,
            releaseNotes: input.releaseNotes?.trim() || null,
            forceUpdate,
            minSupportedVersionCode,
            isActive,
            uploadedBy: input.uploadedBy || null,
        })

        // If the new version is active, deactivate all previous active versions for the same platform.
        if (isActive) {
            await AppVersion.updateMany(
                { platform, _id: { $ne: doc._id }, isActive: true },
                { $set: { isActive: false } }
            )
        }

        return doc.toObject()
    },

    /** Admin: edit metadata only (URL, release notes, flags). Re-uploading APK is via createVersion. */
    updateVersion: async (
        id: string,
        updates: Partial<{
            versionName: string
            releaseNotes: string | null
            forceUpdate: boolean
            minSupportedVersionCode: number | null
            isActive: boolean
            checksumSha256: string | null
            apkUrl: string
        }>
    ): Promise<any> => {
        const doc = await AppVersion.findById(id)
        if (!doc) throw createNotFoundError('App version not found')

        if (updates.versionName !== undefined) doc.versionName = updates.versionName.trim()
        if (updates.releaseNotes !== undefined) doc.releaseNotes = updates.releaseNotes ? updates.releaseNotes.trim() : null
        if (updates.forceUpdate !== undefined) doc.forceUpdate = !!updates.forceUpdate
        if (updates.minSupportedVersionCode !== undefined) {
            doc.minSupportedVersionCode =
                updates.minSupportedVersionCode === null
                    ? null
                    : parseInteger(updates.minSupportedVersionCode, 'minSupportedVersionCode')
        }
        if (updates.checksumSha256 !== undefined) doc.checksumSha256 = updates.checksumSha256 ? updates.checksumSha256.trim() : null
        if (updates.apkUrl !== undefined && updates.apkUrl.trim()) doc.apkUrl = updates.apkUrl.trim()

        // isActive change: when activating, deactivate other versions on same platform.
        if (updates.isActive !== undefined) {
            const willActivate = !!updates.isActive
            doc.isActive = willActivate
            if (willActivate) {
                await AppVersion.updateMany(
                    { platform: doc.platform, _id: { $ne: doc._id }, isActive: true },
                    { $set: { isActive: false } }
                )
            }
        }

        await doc.save()
        return doc.toObject()
    },

    /** Admin: explicitly set a single version as the live one for its platform. */
    setActive: async (id: string): Promise<any> => {
        const doc = await AppVersion.findById(id)
        if (!doc) throw createNotFoundError('App version not found')
        await AppVersion.updateMany(
            { platform: doc.platform, _id: { $ne: doc._id }, isActive: true },
            { $set: { isActive: false } }
        )
        doc.isActive = true
        await doc.save()
        return doc.toObject()
    },

    /** Admin: hard delete + best-effort cleanup of the APK from disk. */
    deleteVersion: async (id: string): Promise<void> => {
        const doc = await AppVersion.findById(id)
        if (!doc) throw createNotFoundError('App version not found')

        if (doc.apkFilename) {
            deleteApkFile(doc.apkFilename)
        }
        await AppVersion.findByIdAndDelete(id)
    },
}
