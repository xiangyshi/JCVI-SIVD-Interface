/**
 * Upload Controller
 * Handles file upload and processing logic
 */

const JobManager = require('../utils/jobManager');
const FileUtils = require('../utils/fileUtils');
const ExecutionManager = require('../utils/executionManager');
const config = require('../config');
const path = require('path');

class UploadController {
    /**
     * Handle file upload
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async uploadFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }
            
            const toolType = req.body.toolType;
            const jobName = req.body.jobName;
            
            if (!toolType || !config.tools[toolType]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid tool type: ${toolType}`
                });
            }
            
            const fileInfo = {
                originalName: req.file.originalname,
                filename: req.file.filename,
                path: req.file.path,
                size: req.file.size,
                uploadedAt: new Date()
            };
            
            // Validate file extension
            const allowedExtensions = config.tools[toolType].allowedExtensions;
            const fileExtension = path.extname(req.file.originalname).toLowerCase();
            
            if (!allowedExtensions.includes(fileExtension)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid file type. Allowed extensions: ${allowedExtensions.join(', ')}`
                });
            }
            
            res.json({
                success: true,
                message: 'File uploaded successfully',
                file: {
                    originalName: fileInfo.originalName,
                    size: FileUtils.formatFileSize(fileInfo.size),
                    path: fileInfo.path,
                    uploadedAt: fileInfo.uploadedAt
                },
                toolType,
                jobName: jobName
            });
            
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                error: 'File upload failed',
                details: error.message
            });
        }
    }

    /**
     * Handle combined upload and job execution
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async uploadAndRun(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }
            
            const toolType = req.body.toolType;
            const jobName = req.body.jobName;
            const parameters = JSON.parse(req.body.parameters || '{}');
            
            // Debug logging
            console.log('DEBUG Upload Controller:');
            console.log('  jobName:', jobName);
            console.log('  req.body:', req.body);
            console.log('  req.query:', req.query);
            console.log('  toolType extracted:', toolType);
            console.log('  available tools:', Object.keys(config.tools));
            
            if (!toolType) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or missing tool type'
                });
            }
            
            if (!config.tools[toolType]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid tool type: ${toolType}`
                });
            }
            
            // Validate file extension
            const allowedExtensions = config.tools[toolType].allowedExtensions;
            const fileExtension = path.extname(req.file.originalname).toLowerCase();
            
            if (!allowedExtensions.includes(fileExtension)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid file type. Allowed extensions: ${allowedExtensions.join(', ')}`
                });
            }
            
            // Move file to tool-specific directory
            const fs = require('fs').promises;
            const toolInputDir = path.join(__dirname, '..', config.tools[toolType].inputDir);
            const finalPath = path.join(toolInputDir, req.file.filename);
            
            try {
                // Ensure the tool input directory exists
                await fs.mkdir(toolInputDir, { recursive: true });
                // Move file from uploads to tool-specific directory
                await fs.rename(req.file.path, finalPath);
            } catch (error) {
                console.error('Error moving file to tool directory:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to move file to tool directory'
                });
            }
            
            const fileInfo = {
                originalName: req.file.originalname,
                filename: req.file.filename,
                path: finalPath, // Use the final path in the tool directory
                size: req.file.size,
                uploadedAt: new Date()
            };
            
            // Create job
            const job = JobManager.createJob(toolType, fileInfo, parameters, jobName);
            
            console.log(`Combined job ${job.id} created: upload + ${toolType} execution`);
            
            // Execute job immediately
            setImmediate(() => {
                ExecutionManager.executeToolCommand(job);
            });
            
            res.json({
                success: true,
                message: 'File uploaded and job started successfully',
                job: {
                    id: job.id,
                    tool: job.tool,
                    status: job.status,
                    jobName: job.jobName,
                    createdAt: job.createdAt
                },
                file: {
                    originalName: fileInfo.originalName,
                    size: FileUtils.formatFileSize(fileInfo.size)
                }
            });
            
        } catch (error) {
            console.error('Upload and run error:', error);
            res.status(500).json({
                success: false,
                error: 'Upload and job creation failed',
                details: error.message
            });
        }
    }

    /**
     * Get upload status or information
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async getUploadInfo(req, res) {
        try {
            const uploadConfig = {
                maxFileSize: FileUtils.formatFileSize(config.upload.maxFileSize),
                maxFiles: config.upload.maxFiles,
                allowedTools: Object.keys(config.tools),
                toolConfigurations: {}
            };
            
            // Add tool-specific upload configs
            Object.entries(config.tools).forEach(([toolName, toolConfig]) => {
                uploadConfig.toolConfigurations[toolName] = {
                    name: toolConfig.name,
                    allowedExtensions: toolConfig.allowedExtensions,
                    maxFileSize: FileUtils.formatFileSize(toolConfig.maxFileSize)
                };
            });
            
            res.json({
                success: true,
                uploadConfig
            });
            
        } catch (error) {
            console.error('Get upload info error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get upload information',
                details: error.message
            });
        }
    }
}

module.exports = UploadController;
