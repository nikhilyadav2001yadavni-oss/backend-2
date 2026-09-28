import mongoose from 'mongoose'

export interface SystemConfig {
    _id: string
    platformName: string
    logo?: string | null
    darkMode: boolean
    pushNotification: boolean
    twoFA: boolean
    biometricLogin: boolean
    maintenance: boolean
    maintenanceMessage?: string | null
    supportEmail: string
    websiteDomain?: string | null
    createdAt: Date
    updatedAt: Date
}

const systemConfigSchema = new mongoose.Schema(
    {
        platformName: {
            type: String,
            required: true,
            default: 'Winvest',
            trim: true,
        },
        logo: {
            type: String,
            default: null,
            trim: true,
        },
        darkMode: {
            type: Boolean,
            required: true,
            default: false,
        },
        pushNotification: {
            type: Boolean,
            required: true,
            default: true,
        },
        twoFA: {
            type: Boolean,
            required: true,
            default: false,
        },
        biometricLogin: {
            type: Boolean,
            required: true,
            default: false,
        },
        maintenance: {
            type: Boolean,
            required: true,
            default: false,
        },
        maintenanceMessage: {
            type: String,
            default: null,
            trim: true,
        },
        supportEmail: {
            type: String,
            required: true,
            default: 'support@winvest.com',
            trim: true,
        },
        websiteDomain: {
            type: String,
            default: null,
            trim: true,
        },
    },
    { timestamps: true }
)

// Note: MongoDB automatically creates a unique index on _id, so we don't need to create one
// To ensure only one system config document exists, we'll handle it in the service layer

const SystemConfig = mongoose.model<SystemConfig & mongoose.Document>('SystemConfig', systemConfigSchema)

// Seed default system configuration if it doesn't exist; backfill supportEmail on existing docs
export const seedDefaultSystemConfig = async (): Promise<void> => {
    try {
        const count = await SystemConfig.countDocuments()
        if (count === 0) {
            const defaultConfig = new SystemConfig({
                platformName: 'Winvest',
                logo: null,
                darkMode: false,
                pushNotification: true,
                twoFA: false,
                biometricLogin: false,
                maintenance: false,
                maintenanceMessage: null,
                supportEmail: 'support@winvest.com',
                websiteDomain: null,
            })
            await defaultConfig.save()
            console.log('Default system configuration seeded successfully')
        } else {
            // Backfill new fields for existing configs that don't have them
            const updates: any = {}
            const config = await SystemConfig.findOne()
            if (config) {
                if (!config.platformName) updates.platformName = 'Winvest'
                if (config.logo === undefined) updates.logo = null
                if (!config.supportEmail) updates.supportEmail = 'support@winvest.com'
                if (config.websiteDomain === undefined) updates.websiteDomain = null

                if (Object.keys(updates).length > 0) {
                    await SystemConfig.updateOne({}, { $set: updates })
                }
            }
        }
    } catch (error: any) {
        console.error('Error seeding default system configuration:', error.message)
    }
}

export default SystemConfig
