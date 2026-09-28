import { uploadImageToCloudinary as uploadToCloudinary } from '../utils/uploadHelper'

export default {
    /**
     * Process image URL (for direct Cloudinary URLs)
     * Multer upload function is kept in uploadHelper.ts for future use
     */
    processImageUrl: async (imageUrl: string): Promise<{ url: string; secure_url?: string }> => {
        // Since images are directly uploaded to Cloudinary, just return the URL
        // The multer upload function is available in uploadHelper.ts for future file uploads
        return {
            url: imageUrl,
            secure_url: imageUrl.startsWith('https') ? imageUrl : imageUrl.replace('http://', 'https://'),
        }
    },
    /**
     * Upload image to Cloudinary using multer file (kept for future use)
     * This function uses the multer helper from uploadHelper.ts
     */
    uploadImageToCloudinary: async (
        file: Express.Multer.File,
        folder?: string,
        publicId?: string
    ): Promise<{ url: string; public_id: string; secure_url: string }> => {
        return await uploadToCloudinary(file, folder, publicId)
    },
}
