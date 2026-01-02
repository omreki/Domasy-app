const multer = require('multer');
const path = require('path');

// Configure storage: memoryStorage is better for cloud storage (Supabase/Firebase) 
// and required for serverless environments like Vercel.
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|png|jpg|jpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed: PDF, DOC, XLS, PPT, TXT, PNG, JPG'));
    }
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 26214400 // 25MB default
    },
    fileFilter: fileFilter
});

module.exports = upload;
