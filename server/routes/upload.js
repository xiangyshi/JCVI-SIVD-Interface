/**
 * Upload Routes
 * API endpoints for file upload functionality
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const UploadController = require('../controllers/uploadController');
const config = require('../config');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const toolType = req.body.toolType || req.query.toolType;
        if (toolType && config.tools[toolType]) {
            const uploadPath = path.join(__dirname, '..', config.tools[toolType].inputDir);
            cb(null, uploadPath);
        } else {
            cb(null, config.upload.dest);
        }
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        cb(null, baseName + '_' + uniqueSuffix + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.upload.maxFileSize,
        files: config.upload.maxFiles
    },
    fileFilter: function (req, file, cb) {
        const toolType = req.body.toolType || req.query.toolType;
        
        if (!toolType || !config.tools[toolType]) {
            return cb(new Error('Invalid or missing tool type'), false);
        }
        
        const allowedExtensions = config.tools[toolType].allowedExtensions;
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
        }
    }
});

// File upload endpoint
router.post('/', upload.single('file'), UploadController.uploadFile);

// Combined upload and execute endpoint
router.post('/run-tool', upload.single('file'), UploadController.uploadAndRun);

// Get upload configuration
router.get('/config', UploadController.getUploadInfo);

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                maxSize: config.upload.maxFileSize
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Too many files',
                maxFiles: config.upload.maxFiles
            });
        }
    }
    
    res.status(400).json({
        success: false,
        error: error.message || 'Upload error'
    });
});

module.exports = router;
