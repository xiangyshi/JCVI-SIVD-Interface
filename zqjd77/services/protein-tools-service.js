/**
 * Protein tools service - abstracts tool-specific logic
 * Depends on api-service.js
 */

class ProteinToolsService {
    constructor() {
        this.api = window.apiService;
    }

    /**
     * Run ProteinMPNN design job
     * @param {File} pdbFile - PDB structure file
     * @param {Object} parameters - ProteinMPNN parameters
     * @returns {Promise<Object>} Job result
     */
    async runProteinMPNN(pdbFile, parameters = {}, jobName = '') {
        const defaultParams = {
            chains: 'all',
            numDesigns: '10',
            temperature: '0.1',
            omitAA: '',
            // Advanced (optional)
            modelName: 'v_48_020',
            // batchSize: undefined,
            // caOnly: undefined,
            // maxLength: undefined,
            // seed: undefined,
            // saveScore: undefined,
            // saveProbs: undefined
        };

        const jobParams = { ...defaultParams, ...parameters };
        console.log('jobParams', jobParams);
        return await this.api.runTool(pdbFile, 'proteinmpnn', jobParams, jobName);
    }

    /**
     * Run ColabFold structure prediction
     * @param {File|string} input - FASTA file or sequence string
     * @param {Object} parameters - ColabFold parameters
     * @param {string} jobName - Optional job name
     * @returns {Promise<Object>} Job result
     */
    async runColabFold(input, parameters = {}, jobName = '') {
        let file;
        
        if (typeof input === 'string') {
            // Convert sequence string to FASTA file
            let fastaData = input.trim();
            if (!fastaData.startsWith('>')) {
                fastaData = '>sequence\n' + fastaData;
            }
            const blob = new Blob([fastaData], { type: 'text/plain' });
            file = new File([blob], 'sequence.fasta', { type: 'text/plain' });
        } else {
            file = input;
        }

        return await this.api.runTool(file, 'colabfold', parameters, jobName);
    }

    /**
     * Run Foldseek structure search
     * @param {File|string} input - PDB file, PDB ID, or sequence
     * @param {string} inputType - 'pdb-file', 'pdb-id', or 'sequence'
     * @param {Object} parameters - Foldseek parameters
     * @returns {Promise<Object>} Job result
     */
    async runFoldseek(input, inputType, parameters = {}, jobName='') {
        let file;
        
        if (inputType === 'pdb-file') {
            file = input;
        } else if (inputType === 'pdb-id') {
            // If the caller already provided a fetched PDB File, use it directly
            if (input && typeof input === 'object' && 'name' in input && input.name.toLowerCase().endsWith('.pdb')) {
                file = input;
            } else {
                alert('Please enter a valid 4-character PDB ID (e.g., 7CWM).');
                return;
            }
        } else if (inputType === 'sequence') {
            // Create a FASTA file
            let fastaData = input.trim();
            if (!fastaData.startsWith('>')) {
                fastaData = '>query\n' + fastaData;
            }
            const blob = new Blob([fastaData], { type: 'text/plain' });
            file = new File([blob], 'query.fasta', { type: 'text/plain' });
        }

        const defaultParams = {
            database: 'influenza',
            sensitivity: '9.5',
            evalue: '10.0',
            maxResults: '100'
        };

        const jobParams = { 
            ...defaultParams, 
            ...parameters, 
            queryType: inputType 
        };

        return await this.api.runTool(file, 'foldseek', jobParams, jobName);
    }

    /**
     * Validate PDB file
     * @param {File} file - PDB file to validate
     * @returns {boolean} True if valid
     */
    validatePDBFile(file) {
        if (!file) return false;
        
        const validExtensions = ['.pdb', '.ent'];
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        return validExtensions.includes(extension);
    }

    /**
     * Validate FASTA file or sequence
     * @param {File|string} input - FASTA file or sequence string
     * @returns {boolean} True if valid
     */
    validateFASTA(input) {
        if (!input) return false;
        
        if (typeof input === 'string') {
            // Extract sequence from FASTA format
            let sequence = input.trim();
            
            // Handle FASTA format (remove header if present)
            if (sequence.startsWith('>')) {
                const lines = sequence.split('\n');
                if (lines.length > 1) {
                    sequence = lines.slice(1).join('').trim();
                } else {
                    sequence = sequence.substring(1).trim();
                }
            }
            
            // Remove any remaining whitespace
            sequence = sequence.replace(/\s/g, '');
            
            // Check if sequence is too short (minimum 10 amino acids for meaningful prediction)
            if (sequence.length < 10) {
                return false;
            }
            
            // Check if sequence contains valid amino acid characters
            return /^[ACDEFGHIKLMNPQRSTVWY]+$/i.test(sequence);
        } else {
            // File validation
            const validExtensions = ['.fasta', '.fa', '.fas', '.txt'];
            const extension = input.name.toLowerCase().substring(input.name.lastIndexOf('.'));
            return validExtensions.includes(extension);
        }
    }

    /**
     * Generate a random job name
     * @param {string} prefix - Prefix for the job name
     * @returns {string} Generated job name
     */
    generateJobName(prefix = 'job') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '');
        const random = Math.random().toString(36).substring(2, 6);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Create progress UI elements
     * @param {string} containerId - Container element ID
     * @returns {Object} UI elements
     */
    createProgressUI(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const progressDiv = document.createElement('div');
        progressDiv.className = 'progress-container';
        progressDiv.style.cssText = `
            margin-top: 15px; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 5px; 
            border: 1px solid #dee2e6;
            display: none;
        `;

        const statusText = document.createElement('div');
        statusText.className = 'status-text';
        statusText.style.cssText = 'font-weight: bold; margin-bottom: 10px;';

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `
            width: 100%; 
            height: 20px; 
            background: #e9ecef; 
            border-radius: 10px; 
            overflow: hidden;
        `;

        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.cssText = `
            height: 100%; 
            background: linear-gradient(90deg, #007bff, #0056b3); 
            width: 0%; 
            transition: width 0.3s ease;
        `;

        const detailsText = document.createElement('div');
        detailsText.className = 'details-text';
        detailsText.style.cssText = 'margin-top: 10px; font-size: 14px; color: #6c757d;';

        progressBar.appendChild(progressFill);
        progressDiv.appendChild(statusText);
        progressDiv.appendChild(progressBar);
        progressDiv.appendChild(detailsText);
        container.appendChild(progressDiv);

        return {
            container: progressDiv,
            statusText,
            progressBar,
            progressFill,
            detailsText,
            show: () => progressDiv.style.display = 'block',
            hide: () => progressDiv.style.display = 'none',
            updateProgress: (percent, status, details) => {
                progressFill.style.width = `${percent}%`;
                statusText.textContent = status;
                if (details) detailsText.textContent = details;
            }
        };
    }
}

// Create singleton instance
const proteinToolsService = new ProteinToolsService();

// Export for use in other scripts
window.ProteinToolsService = ProteinToolsService;
window.proteinToolsService = proteinToolsService;
