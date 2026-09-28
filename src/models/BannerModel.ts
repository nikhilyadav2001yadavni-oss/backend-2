import mongoose from 'mongoose'

export interface Banner {
    _id: string
    title: string
    description: string
    imageUrl?: string | null
    link?: string | null
    isActive: boolean
    order: number // For ordering banners (lower number = higher priority)
    createdAt: Date
    updatedAt: Date
}

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        imageUrl: {
            type: String,
            default: null,
            trim: true,
        },
        link: {
            type: String,
            default: null,
            trim: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
)

// Indexes for efficient querying
bannerSchema.index({ isActive: 1, order: 1 })
bannerSchema.index({ createdAt: -1 })

const Banner = mongoose.model<Banner & mongoose.Document>('Banner', bannerSchema)

export default Banner
