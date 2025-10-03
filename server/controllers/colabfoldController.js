/**
 * Simplified ColabFold Controller
 * Focuses on real-time directory scanning for ColabFold jobs
 */

const JobManager = require('../utils/jobManager');
const FileUtils = require('../utils/fileUtils');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

class ColabFoldController {
    /**
     * Get ColabFold dashboard with real-time directory scanning
     */
    static async getDashboard(req, res) {
        try {
            const colabfoldOutputDir = path.join(__dirname, '../../containers/colabfold/output');
            
            // Ensure output directory exists
            try {
                await fs.access(colabfoldOutputDir);
            } catch (error) {
                await fs.mkdir(colabfoldOutputDir, { recursive: true });
            }
            
            // Get all directories in the output folder
            const entries = await fs.readdir(colabfoldOutputDir, { withFileTypes: true });
            const directories = entries.filter(entry => entry.isDirectory());
            
            const jobs = [];
            
            for (const dir of directories) {
                const jobId = dir.name;
                const jobDir = path.join(colabfoldOutputDir, jobId);
                
                try {
                    // Get directory stats
                    const dirStats = await fs.stat(jobDir);
                    
                    // Get all files in the job directory
                    const files = await fs.readdir(jobDir);
                    const fileDetails = [];
                    
                    for (const fileName of files) {
                        try {
                            const filePath = path.join(jobDir, fileName);
                            const fileStats = await fs.stat(filePath);
                            
                            if (fileStats.isFile()) {
                                fileDetails.push({
                                    name: fileName,
                                    size: fileStats.size,
                                    sizeFormatted: FileUtils.formatFileSize(fileStats.size),
                                    modified: fileStats.mtime.toISOString(),
                                    type: ColabFoldController.getFileType(fileName),
                                    icon: ColabFoldController.getFileIcon(fileName)
                                });
                            }
                        } catch (fileError) {
                            console.warn(`Error reading file ${fileName} in ${jobId}:`, fileError);
                        }
                    }
                    
                    // Sort files by type priority and name
                    fileDetails.sort((a, b) => {
                        const priorityA = ColabFoldController.getFilePriority(a.type);
                        const priorityB = ColabFoldController.getFilePriority(b.type);
                        if (priorityA !== priorityB) return priorityA - priorityB;
                        return a.name.localeCompare(b.name);
                    });
                    
                    // Check if job is complete by looking for *.done.txt files
                    const doneFiles = files.filter(file => file.endsWith('.done.txt'));
                    
                    // Check if job failed by any file containing 'failed' in name or *_error.txt
                    const failedFiles = files.filter(file => /failed/i.test(file) || file.endsWith('_error.txt'));
                    const isFailed = failedFiles.length > 0;
                    const isComplete = doneFiles.length > 0 && !isFailed;
                    
                    // Determine status with failure taking precedence
                    const status = isFailed ? 'failed' : (isComplete ? 'completed' : 'running');
                    
                    // Use filesystem-based job info or fallback
                    const jobName = `ColabFold Job (${jobId.substring(0, 8)})`;
                    
                    // Calculate time elapsed from directory creation time
                    const createdAt = dirStats.birthtime || dirStats.ctime;
                    const timeElapsed = ColabFoldController.calculateTimeElapsed(createdAt);
                    
                    // Determine completion time
                    let completedAt = null;
                    if (isComplete && doneFiles.length > 0) {
                        try {
                            const doneFilePath = path.join(jobDir, doneFiles[0]);
                            const doneStats = await fs.stat(doneFilePath);
                            completedAt = doneStats.mtime.toISOString();
                        } catch (error) {
                            console.warn(`Could not get completion time for ${jobId}:`, error);
                        }
                    }
                    
                    jobs.push({
                        jobId: jobId,
                        jobName: jobName,
                        status: status,
                        isComplete: status === 'completed',
                        createdAt: createdAt.toISOString ? createdAt.toISOString() : createdAt,
                        completedAt: completedAt,
                        timeElapsed: timeElapsed,
                        fileCount: fileDetails.length,
                        files: fileDetails,
                        hasInMemoryData: !!jobFromMemory
                    });
                    
                } catch (dirError) {
                    console.warn(`Error processing directory ${jobId}:`, dirError);
                }
            }
            
            // Sort jobs by creation time (newest first)
            jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Calculate stats
            const stats = {
                total: jobs.length,
                running: jobs.filter(j => j.status === 'running').length,
                completed: jobs.filter(j => j.status === 'completed').length
            };
            
            res.json({
                success: true,
                jobs: jobs,
                stats: stats
            });
            
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve dashboard data',
                details: error.message
            });
        }
    }
    
    /**
     * Calculate time elapsed since job creation
     */
    static calculateTimeElapsed(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now - created;
        
        const minutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    /**
     * Get file type based on extension
     */
    static getFileType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const typeMap = {
            '.pdb': 'structure',
            '.json': 'data',
            '.png': 'image',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.log': 'log',
            '.txt': 'text',
            '.fasta': 'sequence',
            '.fa': 'sequence',
            '.fas': 'sequence',
            '.a3m': 'alignment',
            '.html': 'report',
            '.csv': 'data',
            '.tsv': 'data'
        };
        return typeMap[ext] || 'unknown';
    }
    
    /**
     * Get file icon based on filename
     */
    static getFileIcon(filename) {
        const type = ColabFoldController.getFileType(filename);
        const iconMap = {
            'structure': '🧬',
            'data': '📊',
            'image': '🖼️',
            'log': '📋',
            'text': '📄',
            'sequence': '🧬',
            'alignment': '📈',
            'report': '📊',
            'unknown': '📎'
        };
        return iconMap[type] || '📎';
    }
    
    /**
     * Get file priority for sorting (lower number = higher priority)
     */
    static getFilePriority(fileType) {
        const priorityMap = {
            'structure': 1,  // PDB files most important
            'data': 2,       // JSON, CSV files
            'image': 3,      // PNG, JPG files
            'report': 4,     // HTML reports
            'alignment': 5,  // A3M files
            'sequence': 6,   // FASTA files
            'log': 7,        // Log files
            'text': 8,       // Other text files
            'unknown': 9     // Unknown files last
        };
        return priorityMap[fileType] || 9;
    }
}

module.exports = ColabFoldController;