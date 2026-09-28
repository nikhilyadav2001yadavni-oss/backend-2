import { HttpStatusCode } from '../enums/App'
import { Request, Response } from 'express'
import HelperService from '../services/HelperService'

export default {
    uploadImage: async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'No image file provided. Please ensure the file field is named "image"',
                    data: null,
                })
                return
            }

            // Remove quotes from folder if present
            let folder = req.body.folder || 'general'
            if (typeof folder === 'string') {
                folder = folder.replace(/^["']|["']$/g, '')
            }
            const publicId = req.body.publicId ? req.body.publicId.replace(/^["']|["']$/g, '') : undefined

            const uploadResult = await HelperService.uploadImageToCloudinary(
                req.file,
                folder,
                publicId
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    url: uploadResult.url,
                    secure_url: uploadResult.secure_url,
                    public_id: uploadResult.public_id,
                },
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Failed to upload image',
                data: null,
            })
        }
    },
}
