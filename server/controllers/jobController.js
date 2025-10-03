/**
 * Job Controller
 * Handles job-related business logic
 */

const JobManager = require('../utils/jobManager');
const FileUtils = require('../utils/fileUtils');
const config = require('../config');
const path = require('path');
const fs = require('fs');

class JobController {
    /**
     * Create a new job
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async createJob(req, res) {
        try {
            const { toolType, filePath, parameters, jobName } = req.body;
            
            if (!config.tools[toolType]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid tool type: ${toolType}`
                });
            }
            
            const fileInfo = {
                path: filePath,
                name: path.basename(filePath)
            };
            
            const job = JobManager.createJob(toolType, fileInfo, parameters, jobName);
            
            console.log(`Job ${job.id} created for ${toolType}`);
            
            res.json({
                success: true,
                job: {
                    id: job.id,
                    tool: job.tool,
                    status: job.status,
                    jobName: job.jobName,
                    createdAt: job.createdAt
                }
            });
        } catch (error) {
            console.error('Job creation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create job',
                details: error.message
            });
        }
    }

    /**
     * Get job status by ID (filesystem-based)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            
            // Find job in filesystem across all tools
            const allJobs = JobManager.getAllJobs();
            const job = allJobs.find(j => j.id === jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            res.json({
                success: true,
                job,
                result: null // Results are in filesystem files
            });
        } catch (error) {
            console.error('Get job status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get job status',
                details: error.message
            });
        }
    }

    /**
     * Get all jobs
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getAllJobs(req, res) {
        try {
            const { tool, status, limit = 50 } = req.query;
            
            const filters = {
                tool,
                status,
                limit
            };
            
            let jobsList = JobManager.getAllJobs(filters);
            jobsList = jobsList.filter(job => job.id !== 'seqs');
            const stats = JobManager.getJobStats();
            
            res.json({
                success: true,
                jobs: jobsList,
                total: stats.total,
                stats
            });
        } catch (error) {
            console.error('Get all jobs error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get jobs',
                details: error.message
            });
        }
    }

    /**
     * Delete job (filesystem-based)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async deleteJob(req, res) {
        try {
            const { jobId } = req.params;
            const fs = require('fs');
            const path = require('path');
            const { exec } = require('child_process');
            
            // Find and delete job directory from filesystem
            const possibleJobDirs = [
                `/data/zqjd/containers/colabfold/output/${jobId}`,
                `/data/zqjd/containers/foldseek/output/${jobId}`,
                `/data/zqjd/containers/proteinmpnn/output/${jobId}`,
                `/data/zqjd/containers/haddock/output/${jobId}`
            ];
            
            let jobDir = null;
            for (const dir of possibleJobDirs) {
                if (fs.existsSync(dir)) {
                    jobDir = dir;
                    break;
                }
            }
            
            if (!jobDir) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            // Use sudo to remove the job directory (same pattern as other deletion functions)
            exec(`sudo rm -rf "${jobDir}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error deleting job ${jobId}:`, error);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to delete job',
                        details: error.message
                    });
                }
                
                console.log(`Deleted job directory: ${jobDir}`);
                res.json({
                    success: true,
                    message: 'Job deleted successfully'
                });
            });
            
        } catch (error) {
            console.error('Delete job error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete job',
                details: error.message
            });
        }
    }

    /**
     * Get job statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getJobStats(req, res) {
        try {
            const stats = JobManager.getJobStats();
            
            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Get job stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get job statistics',
                details: error.message
            });
        }
    }

    /**
     * Download a specific file from a job
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async downloadJobFile(req, res) {
        try {
            const { jobId, filename } = req.params;
            
            // Find the job to get its output path
            const allJobs = JobManager.getAllJobs();
            const job = allJobs.find(j => j.id === jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            // Construct the full file path
            const filePath = path.join(job.outputPath, filename);
            
            // Check if file exists
            if (!require('fs').existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'File not found'
                });
            }
            
            // Check if file is downloadable (security check)
            const files = JobManager.getJobFiles(job.outputPath);
            const fileInfo = files.find(f => f.name === filename);
            
            if (!fileInfo || !fileInfo.isDownloadable) {
                return res.status(403).json({
                    success: false,
                    error: 'File not available for download'
                });
            }
            
            // Set headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            
            // Stream the file
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
            
        } catch (error) {
            console.error('Download job file error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to download file',
                details: error.message
            });
        }
    }

    /**
     * Download all files from a job as a zip archive
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async downloadAllJobFiles(req, res) {
        try {
            const { jobId } = req.params;
            
            // Find the job to get its output path
            const allJobs = JobManager.getAllJobs();
            const job = allJobs.find(j => j.id === jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            // Get all downloadable files from the job
            const files = JobManager.getJobFiles(job.outputPath);
            const downloadableFiles = files.filter(f => f.isDownloadable);
            
            if (downloadableFiles.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No downloadable files found for this job'
                });
            }
            
            // Create a zip file
            const archiver = require('archiver');
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });
            
            // Set headers for zip download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="job-${jobId}-results.zip"`);
            
            // Pipe archive to response
            archive.pipe(res);
            
            // Add each downloadable file to the archive
            for (const file of downloadableFiles) {
                const filePath = path.join(job.outputPath, file.name);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, { name: file.name });
                }
            }
            
            // Finalize the archive
            await archive.finalize();
            
        } catch (error) {
            console.error('Download all job files error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create zip archive',
                details: error.message
            });
        }
    }

    /**
     * Clear a specific job folder
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async clearJobFolder(req, res) {
        try {
            const { jobId } = req.params;
            
            // Find the job to get its tool type and output path
            const allJobs = JobManager.getAllJobs();
            const job = allJobs.find(j => j.id === jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            const jobPath = job.outputPath;
            
            // Check if job directory exists
            if (!fs.existsSync(jobPath)) {
                return res.status(404).json({
                    success: false,
                    error: 'Job directory not found'
                });
            }
            
            // Use sudo to remove the job directory
            const { exec } = require('child_process');
            exec(`sudo rm -rf "${jobPath}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error clearing job folder ${jobId}:`, error);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to clear job folder',
                        details: error.message
                    });
                }
                
                console.log(`Job folder cleared: ${jobPath}`);
                res.json({
                    success: true,
                    message: `Job folder ${jobId} cleared successfully`,
                    clearedPath: jobPath
                });
            });
            
        } catch (error) {
            console.error('Clear job folder error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear job folder',
                details: error.message
            });
        }
    }

    /**
     * Clear all job folders for a specific tool
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async clearAllToolJobs(req, res) {
        try {
            const { toolType } = req.params;
            
            // Validate tool type
            if (!config.tools[toolType]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid tool type: ${toolType}`
                });
            }
            
            const toolOutputPath = path.join('/data/zqjd/containers', toolType, 'output');
            
            if (!fs.existsSync(toolOutputPath)) {
                return res.status(404).json({
                    success: false,
                    error: `Tool output directory not found: ${toolOutputPath}`
                });
            }
            
            // Get all job directories for this tool
            const jobDirs = fs.readdirSync(toolOutputPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            if (jobDirs.length === 0) {
                return res.json({
                    success: true,
                    message: `No job folders found for tool: ${toolType}`,
                    clearedCount: 0
                });
            }
            
            // Use sudo to remove all job directories
            const { exec } = require('child_process');
            const jobPaths = jobDirs.map(jobId => path.join(toolOutputPath, jobId));
            const rmCommand = `sudo rm -rf ${jobPaths.map(p => `"${p}"`).join(' ')}`;
            
            exec(rmCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error clearing tool jobs for ${toolType}:`, error);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to clear tool job folders',
                        details: error.message
                    });
                }
                
                console.log(`Cleared ${jobDirs.length} job folders for tool: ${toolType}`);
                res.json({
                    success: true,
                    message: `Cleared all job folders for tool: ${toolType}`,
                    clearedCount: jobDirs.length,
                    clearedPaths: jobPaths
                });
            });
            
        } catch (error) {
            console.error('Clear all tool jobs error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear tool job folders',
                details: error.message
            });
        }
    }

    /**
     * Clear all job folders across all tools
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async clearAllJobs(req, res) {
        try {
            const containersPath = '/data/zqjd/containers';
            const toolDirs = fs.readdirSync(containersPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            let totalCleared = 0;
            const clearedPaths = [];
            
            // Process each tool
            for (const tool of toolDirs) {
                const toolOutputPath = path.join(containersPath, tool, 'output');
                
                if (fs.existsSync(toolOutputPath)) {
                    const jobDirs = fs.readdirSync(toolOutputPath, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => dirent.name);
                    
                    if (jobDirs.length > 0) {
                        const jobPaths = jobDirs.map(jobId => path.join(containersPath, tool, 'output', jobId));
                        clearedPaths.push(...jobPaths);
                        totalCleared += jobDirs.length;
                    }
                }
            }
            
            if (totalCleared === 0) {
                return res.json({
                    success: true,
                    message: 'No job folders found to clear',
                    clearedCount: 0
                });
            }
            
            // Use sudo to remove all job directories
            const { exec } = require('child_process');
            const rmCommand = `sudo rm -rf ${clearedPaths.map(p => `"${p}"`).join(' ')}`;
            
            exec(rmCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error clearing all jobs:', error);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to clear all job folders',
                        details: error.message
                    });
                }
                
                console.log(`Cleared ${totalCleared} job folders across all tools`);
                res.json({
                    success: true,
                    message: `Cleared all job folders across all tools`,
                    clearedCount: totalCleared,
                    clearedPaths: clearedPaths
                });
            });
            
        } catch (error) {
            console.error('Clear all jobs error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear all job folders',
                details: error.message
            });
        }
    }
}

module.exports = JobController;
