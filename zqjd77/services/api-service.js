/**
 * Centralized API service for protein analysis tools
 */

class ApiService {
    constructor() {
        this.baseUrl = this._getServerUrl();
    }

    _getServerUrl() {
        return `https://psa.jcvi.org:3001`;
    }

    /**
     * Check if the server is healthy and available
     * @returns {Promise<Object>} Server health status
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Server is not available. Please ensure the server is running on port 3001.');
        } catch (error) {
            throw new Error('Server connection failed: ' + error.message);
        }
    }

    /**
     * Upload a file to the server
     * @param {File} file - The file to upload
     * @param {string} toolType - The tool type (proteinmpnn, colabfold, foldseek, haddock)
     * @param {Object} additionalData - Additional form data to include
     * @returns {Promise<Object>} Upload response
     */
    async uploadFile(file, toolType, additionalData = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Add additional data to form
            Object.keys(additionalData).forEach(key => {
                if (additionalData[key] !== undefined && additionalData[key] !== '') {
                    formData.append(key, additionalData[key]);
                }
            });

            const response = await fetch(`${this.baseUrl}/api/upload?toolType=${toolType}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    /**
     * Execute a tool with uploaded file
     * @param {string} toolType - The tool type
     * @param {string} filePath - Path to the uploaded file
     * @param {Object} parameters - Tool-specific parameters
     * @returns {Promise<Object>} Execution response
     */
    async executeTool(toolType, filePath, parameters = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toolType: toolType,
                    filePath: filePath,
                    parameters: parameters
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Execution error:', error);
            throw error;
        }
    }

    /**
     * Upload file and execute tool in one call (combined endpoint)
     * @param {File|File[]} files - File(s) to upload
     * @param {string} toolType - The tool type
     * @param {Object} parameters - Tool-specific parameters
     * @param {string} jobName - Optional job name
     * @returns {Promise<Object>} Job response
     */
    async runTool(files, toolType, parameters = {}, jobName = '') {
        try {
            // Check server health first
            await this.checkHealth();

            const formData = new FormData();
            
            // Handle single file or multiple files
            if (Array.isArray(files)) {
                files.forEach((file, index) => {
                    formData.append(`file${index + 1}`, file);
                });
            } else {
                formData.append('file', files);
            }

            // Add toolType, parameters, and jobName to form data
            formData.append('toolType', toolType);
            formData.append('parameters', JSON.stringify(parameters));
            if (jobName) {
                formData.append('jobName', jobName);
            }

            const response = await fetch(`${this.baseUrl}/api/run-tool`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Run tool error:', error);
            throw error;
        }
    }

    /**
     * Get job status by ID
     * @param {string} jobId - The job ID
     * @returns {Promise<Object>} Job status
     */
    async getJobStatus(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/job/${jobId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Get job status error:', error);
            throw error;
        }
    }

    /**
     * Get all jobs
     * @returns {Promise<Object>} All jobs list
     */
    async getAllJobs() {
        console.log('Get all jobs');
        try {
            const response = await fetch(`${this.baseUrl}/api/jobs`);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.log('Get all jobs error:', errorData);
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            console.log('Get all jobs response:', response);
            return await response.json();
        } catch (error) {
            console.error('Get all jobs error:', error);
            throw error;
        }
    }

    /**
     * Download job results
     * @param {string} jobId - The job ID
     * @param {string} filename - Optional specific filename to download
     * @returns {Promise<Blob>} File blob for download
     */
    async downloadResults(jobId, filename = null) {
        try {
            const url = filename 
                ? `${this.baseUrl}/api/download?jobId=${jobId}&filename=${filename}`
                : `${this.baseUrl}/api/download?jobId=${jobId}`;
                
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.blob();
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Get ColabFold dashboard data
     * @returns {Promise<Object>} Dashboard data with all ColabFold jobs and directories
     */
    async getColabFoldDashboard() {
        try {
            const response = await fetch(`${this.baseUrl}/api/colabfold/dashboard`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Get ColabFold dashboard error:', error);
            throw error;
        }
    }

    /**
     * Get detailed information about a specific ColabFold job
     * @param {string} jobId - The job ID
     * @returns {Promise<Object>} Detailed job information including file listings
     */
    async getColabFoldJobDetails(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/colabfold/job/${jobId}/details`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Get ColabFold job details error:', error);
            throw error;
        }
    }

    /**
     * Download a specific file from a job
     * @param {string} jobId - The job ID
     * @param {string} filename - The filename to download
     * @returns {Promise<Blob>} File blob for download
     */
    async downloadJobFile(jobId, filename) {
        try {
            const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}/download/${encodeURIComponent(filename)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.blob();
        } catch (error) {
            console.error('Download job file error:', error);
            throw error;
        }
    }

    /**
     * Download all files from a job as a zip archive
     * @param {string} jobId - The job ID
     * @returns {Promise<Blob>} Zip file blob for download
     */
    async downloadAllJobFiles(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}/download-all`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.blob();
        } catch (error) {
            console.error('Download all job files error:', error);
            throw error;
        }
    }

    /**
     * Delete a specific job
     * @param {string} jobId - The job ID
     * @returns {Promise<Object>} Delete operation result
     */
    async deleteJob(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Delete job error:', error);
            throw error;
        }
    }

    /**
     * Clear a specific job folder
     * @param {string} jobId - The job ID
     * @returns {Promise<Object>} Clear operation result
     */
    async clearJobFolder(jobId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}/clear`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Clear job folder error:', error);
            throw error;
        }
    }

    /**
     * Clear all job folders for a specific tool
     * @param {string} toolType - The tool type (e.g., 'proteinmpnn', 'colabfold')
     * @returns {Promise<Object>} Clear operation result
     */
    async clearAllToolJobs(toolType) {
        try {
            const response = await fetch(`${this.baseUrl}/api/jobs/tool/${toolType}/clear-all`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Clear all tool jobs error:', error);
            throw error;
        }
    }

    /**
     * Clear all job folders across all tools
     * @returns {Promise<Object>} Clear operation result
     */
    async clearAllJobs() {
        try {
            const response = await fetch(`${this.baseUrl}/api/jobs/clear-all`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Clear all jobs error:', error);
            throw error;
        }
    }
}

// Create a singleton instance
const apiService = new ApiService();

// Export for use in other scripts
window.ApiService = ApiService;
window.apiService = apiService;
