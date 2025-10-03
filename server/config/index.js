/**
 * Server Configuration
 * Centralized configuration for the protein tools server
 */

const path = require('path');

const config = {
    // Server settings
    port: process.env.PORT || 3002,
    
    // Tool configurations
    tools: {
        proteinmpnn: {
            name: 'ProteinMPNN',
            inputDir: '../containers/proteinmpnn/input',
            outputDir: '../containers/proteinmpnn/output',
            scriptPath: '../containers/proteinmpnn/run_proteinmpnn_docker.py',
            allowedExtensions: ['.pdb'],
            maxFileSize: 50 * 1024 * 1024 // 50MB
        },
        colabfold: {
            name: 'ColabFold',
            inputDir: '../containers/colabfold/input',
            outputDir: '../containers/colabfold/output',
            scriptPath: '../containers/colabfold/run_colabfold_docker.py',
            allowedExtensions: ['.fasta', '.fa', '.fas', '.txt'],
            maxFileSize: 10 * 1024 * 1024 // 10MB
        },
        foldseek: {
            name: 'Foldseek',
            inputDir: '../containers/foldseek/input',
            outputDir: '../containers/foldseek/output',
            scriptPath: '../containers/foldseek/run_foldseek_docker.py',
            allowedExtensions: ['.pdb'],
            maxFileSize: 50 * 1024 * 1024 // 50MB
        },
        colabdock: {
            name: 'ColabDock',
            inputDir: '../containers/colabdock/input',
            outputDir: '../containers/colabdock/output',
            scriptPath: '../containers/colabdock/run_colabdock_docker.py',
            allowedExtensions: ['.pdb'],
            maxFileSize: 50 * 1024 * 1024 // 50MB
        },

    },
    
    // File upload settings
    upload: {
        dest: 'uploads/',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxFiles: 2
    },
    
    // Job settings
    jobs: {
        cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
        maxJobs: 1000
    },
    
    // Static file serving
    staticPath: path.join(__dirname, '../../zqjd77'),
    
    // CORS settings
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
};

module.exports = config;
