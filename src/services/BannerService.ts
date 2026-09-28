import { createBadRequestError, createNotFoundError } from '../middleware/authentication'
import Banner from '../models/BannerModel'
import mongoose from 'mongoose'

export default {
    createBanner: async (
        title: string,
        description: string,
        imageUrl?: string,
        link?: string,
        isActive: boolean = true,
        order: number = 0
    ): Promise<any> => {
        try {
            const banner = new Banner({
                title,
                description,
                imageUrl: imageUrl || null,
                link: link || null,
                isActive,
                order,
            })

            await banner.save()
            return banner
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to create banner')
        }
    },

    updateBanner: async (
        bannerId: string,
        title?: string,
        description?: string,
        imageUrl?: string,
        link?: string,
        isActive?: boolean,
        order?: number
    ): Promise<any> => {
        try {
            const banner = await Banner.findById(bannerId)

            if (!banner) {
                throw createNotFoundError('Banner not found')
            }

            // Update only provided fields
            if (title !== undefined) banner.title = title
            if (description !== undefined) banner.description = description
            if (imageUrl !== undefined) {
                banner.imageUrl = imageUrl || null
            }
            if (link !== undefined) {
                banner.link = link || null
            }
            if (isActive !== undefined) banner.isActive = isActive
            if (order !== undefined) banner.order = order

            await banner.save()
            return banner
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to update banner')
        }
    },

    deleteBanner: async (bannerId: string): Promise<void> => {
        try {
            const banner = await Banner.findById(bannerId)

            if (!banner) {
                throw createNotFoundError('Banner not found')
            }

            await Banner.findByIdAndDelete(bannerId)
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to delete banner')
        }
    },

    getBannerById: async (bannerId: string): Promise<any> => {
        try {
            const banner = await Banner.findById(bannerId)

            if (!banner) {
                throw createNotFoundError('Banner not found')
            }

            return banner
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch banner')
        }
    },

    getAllBanners: async (activeOnly: boolean = false): Promise<any[]> => {
        try {
            const filter: any = {}
            if (activeOnly) {
                filter.isActive = true
            }

            const banners = await Banner.find(filter)
                .sort({ order: 1, createdAt: -1 }) // Sort by order (ascending), then by creation date (descending)
                .lean()

            return banners
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch banners')
        }
    },
}
