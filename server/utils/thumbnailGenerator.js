const path = require('path');
const fs = require('fs');
let pdf;
try {
    pdf = require('pdf-poppler').pdf;
} catch (error) {
    console.warn('⚠️  pdf-poppler module not found or failed to load. PDF thumbnails will be disabled.');
}
const supabase = require('../config/supabase');

/**
 * Generates a thumbnail for a PDF file
 * @param {Object} file - The file object from multer
 * @returns {Promise<string|null>} - The URL of the uploaded thumbnail or null
 */
const generateThumbnail = async (file) => {
    if (!pdf) {
        console.warn('Skipping thumbnail generation: pdf-poppler not available');
        return null;
    }
    try {
        console.log(`Generating thumbnail for: ${file.path}`);

        const outputDir = path.dirname(file.path);
        const outputName = `${path.basename(file.filename, path.extname(file.filename))}-thumb`;

        const options = {
            format: 'png',
            out_dir: outputDir,
            out_prefix: outputName,
            page: 1,
            scale: 600 // High quality
        };

        await pdf.convert(file.path, options);

        // Find the generated file (it appends -1.png)
        const generatedFile = path.join(outputDir, `${outputName}-1.png`);

        if (fs.existsSync(generatedFile)) {
            console.log(`Thumbnail generated at: ${generatedFile}`);

            // Upload to Supabase Storage
            const thumbnailFileName = `thumbnails/${path.basename(file.filename)}.png`;
            const fileContent = fs.readFileSync(generatedFile);

            const { data, error } = await supabase.storage
                .from('documents') // Assuming same bucket, or use 'thumbnails' bucket if exists
                .upload(thumbnailFileName, fileContent, {
                    contentType: 'image/png',
                    upsert: true
                });

            // Cleanup local thumbnail
            fs.unlinkSync(generatedFile);

            if (error) {
                console.error('Thumbnail upload error:', error);
                return null;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(thumbnailFileName);

            return publicUrl;
        } else {
            console.warn('Thumbnail generation failed: Output file not found');
            return null;
        }
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        return null;
    }
};

module.exports = { generateThumbnail };
