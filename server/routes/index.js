/**
 * Routes Index
 * Central routing configuration
 */

const express = require('express');
const router = express.Router();

// Import route modules
const jobRoutes = require('./jobs');

const uploadRoutes = require('./upload');
const fileRoutes = require('./files');

// Import upload controller and middleware for direct access
const UploadController = require('../controllers/uploadController');
const multer = require('multer');
const path = require('path');
const config = require('../config');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Protein Tools Server is running',
        timestamp: new Date().toISOString(),
        availableTools: ['proteinmpnn', 'colabfold', 'foldseek', 'haddock']
    });
});

// Mount route modules
router.use('/jobs', jobRoutes);
router.use('/job', jobRoutes); // Alias for backwards compatibility

router.use('/upload', uploadRoutes);
router.use('/files', fileRoutes);

// Configure multer for run-tool endpoint - use temporary storage first
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Always save to default upload directory first, then move later
        cb(null, config.upload.dest);
    },
    filename: function (req, file, cb) {
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
    }
});

// Direct mapping for run-tool endpoint
router.post('/run-tool', upload.single('file'), UploadController.uploadAndRun);

// API documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        success: true,
        apiVersion: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            jobs: {
                list: 'GET /api/jobs',
                create: 'POST /api/jobs/execute',
                status: 'GET /api/job/:jobId',
                delete: 'DELETE /api/jobs/:jobId',
                stats: 'GET /api/jobs/stats'
            },
            upload: {
                upload: 'POST /api/upload',
                runTool: 'POST /api/run-tool',
                config: 'GET /api/upload/config'
            },
            colabfold: {
                dashboard: 'GET /api/colabfold/dashboard',
                jobDetails: 'GET /api/colabfold/job/:jobId/details'
            },

            files: {
                download: 'GET /api/files/job/:jobId/download/:fileName',
                copyToPublic: 'POST /api/files/job/:jobId/copy/:fileName',
                preview: 'GET /api/files/job/:jobId/content/:fileName'
            }
        }
    });
});

module.exports = router;
