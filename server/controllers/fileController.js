/**
 * File Controller
 * Handles file serving and management for job results
 */

const JobManager = require('../utils/jobManager');
const fs = require('fs');
const path = require('path');

class FileController {
    /**
     * Serve a file from a job directory
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async serveJobFile(req, res) {
        try {
            const { jobId, fileName } = req.params;
            
            // Find the job across all tools
            const allJobs = JobManager.getAllJobs();
            const job = allJobs.find(j => j.id === jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            // Construct file path
            const filePath = path.join(job.outputPath, fileName);
            
            // Security check - ensure file is within job directory
            if (!filePath.startsWith(job.outputPath)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'File not found'
                });
            }
            
            // Check if file is downloadable
            if (!JobManager.isDownloadableFile(fileName)) {
                return res.status(403).json({
                    success: false,
                    error: 'File not downloadable'
                });
            }
            
            // Get file stats
            const stats = fs.statSync(filePath);
            
            // Set appropriate headers
            const ext = path.extname(fileName).toLowerCase();
            const mimeTypes = {
                '.txt': 'text/plain',
                '.tsv': 'text/tab-separated-values',
                '.csv': 'text/csv',
                '.json': 'application/json',
                '.pdb': 'chemical/x-pdb',
                '.fasta': 'text/plain',
                '.fa': 'text/plain',
                '.log': 'text/plain'
            };
            
            const mimeType = mimeTypes[ext] || 'application/octet-stream';
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Cache-Control', 'no-cache');
            
            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
            fileStream.on('error', (error) => {
                console.error('File stream error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error reading file'
                });
            });
            
        } catch (error) {
            console.error('Serve file error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to serve file',
                details: error.message
            });
        }
    }

    /**
     * Copy a file to the frontend public folder for web access
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async copyToPublic(req, res) {
        try {
            const { jobId, fileName } = req.params;
            
            // Find the job across all tools
            const allJobs = JobManager.getAllJobs();
            const job = allJobs.find(j => j.id === jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            // Construct source file path
            const sourcePath = path.join(job.outputPath, fileName);
            
            // Security check - ensure file is within job directory
            if (!sourcePath.startsWith(job.outputPath)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }
            
            // Check if file exists
            if (!fs.existsSync(sourcePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'File not found'
                });
            }
            
            // Check if file is downloadable
            if (!JobManager.isDownloadableFile(fileName)) {
                return res.status(403).json({
                    success: false,
                    error: 'File not accessible'
                });
            }
            
            // Create public directory path (assuming frontend public folder)
            const publicDir = path.join(__dirname, '../../zqjd77/public/job-files');
            const jobPublicDir = path.join(publicDir, jobId);
            
            // Ensure directories exist
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true });
            }
            if (!fs.existsSync(jobPublicDir)) {
                fs.mkdirSync(jobPublicDir, { recursive: true });
            }
            
            // Destination path
            const destPath = path.join(jobPublicDir, fileName);
            
            // Copy file
            fs.copyFileSync(sourcePath, destPath);
            
            // Generate public URL
            const publicUrl = `/public/job-files/${jobId}/${fileName}`;
            
            res.json({
                success: true,
                message: 'File copied to public folder',
                publicUrl: publicUrl,
                fileName: fileName,
                jobId: jobId
            });
            
        } catch (error) {
            console.error('Copy to public error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to copy file to public folder',
                details: error.message
            });
        }
    }

    /**
     * Get file content as text (for preview)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getFileContent(req, res) {
        try {
            const { jobId, fileName } = req.params;
            const { maxLines = 100 } = req.query;
            
            // Find the job across all tools
            const allJobs = JobManager.getAllJobs();
            const job = allJobs.find(j => j.id === jobId);
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }
            
            // Construct file path
            const filePath = path.join(job.outputPath, fileName);
            
            // Security check
            if (!filePath.startsWith(job.outputPath)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'File not found'
                });
            }
            
            // Read file content (limited for large files)
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const limitedLines = lines.slice(0, parseInt(maxLines));
            const isLimited = lines.length > parseInt(maxLines);
            
            res.json({
                success: true,
                content: limitedLines.join('\n'),
                totalLines: lines.length,
                displayedLines: limitedLines.length,
                isLimited: isLimited,
                fileName: fileName
            });
            
        } catch (error) {
            console.error('Get file content error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to read file content',
                details: error.message
            });
        }
    }
}

module.exports = FileController;
