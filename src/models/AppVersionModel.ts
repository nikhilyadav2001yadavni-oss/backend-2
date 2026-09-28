import mongoose from 'mongoose'

export const APP_VERSION_PLATFORMS = ['android', 'ios'] as const
export type AppVersionPlatform = typeof APP_VERSION_PLATFORMS[number]

export interface AppVersion {
    _id: string
    platform: AppVersionPlatform
    versionName: string
    versionCode: number
    apkUrl: string
    apkFilename?: string | null // local filename inside public/apks for cleanup; null if URL was supplied externally
    apkSizeBytes?: number | null
    checksumSha256?: string | null
    releaseNotes?: string | null
    forceUpdate: boolean
    minSupportedVersionCode?: number | null
    isActive: boolean
    uploadedBy?: {
        adminId?: string | null
        name?: string | null
        email?: string | null
    } | null
    createdAt: Date
    updatedAt: Date
}

const appVersionSchema = new mongoose.Schema(
    {
        platform: {
            type: String,
            enum: APP_VERSION_PLATFORMS,
            required: true,
            default: 'android',
            index: true,
        },
        versionName: {
            type: String,
            required: true,
            trim: true,
        },
        versionCode: {
            type: Number,
            required: true,
            min: 1,
        },
        apkUrl: {
            type: String,
            required: true,
            trim: true,
        },
        apkFilename: {
            type: String,
            default: null,
            trim: true,
        },
        apkSizeBytes: {
            type: Number,
            default: null,
        },
        checksumSha256: {
            type: String,
            default: null,
            trim: true,
        },
        releaseNotes: {
            type: String,
            default: null,
            trim: true,
        },
        forceUpdate: {
            type: Boolean,
            required: true,
            default: false,
        },
        minSupportedVersionCode: {
            type: Number,
            default: null,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
            index: true,
        },
        uploadedBy: {
            adminId: { type: String, default: null },
            name: { type: String, default: null },
            email: { type: String, default: null },
        },
    },
    { timestamps: true }
)

// Same versionCode shouldn't repeat per platform.
appVersionSchema.index({ platform: 1, versionCode: -1 }, { unique: true })
appVersionSchema.index({ platform: 1, isActive: 1, versionCode: -1 })
appVersionSchema.index({ createdAt: -1 })

const AppVersion = mongoose.model<AppVersion & mongoose.Document>('AppVersion', appVersionSchema)

export default AppVersion
