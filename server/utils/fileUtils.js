/**
 * File Utilities
 * Helper functions for file operations
 */

const fs = require('fs').promises;
const path = require('path');

class FileUtils {
    /**
     * Find output files in a directory
     * @param {string} outputDir - Output directory path
     * @param {string} jobId - Job ID for filtering
     * @returns {Promise<Array>} Array of output files
     */
    static async findOutputFiles(outputDir, jobId) {
        try {
            const files = await fs.readdir(outputDir);
            const outputFiles = [];

            for (const file of files) {
                if (file.includes(jobId) || path.extname(file) === '.pdb' || 
                    path.extname(file) === '.json' || path.extname(file) === '.png') {
                    const filePath = path.join(outputDir, file);
                    const stats = await fs.stat(filePath);
                    
                    outputFiles.push({
                        name: file,
                        path: filePath,
                        size: stats.size,
                        modified: stats.mtime,
                        type: this.getFileType(file)
                    });
                }
            }

            return outputFiles;
        } catch (error) {
            console.error('Error finding output files:', error);
            return [];
        }
    }

    /**
     * Get file type based on extension
     * @param {string} filename - File name
     * @returns {string} File type
     */
    static getFileType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const typeMap = {
            '.pdb': 'structure',
            '.json': 'data',
            '.png': 'image',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.txt': 'text',
            '.log': 'log',
            '.fasta': 'sequence',
            '.fa': 'sequence',
            '.fas': 'sequence',
            '.a3m': 'alignment',
            '.html': 'report',
            '.pdf': 'document',
            '.csv': 'data',
            '.tsv': 'data'
        };
        
        return typeMap[ext] || 'unknown';
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Ensure directory exists
     * @param {string} dirPath - Directory path
     * @returns {Promise<void>}
     */
    static async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path
     * @returns {Promise<boolean>} Whether file exists
     */
    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get directory statistics
     * @param {string} dirPath - Directory path
     * @returns {Promise<Object>} Directory statistics
     */
    static async getDirectoryStats(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            const stats = await fs.stat(dirPath);
            
            let totalSize = 0;
            const fileTypes = {};
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const fileStats = await fs.stat(filePath);
                
                if (fileStats.isFile()) {
                    totalSize += fileStats.size;
                    const type = this.getFileType(file);
                    fileTypes[type] = (fileTypes[type] || 0) + 1;
                }
            }
            
            return {
                totalFiles: files.length,
                totalSize,
                fileTypes,
                created: stats.birthtime || stats.ctime,
                modified: stats.mtime
            };
        } catch (error) {
            console.error('Error getting directory stats:', error);
            return null;
        }
    }
}

module.exports = FileUtils;
