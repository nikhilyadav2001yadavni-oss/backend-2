import { Request, Response, NextFunction } from 'express'
import { HttpStatusCode } from '../enums/App'
import AppVersionService from '../services/AppVersionService'

export default {
    /** Public — installed Android app calls this on launch. */
    checkUpdate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const platform = (req.query.platform as string) || 'android'
            const currentVersionCode = req.query.versionCode ?? req.query.currentVersionCode ?? 0

            const result = await AppVersionService.checkUpdate(platform, currentVersionCode)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Version check completed',
                data: result,
            })
        } catch (error) {
            next(error)
        }
    },

    /** Public — winvest-web's "Download App" button. */
    getLatest: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const platform = (req.query.platform as string) || 'android'
            const latest = await AppVersionService.getLatest(platform)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: latest ? 'Latest version fetched' : 'No active version found',
                data: latest,
            })
        } catch (error) {
            next(error)
        }
    },

    /** Admin — list version history. */
    listVersions: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const platform = req.query.platform as string | undefined
            const versions = await AppVersionService.listVersions(platform)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Versions fetched successfully',
                data: versions,
            })
        } catch (error) {
            next(error)
        }
    },

    /** Admin — get one version by id. */
    getVersionById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params
            const version = await AppVersionService.getById(id)
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Version fetched successfully',
                data: version,
            })
        } catch (error) {
            next(error)
        }
    },

    /**
     * Admin — create a new version.
     * Accepts multipart/form-data when uploading an APK file (field name "apk"),
     * or application/json when supplying an external apkUrl.
     */
    createVersion: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body: any = req.body || {}

            const uploadedBy = req.user
                ? {
                      adminId: req.user.id || req.user._id || null,
                      name: (req.user as any).name || null,
                      email: req.user.email || null,
                  }
                : null

            const created = await AppVersionService.createVersion({
                platform: body.platform,
                versionName: body.versionName,
                versionCode: body.versionCode,
                apkUrl: body.apkUrl,
                apkSizeBytes: body.apkSizeBytes,
                checksumSha256: body.checksumSha256,
                releaseNotes: body.releaseNotes,
                forceUpdate: body.forceUpdate,
                minSupportedVersionCode: body.minSupportedVersionCode,
                isActive: body.isActive,
                file: req.file,
                req,
                uploadedBy,
            })

            res.status(HttpStatusCode.CREATED).json({
                success: true,
                message: 'App version created successfully',
                data: created,
            })
        } catch (error) {
            next(error)
        }
    },

    /** Admin — edit metadata. */
    updateVersion: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params
            const updated = await AppVersionService.updateVersion(id, req.body || {})
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'App version updated successfully',
                data: updated,
            })
        } catch (error) {
            next(error)
        }
    },

    /** Admin — explicitly mark a version as the live one. */
    setActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params
            const updated = await AppVersionService.setActive(id)
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'App version activated',
                data: updated,
            })
        } catch (error) {
            next(error)
        }
    },

    /** Admin — delete a version (and remove APK from Cloudinary if applicable). */
    deleteVersion: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params
            await AppVersionService.deleteVersion(id)
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'App version deleted successfully',
                data: null,
            })
        } catch (error) {
            next(error)
        }
    },
}
