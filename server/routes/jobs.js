/**
 * Job Routes
 * API endpoints for job management
 */

const express = require('express');
const router = express.Router();
const JobController = require('../controllers/jobController');

// Job execution endpoint
router.post('/execute', JobController.createJob);

// Get all jobs
router.get('/', JobController.getAllJobs);

// Get job statistics
router.get('/stats', JobController.getJobStats);

// Download job file
router.get('/:jobId/download/:filename', JobController.downloadJobFile);

// Download all job files as zip
router.get('/:jobId/download-all', JobController.downloadAllJobFiles);

// Clear individual job folder
router.delete('/:jobId/clear', JobController.clearJobFolder);

// Get job status by ID
router.get('/:jobId', JobController.getJobStatus);

// Delete job
router.delete('/:jobId', JobController.deleteJob);

// Clear all job folders for a specific tool
router.delete('/tool/:toolType/clear-all', JobController.clearAllToolJobs);

// Clear all job folders across all tools
router.delete('/clear-all', JobController.clearAllJobs);

module.exports = router;
