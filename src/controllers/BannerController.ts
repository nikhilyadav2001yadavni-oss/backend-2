import { HttpStatusCode } from '../enums/App'
import { Request, Response } from 'express'
import BannerService from '../services/BannerService'

export default {
    createBanner: async (req: Request, res: Response): Promise<void> => {
        try {
            const { title, description, imageUrl, link, isActive, order } = req.body

            // Validate required fields
            if (!title || !description) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Title and description are required',
                    data: null,
                })
                return
            }

            // Create banner
            const banner = await BannerService.createBanner(
                title,
                description,
                imageUrl,
                link,
                isActive !== undefined ? isActive : true,
                order !== undefined ? order : 0
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Banner created successfully',
                data: banner,
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    updateBanner: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params
            const { title, description, imageUrl, link, isActive, order } = req.body

            if (!id) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Banner ID is required',
                    data: null,
                })
                return
            }

            // Update banner
            const banner = await BannerService.updateBanner(
                id,
                title,
                description,
                imageUrl,
                link,
                isActive,
                order
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Banner updated successfully',
                data: banner,
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    deleteBanner: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params

            if (!id) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Banner ID is required',
                    data: null,
                })
                return
            }

            await BannerService.deleteBanner(id)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Banner deleted successfully',
                data: null,
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    getBannerById: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params

            if (!id) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Banner ID is required',
                    data: null,
                })
                return
            }

            const banner = await BannerService.getBannerById(id)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Banner fetched successfully',
                data: banner,
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    getAllBanners: async (req: Request, res: Response): Promise<void> => {
        try {
            const activeOnly = req.query.activeOnly === 'true'

            const banners = await BannerService.getAllBanners(activeOnly)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Banners fetched successfully',
                data: banners,
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
}
