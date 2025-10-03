/**
 * Protein Tools Server - Refactored Version
 * Modern Express.js server with organized architecture
 */

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

// Import configuration and utilities
const config = require('./config');
const JobManager = require('./utils/jobManager');
const FileUtils = require('./utils/fileUtils');

// Import routes
const apiRoutes = require('./routes');

// Initialize Express app
const app = express();

// Middleware
//app.use(cors(config.cors));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(config.staticPath));


// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

/**
 * Tool Execution Engine
 * This remains in the main app for now but could be moved to a separate service
 */
const { exec, spawn } = require('child_process');

async function executeToolCommand(job) {
    try {
        const toolConfig = config.tools[job.tool];
        if (!toolConfig) {
            throw new Error(`Unknown tool: ${job.tool}`);
        }

        JobManager.updateJobStatus(job.id, 'running', 5);

        const scriptPath = path.join(__dirname, toolConfig.scriptPath);
        const inputFile = job.file.path;
        let args = [scriptPath, inputFile];

        // Add tool-specific parameters
        switch (job.tool) {
            case 'proteinmpnn':
                if (job.parameters.chains) args.push('--chains', job.parameters.chains);
                if (job.parameters.numDesigns) args.push('--num-designs', job.parameters.numDesigns);
                if (job.parameters.temperature) args.push('--temperature', job.parameters.temperature);
                if (job.parameters.omitAA) args.push('--omit-aa', job.parameters.omitAA);
                break;
            case 'colabfold':
                const jobOutputDir = `output/${job.id}`;
                args.push('--output-dir', jobOutputDir);
                if (job.parameters.modelType) args.push('--model-type', job.parameters.modelType);
                if (job.parameters.numModels) args.push('--num-models', job.parameters.numModels);
                if (job.parameters.numRecycles) args.push('--num-recycles', job.parameters.numRecycles);
                // Handle maxSeq and maxExtraSeq parameters
                if (job.parameters.maxSeq && job.parameters.maxSeq !== 'auto') {
                    args.push('--max-seq', parseInt(job.parameters.maxSeq));
                }
                if (job.parameters.maxExtraSeq && job.parameters.maxExtraSeq !== 'auto') {
                    args.push('--max-extra-seq', parseInt(job.parameters.maxExtraSeq));
                }
                if (job.parameters.useGpu !== undefined) args.push('--use-gpu');
                break;
            case 'foldseek':
                // Create job-specific output directory
                const foldseekJobOutputDir = `output/${job.id}`;
                args.push('--output', foldseekJobOutputDir);
                args.push('--job-id', job.id);
                if (job.parameters.database) args.push('--db', `database/${job.parameters.database}/${job.parameters.database}`);
                if (job.parameters.sensitivity) args.push('--sensitivity', job.parameters.sensitivity);
                if (job.parameters.evalue) args.push('--evalue', job.parameters.evalue);
                if (job.parameters.maxResults) args.push('--max-seqs', job.parameters.maxResults);
                break;
            case 'haddock':
                if (job.parameters.molecule2) {
                    args = [scriptPath, inputFile, job.parameters.molecule2];
                    delete job.parameters.molecule2;
                }
                if (job.parameters.dockingType) args.push('--docking-type', job.parameters.dockingType);
                if (job.parameters.activeResidues1) args.push('--active-residues1', job.parameters.activeResidues1);
                if (job.parameters.activeResidues2) args.push('--active-residues2', job.parameters.activeResidues2);
                break;
            case 'colabdock':
                const colabdockJobOutputDir = `output/${job.id}`;
                args.push('--output-dir', colabdockJobOutputDir);
                args.push('--job-id', job.id);
                if (job.parameters.chains) args.push('--chains', job.parameters.chains);
                if (job.parameters.fixedChains) args.push('--fixed-chains', job.parameters.fixedChains);
                if (job.parameters.resThres) args.push('--res-thres', job.parameters.resThres);
                if (job.parameters.repThres) args.push('--rep-thres', job.parameters.repThres);
                if (job.parameters.rounds) args.push('--rounds', job.parameters.rounds);
                if (job.parameters.steps) args.push('--steps', job.parameters.steps);
                if (job.parameters.saveEveryNStep) args.push('--save-every-n-step', job.parameters.saveEveryNStep);
                if (job.parameters.useMultimer !== undefined) args.push('--use-multimer');
                if (job.parameters.bfloat !== undefined) args.push('--bfloat');
                if (job.parameters.rest1v1) args.push('--rest-1v1', JSON.stringify(job.parameters.rest1v1));
                if (job.parameters.rest1vN) args.push('--rest-1vn', JSON.stringify(job.parameters.rest1vN));
                if (job.parameters.restMvN) args.push('--rest-mvn', JSON.stringify(job.parameters.restMvN));
                if (job.parameters.restRep) args.push('--rest-rep', JSON.stringify(job.parameters.restRep));
                break;

        }

        console.log(`Executing: python3 ${args.join(' ')}`);

        const child = spawn('python3', args, {
            cwd: path.dirname(scriptPath)
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
            JobManager.updateJobStatus(job.id, 'running', Math.min(95, (job.progress || 0) + 10));
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(`Job ${job.id} stderr:`, data.toString());
        });

        child.on('close', async (code) => {
            if (code === 0) {
                try {
                    let outputDir;
                    if (job.tool === 'colabfold') {
                        outputDir = path.join(__dirname, toolConfig.outputDir, job.id);
                    } else {
                        outputDir = path.join(__dirname, toolConfig.outputDir);
                    }
                    
                    const outputFiles = await FileUtils.findOutputFiles(outputDir, job.id);
                    
                    JobManager.updateJobStatus(job.id, 'completed', 100);
                    
                    console.log(`✓ Job ${job.id} completed successfully`);
                } catch (error) {
                    console.error(`Error processing job ${job.id} results:`, error);
                    JobManager.updateJobStatus(job.id, 'failed', 0, error.message);
                }
            } else {
                const errorMessage = errorOutput || `Process exited with code ${code}`;
                JobManager.updateJobStatus(job.id, 'failed', 0, errorMessage);
                console.error(`✗ Job ${job.id} failed:`, errorMessage);
            }
        });

        child.on('error', (error) => {
            JobManager.updateJobStatus(job.id, 'failed', 0, error.message);
            console.error(`✗ Job ${job.id} execution error:`, error);
        });

    } catch (error) {
        JobManager.updateJobStatus(job.id, 'failed', 0, error.message);
        console.error(`✗ Job ${job.id} setup error:`, error);
    }
}

// Job execution handler - triggered when jobs are created
const originalCreateJob = JobManager.createJob;
JobManager.createJob = function(...args) {
    const job = originalCreateJob.apply(this, args);
    
    // Execute job asynchronously
    executeToolCommand(job).catch(err => {
        console.error(`Job ${job.id} failed:`, err);
    });
    
    return job;
};

// Scheduled tasks
cron.schedule('0 2 * * *', () => {
    console.log('Running daily cleanup...');
    const cleaned = JobManager.cleanupOldJobs();
    console.log(`Cleaned up ${cleaned} old jobs`);
});

// Server startup
const PORT = config.port;

async function startServer() {
    try {
        // Ensure required directories exist
        const directories = [
            'uploads',
            '../containers/proteinmpnn/input',
            '../containers/proteinmpnn/output',
            '../containers/colabfold/input',
            '../containers/colabfold/output',
            '../containers/foldseek/input',
            '../containers/foldseek/output',
            '../containers/haddock/input',
            '../containers/haddock/output',
            '../containers/colabdock/input',
            '../containers/colabdock/output',

        ];

        for (const dir of directories) {
            await FileUtils.ensureDirectory(path.join(__dirname, dir));
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Protein Tools Server running on port', PORT);
            console.log('📊 Health check: http://localhost:' + PORT + '/api/health');
            console.log('🌐 External health: http://YOUR-EC2-PUBLIC-IP:' + PORT + '/api/health');
            console.log('📤 Upload API: http://localhost:' + PORT + '/api/upload');
            console.log('⚙️  Execute API: http://localhost:' + PORT + '/api/jobs/execute');
            console.log('🔧 Combined API: http://localhost:' + PORT + '/api/run-tool');
            console.log('📋 Available tools:', Object.keys(config.tools).join(', '));
            console.log('💡 Server accessible from all network interfaces');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

if (require.main === module) {
    startServer();
}

module.exports = app;
