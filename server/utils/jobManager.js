/**
 * Job Management Utilities
 * Handles job creation for bioinformatics tools
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class JobManager {
    /**
     * Create a new job
     * @param {string} toolType - The tool type (e.g., 'colabfold', 'blast', etc.)
     * @param {Object} fileInfo - File information
     * @param {Object} parameters - Job parameters
     * @param {string} jobName - Optional job name
     * @returns {Object} Created job object
     */
    static createJob(toolType, fileInfo, parameters = {}, jobName = null) {
        const jobId = uuidv4();
        const job = {
            id: jobId,
            tool: toolType,
            status: 'queued',
            file: fileInfo,
            parameters: parameters,
            jobName: jobName || fileInfo.originalName || 'Unnamed Job',
            createdAt: new Date(),
            startedAt: null,
            completedAt: null,
            error: null,
            progress: 0,
            outputFiles: []
        };
        
        // Persist job metadata to filesystem so it can be recovered by scanners
        try {
            const jobDir = path.join('/data/zqjd/containers', toolType, 'output', jobId);
            fs.mkdirSync(jobDir, { recursive: true });
            const metaPath = path.join(jobDir, `${jobId}_meta.json`);
            const meta = {
                id: job.id,
                jobName: job.jobName,
                tool: job.tool,
                parameters: job.parameters,
                file: {
                    originalName: job.file?.originalName
                },
                createdAt: job.createdAt
            };
            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        } catch (metaError) {
            console.warn('Failed to persist job metadata:', metaError.message);
        }

        return job;
    }

    /**
     * Get job status by checking the filesystem
     * @param {string} toolType - The tool type (e.g., 'colabfold', 'blast', etc.)
     * @param {string} jobId - The job ID
     * @returns {string} Job status ('completed', 'running', 'failed', or 'not_found')
     */
    static getJobStatus(toolType, jobId) {
        console.log('getJobStatus', toolType, jobId);
        try {
            // Construct path to job output directory
            const jobOutputDir = path.join('/data/zqjd/containers', toolType, 'output', jobId);
            
            // Check if the job directory exists
            if (!fs.existsSync(jobOutputDir)) {
                return 'not_found';
            }

            // Check for *.done.txt files
            const files = fs.readdirSync(jobOutputDir);
            const doneFiles = files.filter(file => file.endsWith('.done.txt'));
            const errorFiles = files.filter(file => file.endsWith('error.txt'));

            // If no done file exists, job is still running
            const logFiles = files.filter(file => file.endsWith('log.txt'));
            if (logFiles.length > 0) {
                const lines = fs.readFileSync(path.join(jobOutputDir, logFiles[0]), "utf-8").trim().split("\n");
                if (lines.at(-1).includes('Sleeping for')) {
                    return 'queued';
                }
            }
            
            if (errorFiles.length > 0) {
                return 'failed';
            }


            if (doneFiles.length > 0) {
                return 'completed';
            }

            return 'running';
            
        } catch (error) {
            console.error(`Error checking job status for ${toolType}/${jobId}:`, error);
            return 'failed';
        }
    }

    /**
     * Get all jobs across all tools by scanning the filesystem
     * @param {Object} filters - Optional filters
     * @param {string} filters.tool - Filter by specific tool
     * @param {string} filters.status - Filter by specific status
     * @param {number} filters.limit - Limit number of results
     * @returns {Array} Array of job objects with current status
     */
    static getAllJobs(filters = {}) {
        const jobs = [];
        const containersPath = '/data/zqjd/containers';
        
        try {
            // Get all available tools
            const toolDirs = fs.readdirSync(containersPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            // Filter by tool if specified
            const toolsToScan = filters.tool ? [filters.tool] : toolDirs;

            for (const tool of toolsToScan) {
                const outputPath = path.join(containersPath, tool, 'output');
                
                // Skip if output directory doesn't exist
                if (!fs.existsSync(outputPath)) {
                    continue;
                }

                // Get all job directories
                const jobDirs = fs.readdirSync(outputPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                for (const jobId of jobDirs) {
                    try {
                        // Get current status
                        const status = this.getJobStatus(tool, jobId);
                        
                        // Skip if status filter doesn't match
                        if (filters.status && status !== filters.status) {
                            continue;
                        }

                        // Get job directory stats for creation time
                        const jobPath = path.join(outputPath, jobId);
                        const stats = fs.statSync(jobPath);

                        // Get file listing from job directory
                        const files = this.getJobFiles(jobPath);

                        // Load metadata if present (to recover jobName and other info)
                        let jobNameFromMeta = null;
                        try {
                            const metaPath = path.join(jobPath, `${jobId}_meta.json`);
                            if (fs.existsSync(metaPath)) {
                                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                                jobNameFromMeta = meta.jobName || null;
                            }
                        } catch (e) {
                            // ignore meta read errors
                        }

                        // Create job object
                        const job = {
                            id: jobId,
                            tool: tool,
                            status: status,
                            jobName: jobNameFromMeta || `${tool}_${jobId.substring(0, 8)}`, // Use meta if available
                            createdAt: stats.birthtime || stats.ctime,
                            progress: status === 'completed' ? 100 : (status === 'running' ? 50 : 0),
                            outputPath: jobPath,
                            files: files
                        };

                        jobs.push(job);
                    } catch (error) {
                        console.error(`Error processing job ${tool}/${jobId}:`, error);
                    }
                }
            }

            // Sort by creation date (newest first)
            jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Apply limit if specified
            if (filters.limit) {
                return jobs.slice(0, parseInt(filters.limit));
            }

            return jobs;

        } catch (error) {
            console.error('Error scanning for jobs:', error);
            return [];
        }
    }

    /**
     * Get job statistics across all tools
     * @param {Object} filters - Optional filters
     * @param {string} filters.tool - Filter by specific tool
     * @returns {Object} Job statistics
     */
    static getJobStats(filters = {}) {
        try {
            const allJobs = this.getAllJobs(filters);
            
            const stats = {
                total: allJobs.length,
                running: 0,
                completed: 0,
                failed: 0,
                queued: 0,
                byTool: {}
            };

            // Count jobs by status
            allJobs.forEach(job => {
                const status = job.status;
                if (stats.hasOwnProperty(status)) {
                    stats[status]++;
                }

                // Count by tool
                if (!stats.byTool[job.tool]) {
                    stats.byTool[job.tool] = {
                        total: 0,
                        running: 0,
                        completed: 0,
                        failed: 0,
                        queued: 0
                    };
                }
                stats.byTool[job.tool].total++;
                if (stats.byTool[job.tool].hasOwnProperty(status)) {
                    stats.byTool[job.tool][status]++;
                }
            });

            return stats;

        } catch (error) {
            console.error('Error getting job stats:', error);
            return {
                total: 0,
                running: 0,
                completed: 0,
                failed: 0,
                queued: 0,
                byTool: {}
            };
        }
    }

    /**
     * Update job status and progress
     * Note: This is a placeholder method since we're using filesystem-based job tracking
     * @param {string} jobId - The job ID
     * @param {string} status - New status ('queued', 'running', 'completed', 'failed')
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} error - Error message if status is 'failed'
     */
    static updateJobStatus(jobId, status, progress = null, error = null) {
        try {
            // Since we're using filesystem-based job tracking, we'll log the status update
            // and rely on the .done.txt files and directory structure for actual status
            console.log(`Job ${jobId} status update: ${status}${progress !== null ? ` (${progress}%)` : ''}${error ? ` - Error: ${error}` : ''}`);
            
            // In a production system, you might want to:
            // 1. Write status to a job metadata file
            // 2. Update a database record
            // 3. Send notifications
            // 4. Update progress tracking files
            
            // For now, we'll create a simple status file in the job directory if possible
            const fs = require('fs');
            const path = require('path');
            
            // Try to find the job directory and write status
            const possibleJobDirs = [
                `/data/zqjd/containers/colabfold/output/${jobId}`,
                `/data/zqjd/containers/foldseek/output/${jobId}`,
                `/data/zqjd/containers/proteinmpnn/output/${jobId}`,
                `/data/zqjd/containers/haddock/output/${jobId}`
            ];
            
            for (const jobDir of possibleJobDirs) {
                if (fs.existsSync(jobDir)) {
                    const statusFile = path.join(jobDir, `${jobId}_status.json`);
                    const statusData = {
                        jobId,
                        status,
                        progress,
                        error,
                        lastUpdated: new Date().toISOString()
                    };
                    
                    try {
                        fs.writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
                        console.log(`Status written to: ${statusFile}`);
                    } catch (writeError) {
                        console.warn(`Could not write status file: ${writeError.message}`);
                    }
                    break;
                }
            }
            
        } catch (error) {
            console.error(`Error updating job status for ${jobId}:`, error);
        }
    }

    /**
     * Get file listing from job directory with metadata
     * @param {string} jobPath - Path to the job directory
     * @returns {Array} Array of file objects with metadata
     */
    static getJobFiles(jobPath) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            if (!fs.existsSync(jobPath)) {
                return [];
            }

            const files = fs.readdirSync(jobPath);
            const fileList = [];

            for (const fileName of files) {
                try {
                    const filePath = path.join(jobPath, fileName);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.isFile()) {
                        // Determine file type and category
                        const fileType = this.getFileType(fileName);
                        const fileCategory = this.getFileCategory(fileName);
                        
                        fileList.push({
                            name: fileName,
                            size: stats.size,
                            sizeFormatted: this.formatFileSize(stats.size),
                            type: fileType,
                            category: fileCategory,
                            createdAt: stats.birthtime || stats.ctime,
                            modifiedAt: stats.mtime,
                            isDownloadable: this.isDownloadableFile(fileName)
                        });
                    }
                } catch (fileError) {
                    console.warn(`Error reading file ${fileName}:`, fileError.message);
                }
            }

            // Sort files by category and name
            return fileList.sort((a, b) => {
                if (a.category !== b.category) {
                    const categoryOrder = ['results', 'status', 'logs', 'info', 'other'];
                    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
                }
                return a.name.localeCompare(b.name);
            });

        } catch (error) {
            console.error(`Error getting file list for ${jobPath}:`, error);
            return [];
        }
    }

    /**
     * Determine file type based on extension
     */
    static getFileType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const typeMap = {
            'tsv': 'tsv',
            'csv': 'csv', 
            'txt': 'text',
            'json': 'json',
            'log': 'log',
            'pdb': 'pdb',
            'fasta': 'fasta',
            'fa': 'fasta',
            'zip': 'archive',
            'tar': 'archive',
            'gz': 'archive'
        };
        return typeMap[ext] || 'unknown';
    }

    /**
     * Determine file category for organization
     */
    static getFileCategory(fileName) {
        if (fileName.includes('.done.txt')) return 'status';
        if (fileName.includes('_status.json')) return 'status';
        if (fileName.includes('_info.txt')) return 'info';
        if (fileName.includes('_fs.tsv') || fileName.includes('_results.')) return 'results';
        if (fileName.includes('.log') || fileName.includes('error')) return 'logs';
        return 'other';
    }

    /**
     * Format file size in human readable format
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Check if file is downloadable (exclude system files)
     */
    static isDownloadableFile(fileName) {
        // Don't allow downloading of system status files
        if (fileName.includes('_status.json')) return false;
        if (fileName.includes('.done.txt')) return false;
        return true;
    }
}

module.exports = JobManager;