/**
 * Jobs Dashboard JavaScript
 * Handles job loading, display, and management functionality
 */

// Global variables
let autoRefreshInterval;

/**
 * Initialize the jobs dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Jobs dashboard initializing...');
    
    // Initialize dashboard
    await loadJobs();
    setupEventListeners();
    startAutoRefresh();
});

/**
 * Load and display all jobs
 */
async function loadJobs() {
    const jobsContainer = document.getElementById('jobs-container');
    
    try {
        console.log('Fetching jobs...');
        jobsContainer.innerHTML = '<div class="loading-message">Loading jobs...</div>';
        
        const response = await apiService.getAllJobs();
        console.log('Jobs response:', response);
        
        if (response.success && response.jobs) {
            displayJobs(response.jobs);
            updateJobStats(response.jobs);
        } else {
            throw new Error('Failed to fetch jobs');
        }
        
    } catch (error) {
        console.error('Error loading jobs:', error);
        jobsContainer.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Jobs</h3>
                <p>${error.message}</p>
                <button onclick="loadJobs()" class="retry-btn">Retry</button>
            </div>
        `;
    }
}

/**
 * Display jobs in the container
 */
function displayJobs(jobs) {
    const jobsContainer = document.getElementById('jobs-container');
    
    if (!jobs || jobs.length === 0) {
        jobsContainer.innerHTML = `
            <div class="empty-state">
                <h3>No Jobs Found</h3>
                <p>You haven't submitted any jobs yet.</p>
                <a href="tools/colabfold.html" class="start-job-btn">Start Your First Job</a>
            </div>
        `;
        return;
    }
    

    
    // Sort jobs by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt || b.created) - new Date(a.createdAt || a.created));
    
    const jobsHtml = jobs.map(job => createJobCard(job)).join('');
    jobsContainer.innerHTML = jobsHtml;
}

/**
 * Create HTML for a single job card
 */
function createJobCard(job) {
    const status = job.status || 'unknown';
    const toolType = job.toolType || job.tool || 'unknown';
    const jobName = job.jobName || job.name || `${toolType} Job`;
    const createdTime = formatDate(job.createdAt || job.created);
    const updatedTime = formatDate(job.updatedAt || job.updated);
    
    // Calculate display properties based on status
    const statusDisplay = formatStatus(status);
    const progressDisplay = ['running', 'queued', 'processing'].includes(status) ? 'block' : 'none';
    // Show output files if they exist, regardless of status
    const hasOutputFiles = (job.files && job.files.length > 0) || (job.outputFiles && job.outputFiles.length > 0);
    const outputDisplay = hasOutputFiles ? 'block' : 'none';
    const downloadDisplay = status === 'completed' ? 'inline-block' : 'none';
    const viewDisplay = status === 'completed' ? 'inline-block' : 'none';
    const cancelDisplay = ['running', 'queued', 'processing'].includes(status) ? 'inline-block' : 'none';
    const restartDisplay = status === 'failed' ? 'inline-block' : 'none';
    
    // Get progress info
    const progress = job.progress || 0;
    const runtime = calculateRuntime(job.createdAt || job.created);
    const eta = calculateETA(job);
    
    return `
        <div class="job-card" data-job-id="${job.id || job.jobId}" data-status="${status}" data-tool="${toolType}">
            <div class="job-header">
                <div class="job-info">
                    <h3 class="job-name">${jobName}</h3>
                    <div class="job-meta">
                        <span class="job-id">ID: ${job.id || job.jobId}</span>
                        <span class="job-tool">${formatToolType(toolType)}</span>
                        <span class="job-created">Created: ${createdTime}</span>
                    </div>
                </div>
                <div class="job-status">
                    <span class="status-badge status-${status}">${statusDisplay}</span>
                </div>
            </div>
            
            <div class="progress-container" style="display: ${progressDisplay};">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                    <span class="progress-text">${progress}%</span>
                </div>
                <div class="progress-info">
                    <span class="runtime">Runtime: ${runtime}</span>
                    <span class="eta">ETA: ${eta}</span>
                </div>
            </div>
            
            <div class="job-details">
                <div class="job-files">
                    <div class="output-files" style="display: ${outputDisplay};">
                        <div class="output-header">Output Files:</div>
                        <div class="output-list">${formatOutputFiles(job.files || job.outputFiles, job.id || job.jobId)}</div>
                    </div>
                </div>
            </div>
            
            <div class="job-actions">
                <button class="action-btn download-btn" style="display: ${downloadDisplay};" onclick="downloadJob('${job.id || job.jobId}', this)" title="Download all job files as a ZIP archive">
                    📦 Download All Files (zip)
                </button>
                <button class="action-btn delete-btn" onclick="deleteJob('${job.id || job.jobId}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

/**
 * Update job statistics
 */
function updateJobStats(jobs) {
    const totalJobs = jobs.length;
    const runningJobs = jobs.filter(job => ['running', 'queued', 'processing'].includes(job.status)).length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;
    
    document.getElementById('total-jobs').textContent = totalJobs;
    document.getElementById('running-jobs').textContent = runningJobs;
    document.getElementById('completed-jobs').textContent = completedJobs;
    const failedEl = document.getElementById('failed-jobs');
    if (failedEl) failedEl.textContent = failedJobs;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', loadJobs);
    
    // Auto-refresh checkbox
    const autoRefreshCheckbox = document.getElementById('auto-refresh');
    autoRefreshCheckbox.addEventListener('change', function() {
        if (this.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
}

/**
 * Start auto-refresh
 */
function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval
    autoRefreshInterval = setInterval(loadJobs, 30000); // 30 seconds
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format date string for display
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Format job status for display
 */
function formatStatus(status) {
    const statusMap = {
        'running': 'Running',
        'completed': 'Completed',
        'failed': 'Failed',
        'queued': 'Queued',
        'processing': 'Processing',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Format tool type for display
 */
function formatToolType(toolType) {
    const toolMap = {
        'colabfold': 'ColabFold',
        'proteinmpnn': 'ProteinMPNN',
        'foldseek': 'Foldseek',
        'haddock': 'HADDOCK'
    };
    return toolMap[toolType] || toolType.toUpperCase();
}

/**
 * Format output files for display
 */
function formatOutputFiles(outputFiles, jobId) {
    if (!outputFiles || outputFiles.length === 0) {
        return '<span class="no-files">No output files</span>';
    }
    
    // Filter out system files and only show downloadable results
    const displayFiles = outputFiles.filter(file => {
        // Skip system status files
        if (file.name && (file.name.includes('_status.json') || file.name.includes('.done.txt'))) {
            return false;
        }
        // Skip log files unless they're the main results
        if (file.category === 'logs' && file.category !== 'results') {
            return false;
        }
        return true;
    });
    
    if (displayFiles.length === 0) {
        return '<span class="no-files">No output files</span>';
    }
    
    return displayFiles.map(file => {
        const fileName = file.name || file;
        const fileSize = file.sizeFormatted || file.size || '';
        const fileType = file.type || 'unknown';
        
        // Choose appropriate icon based on file type
        let icon = '📄';
        if (fileType === 'pdb') icon = '🧬';
        else if (fileType === 'fasta') icon = '🧬';
        else if (fileType === 'archive') icon = '📦';
        else if (fileType === 'tsv' || fileType === 'csv') icon = '📊';
        else if (fileType === 'log') icon = '📋';
        
        return `
            <div class="output-file" onclick="downloadJobFile('${jobId}', '${fileName}')" title="Click to download">
                <span class="file-icon">${icon}</span>
                <span class="file-name">${fileName}</span>
                <span class="file-size">${fileSize}</span>
                <span class="download-hint">⬇️</span>
            </div>
        `;
    }).join('');
}

/**
 * Calculate runtime from start time
 */
function calculateRuntime(startTime) {
    if (!startTime) return 'Unknown';
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
}

/**
 * Calculate estimated time of arrival
 */
function calculateETA(job) {
    // Simple ETA calculation based on progress and runtime
    if (!job.progress || job.progress === 0) return 'Unknown';
    
    const runtime = new Date() - new Date(job.createdAt || job.created);
    const remainingProgress = 100 - job.progress;
    const etaMs = (runtime / job.progress) * remainingProgress;
    
    const etaMinutes = Math.floor(etaMs / 60000);
    return etaMinutes > 0 ? `${etaMinutes}m` : '< 1m';
}

// =============================================================================
// JOB ACTION FUNCTIONS
// =============================================================================

/**
 * Download a specific file from a job
 */
async function downloadJobFile(jobId, filename) {
    try {
        console.log(`Downloading file ${filename} from job ${jobId}`);
        
        // Find the file element and show loading state
        const fileElement = document.querySelector(`[onclick*="${filename}"]`);
        if (fileElement) {
            const originalContent = fileElement.innerHTML;
            fileElement.innerHTML = `
                <span class="file-icon">⏳</span>
                <span class="file-name">${filename}</span>
                <span class="file-size">Downloading...</span>
                <span class="download-hint">⏳</span>
            `;
            fileElement.style.pointerEvents = 'none';
            fileElement.style.opacity = '0.7';
        }
        
        const blob = await apiService.downloadJobFile(jobId, filename);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log(`File ${filename} downloaded successfully`);
        
        // Show success state briefly
        if (fileElement) {
            fileElement.innerHTML = `
                <span class="file-icon">✅</span>
                <span class="file-name">${filename}</span>
                <span class="file-size">Downloaded!</span>
                <span class="download-hint">✅</span>
            `;
            fileElement.style.opacity = '1';
            
            // Reset to original state after 2 seconds
            setTimeout(() => {
                fileElement.innerHTML = originalContent;
                fileElement.style.pointerEvents = 'auto';
                fileElement.style.opacity = '1';
            }, 2000);
        }
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading file: ' + error.message);
        
        // Reset file element on error
        if (fileElement) {
            fileElement.innerHTML = originalContent;
            fileElement.style.pointerEvents = 'auto';
            fileElement.style.opacity = '1';
        }
    }
}

/**
 * Download all job results as a zip file
 */
async function downloadJob(jobId, button) {
    try {
        button.disabled = true;
        button.textContent = '⏳ Creating ZIP...';
        
        const blob = await apiService.downloadAllJobFiles(jobId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-${jobId}-results.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success feedback
        button.textContent = '✅ Downloaded!';
        setTimeout(() => {
            button.textContent = '📦 Download All Files (zip)';
        }, 2000);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading results: ' + error.message);
        button.textContent = '📦 Download All Files (zip)';
    } finally {
        button.disabled = false;
    }
}

/**
 * View job results
 */
function viewResults(jobId) {
    // TODO: Implement results viewer
    alert(`View results for job ${jobId} - Coming soon!`);
}

/**
 * Cancel a running job
 */
function cancelJob(jobId) {
    if (confirm('Are you sure you want to cancel this job?')) {
        // TODO: Implement job cancellation
        alert(`Cancel job ${jobId} - Coming soon!`);
    }
}

/**
 * Restart a failed job
 */
function restartJob(jobId) {
    if (confirm('Are you sure you want to restart this job?')) {
        // TODO: Implement job restart
        alert(`Restart job ${jobId} - Coming soon!`);
    }
}

/**
 * Delete a job
 */
async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
        try {
            const result = await apiService.deleteJob(jobId);
            console.log('Job deleted:', result);
            alert(`Job deleted successfully: ${result.message}`);
            // Refresh the jobs list to reflect the changes
            loadJobs();
        } catch (error) {
            console.error('Delete job error:', error);
            alert('Error deleting job: ' + error.message);
        }
    }
}

/**
 * Clear a specific job folder
 */
async function clearJobFolder(jobId) {
    if (confirm('Are you sure you want to clear this job folder? This will remove all job files and cannot be undone.')) {
        try {
            const result = await apiService.clearJobFolder(jobId);
            console.log('Job folder cleared:', result);
            alert(`Job folder cleared successfully: ${result.message}`);
            // Refresh the jobs list to reflect the changes
            loadJobs();
        } catch (error) {
            console.error('Clear job folder error:', error);
            alert('Error clearing job folder: ' + error.message);
        }
    }
}

/**
 * Clear all job folders for a specific tool
 */
async function clearAllToolJobs(toolType) {
    const toolName = formatToolType(toolType);
    if (confirm(`Are you sure you want to clear ALL job folders for ${toolName}? This action cannot be undone and will remove all job files.`)) {
        try {
            const result = await apiService.clearAllToolJobs(toolType);
            console.log('Tool jobs cleared:', result);
            alert(`${toolName} jobs cleared successfully: ${result.message}\nCleared ${result.clearedCount} job folders.`);
            // Refresh the jobs list to reflect the changes
            loadJobs();
        } catch (error) {
            console.error('Clear tool jobs error:', error);
            alert('Error clearing tool jobs: ' + error.message);
        }
    }
}

/**
 * Clear all job folders across all tools
 */
async function clearAllJobs() {
    if (confirm('⚠️ DANGER: Are you absolutely sure you want to clear ALL job folders for ALL tools? This will permanently delete all job files and cannot be undone!')) {
        if (confirm('This is your final warning. This action will delete ALL job data. Continue?')) {
            try {
                const result = await apiService.clearAllJobs();
                console.log('All jobs cleared:', result);
                alert(`All jobs cleared successfully: ${result.message}\nCleared ${result.clearedCount} job folders.`);
                // Refresh the jobs list to reflect the changes
                loadJobs();
            } catch (error) {
                console.error('Clear all jobs error:', error);
                alert('Error clearing all jobs: ' + error.message);
            }
        }
    }
}

/**
 * View job logs
 */
function viewLogs(jobId) {
    // TODO: Implement log viewer
    alert(`View logs for job ${jobId} - Coming soon!`);
}

// =============================================================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// =============================================================================

// Make key functions available globally for onclick handlers
window.downloadJobFile = downloadJobFile;
window.downloadJob = downloadJob;
window.viewResults = viewResults;
window.cancelJob = cancelJob;
window.restartJob = restartJob;
window.deleteJob = deleteJob;
window.viewLogs = viewLogs;
window.loadJobs = loadJobs;
window.clearJobFolder = clearJobFolder;
window.clearAllToolJobs = clearAllToolJobs;
window.clearAllJobs = clearAllJobs;
