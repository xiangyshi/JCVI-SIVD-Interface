/**
 * Execution Manager
 * Handles job execution logic
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const JobManager = require('./jobManager');
const config = require('../config');

class ExecutionManager {
    /**
     * Execute a tool command for a job
     * @param {Object} job - Job object
     */
    static async executeToolCommand(job) {
        try {
            const toolConfig = config.tools[job.tool];
            if (!toolConfig) {
                throw new Error(`Unknown tool: ${job.tool}`);
            }

            JobManager.updateJobStatus(job.id, 'running', 5);

            const scriptPath = path.join(__dirname, '..', toolConfig.scriptPath);
            
            // For tools that expect input files in a specific subdirectory, adjust the path
            let inputFile = job.file.path;
            if (job.tool === 'proteinmpnn') {
                // ProteinMPNN expects input files in the input/ subdirectory
                const fileName = path.basename(job.file.path);
                inputFile = `input/${fileName}`;
            }
            
            let args = [scriptPath, inputFile];
            console.log('job.parameters', job.parameters);
            // Add tool-specific parameters
            switch (job.tool) {
                case 'proteinmpnn':
                    // For ProteinMPNN, we need to specify the output directory with the job ID
                    const proteinmpnnOutputDir = `output/${job.id}`;
                    args.push('--output-dir', proteinmpnnOutputDir);
                    if (job.parameters.chains) args.push('--chains', job.parameters.chains);
                    if (job.parameters.numDesigns) args.push('--num-designs', job.parameters.numDesigns);
                    if (job.parameters.temperature) args.push('--temperature', job.parameters.temperature);
                    if (job.parameters.omitAA) args.push('--omit-aa', job.parameters.omitAA);
                    // Extended, optional parameters pass-through
                    if (job.parameters.modelName) args.push('--model-name', job.parameters.modelName);
                    if (job.parameters.batchSize) args.push('--batch-size', job.parameters.batchSize);
                    if (job.parameters.caOnly) args.push('--ca-only');
                    if (job.parameters.maxLength) args.push('--max-length', job.parameters.maxLength);
                    if (job.parameters.seed !== undefined) args.push('--seed', job.parameters.seed);
                    if (job.parameters.saveScore !== undefined) args.push('--save-score', job.parameters.saveScore);
                    if (job.parameters.saveProbs !== undefined) args.push('--save-probs', job.parameters.saveProbs);
                    break;
                case 'colabfold':
                    const jobOutputDir = `output/${job.id}`;
                    args.push('--output-dir', jobOutputDir);
                    if (job.parameters.modelType) args.push('--model-type', job.parameters.modelType);
                    if (job.parameters.numModels) args.push('--num-models', job.parameters.numModels);
                    if (job.parameters.numRecycles && job.parameters.numRecycles !== 'auto') {
                        args.push('--num-recycles', job.parameters.numRecycles);
                    }
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
                    if (job.parameters.database) args.push('--db', `database/${job.parameters.database}/${job.parameters.database}`);
                    if (job.parameters.sensitivity) args.push('--sensitivity', job.parameters.sensitivity);
                    if (job.parameters.evalue) args.push('--evalue', job.parameters.evalue);
                    if (job.parameters.maxResults) args.push('--max-seqs', job.parameters.maxResults);
                    break;
            }

            console.log(`Executing: python3 ${args.join(' ')}`);

            const child = spawn('python3', args, {
                cwd: path.dirname(scriptPath),
                env: { ...process.env, PYTHONPATH: path.dirname(scriptPath) }
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
                    JobManager.updateJobStatus(job.id, 'completed', 100);
                    console.log(`✅ Job ${job.id} completed successfully`);
                    
                    // Create done file for all completed jobs
                    try {
                        const outputDir = path.join(__dirname, '..', toolConfig.outputDir, job.id);
                        await fs.mkdir(outputDir, { recursive: true });
                        const doneFile = path.join(outputDir, `${job.id}.done.txt`);
                        const doneContent = `Job completed at: ${new Date().toISOString()}\nJob ID: ${job.id}\nJob Name: ${job.jobName || 'Unnamed'}\nTool: ${job.tool}\nStatus: completed\n`;
                        await fs.writeFile(doneFile, doneContent);
                        console.log(`Created done file: ${doneFile}`);
                    } catch (error) {
                        console.error(`Failed to create done file for job ${job.id}:`, error);
                    }
                    
                    // Job result is stored in filesystem via .done.txt files
                } else {
                    JobManager.updateJobStatus(job.id, 'failed', 0, `Process exited with code ${code}: ${errorOutput}`);
                    console.error(`❌ Job ${job.id} failed: Process exited with code ${code}`);
                    console.error(`Error output: ${errorOutput}`);
                    
                    // Create error file for failed jobs
                    try {
                        const outputDir = path.join(__dirname, '..', toolConfig.outputDir, job.id);
                        await fs.mkdir(outputDir, { recursive: true });
                        const errorFile = path.join(outputDir, `${job.id}_error.txt`);
                        const errorContent = `Job failed at: ${new Date().toISOString()}\nJob ID: ${job.id}\nJob Name: ${job.jobName || 'Unnamed'}\nTool: ${job.tool}\nStatus: failed\nExit Code: ${code}\nError Output: ${errorOutput}\n`;
                        await fs.writeFile(errorFile, errorContent);
                        console.log(`Created error file: ${errorFile}`);
                    } catch (writeError) {
                        console.error(`Failed to create error file for job ${job.id}:`, writeError);
                    }
                }
            });

        } catch (error) {
            console.error(`Job ${job.id} execution error:`, error);
            JobManager.updateJobStatus(job.id, 'failed', 0, error.message);
        }
    }
}

module.exports = ExecutionManager;
