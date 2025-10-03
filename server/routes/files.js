/**
 * File Routes
 * API endpoints for file serving and management
 */

const express = require('express');
const router = express.Router();
const FileController = require('../controllers/fileController');

// Serve/download a file from job directory
router.get('/job/:jobId/download/:fileName', FileController.serveJobFile);

// Copy file to public folder for web access
router.post('/job/:jobId/copy/:fileName', FileController.copyToPublic);

// Get file content for preview
router.get('/job/:jobId/content/:fileName', FileController.getFileContent);

module.exports = router;
