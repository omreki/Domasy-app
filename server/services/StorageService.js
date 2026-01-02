const supabase = require('../config/supabase');
const fs = require('fs');

class StorageService {
    /**
     * Upload a file to a specific bucket
     * @param {Object} file - Multer file object
     * @param {string} bucket - Storage bucket name
     * @param {string} folder - Folder within the bucket
     * @returns {string} - Public URL of the uploaded file
     */
    static async uploadFile(file, bucket = 'documents', folder = 'uploads') {
        if (!file) return null;

        try {
            const fileContent = fs.readFileSync(file.path);
            const fileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const storagePath = folder ? `${folder}/${fileName}` : fileName;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(storagePath, fileContent, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (error) throw error;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(storagePath);

            // Cleanup local file
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            return publicUrl;
        } catch (error) {
            console.error(`Storage upload failed [${bucket}]:`, error);
            // Cleanup local file on error
            if (file && file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            throw error;
        }
    }

    /**
     * Delete a file from storage
     * @param {string} fileUrl - Full public URL of the file
     * @param {string} bucket - Storage bucket name
     */
    static async deleteFile(fileUrl, bucket = 'documents') {
        if (!fileUrl) return;

        try {
            // Extract path from URL (Supabase URL pattern: .../bucket/object_path)
            const urlParts = fileUrl.split(`${bucket}/`);
            if (urlParts.length < 2) return;

            const storagePath = urlParts[1];

            const { error } = await supabase.storage
                .from(bucket)
                .remove([storagePath]);

            if (error) throw error;
        } catch (error) {
            console.error(`Storage delete failed [${bucket}]:`, error);
        }
    }
}

module.exports = StorageService;
