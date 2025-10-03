/**
 * ProteinMPNN Frontend Script - Clean version using services
 * Depends on: services/api-service.js, services/protein-tools-service.js
 */

// Toggle chains input visibility based on dropdown
const chainsModeEl = document.getElementById('chains-mode');
const chainsInputContainerEl = document.getElementById('chains-select-container');
if (chainsModeEl && chainsInputContainerEl) {
    const updateChainsVisibility = () => {
        chainsInputContainerEl.style.display = chainsModeEl.value === 'select' ? 'block' : 'none';
    };
    chainsModeEl.addEventListener('change', updateChainsVisibility);
    // Initialize visibility on load
    updateChainsVisibility();
}

// Toggle input method (pdb-file vs pdb-id)
const queryTypeEl = document.getElementById('query-type');
const pdbFileGroupEl = document.getElementById('pdb-file-group');
const pdbIdGroupEl = document.getElementById('pdb-id-group');
if (queryTypeEl && pdbFileGroupEl && pdbIdGroupEl) {
    const updateInputVisibility = () => {
        const type = queryTypeEl.value;
        pdbFileGroupEl.style.display = type === 'pdb-file' ? 'block' : 'none';
        pdbIdGroupEl.style.display = type === 'pdb-id' ? 'block' : 'none';
    };
    queryTypeEl.addEventListener('change', updateInputVisibility);
    updateInputVisibility();
}

document.getElementById('proteinmpnn-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        // Disable submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        // Determine input by query type
        const queryType = document.getElementById('query-type') ? document.getElementById('query-type').value : 'pdb-file';
        let file;
        if (queryType === 'pdb-file') {
            const fileInput = document.getElementById('pdb-file');
            if (!fileInput.files.length) {
                alert('Please select a PDB file.');
                return;
            }
            file = fileInput.files[0];
            if (!window.proteinToolsService.validatePDBFile(file)) {
                alert('Please select a valid PDB file.');
                return;
            }
        } else if (queryType === 'pdb-id') {
            const pdbIdRaw = document.getElementById('pdb-id').value.trim().toUpperCase();
            if (!/^[A-Z0-9]{4}$/.test(pdbIdRaw)) {
                alert('Please enter a valid 4-character PDB ID (e.g., 7CWM).');
                return;
            }
            const pdbUrl = `https://files.rcsb.org/download/${pdbIdRaw.toLowerCase()}.pdb`;
            const resp = await fetch(pdbUrl, { cache: 'no-store' });
            if (!resp.ok) {
                alert(`Failed to fetch PDB ${pdbIdRaw} (HTTP ${resp.status}).`);
                return;
            }
            const pdbText = await resp.text();
            if (!pdbText || pdbText.length < 100 || !/^(ATOM|HETATM|HEADER|TITLE)/m.test(pdbText)) {
                alert('Downloaded content does not look like a valid PDB file.');
                return;
            }
            const blob = new Blob([pdbText], { type: 'chemical/x-pdb' });
            file = new File([blob], `${pdbIdRaw}.pdb`, { type: 'chemical/x-pdb' });
        }
        
        // Determine chains based on mode
        const chainsMode = document.getElementById('chains-mode') ? document.getElementById('chains-mode').value : 'select';
        const rawChainsValue = document.getElementById('chains') ? document.getElementById('chains').value : '';
        const sanitizedChainsValue = rawChainsValue.replace(/\s/g, '');

        // Validate chains if selecting specific chains
        if (chainsMode === 'select') {
            const hasInvalidCommas = sanitizedChainsValue.startsWith(',') || sanitizedChainsValue.endsWith(',') || sanitizedChainsValue.includes(',,');
            if (sanitizedChainsValue.length === 0 || hasInvalidCommas) {
                alert('Invalid chains format. Use comma-separated chain IDs like A,B,C with no leading/trailing commas.');
                submitButton.disabled = false;
                submitButton.textContent = originalText;
                return;
            }
        }

        const chainsParam = chainsMode === 'all' ? 'all' : sanitizedChainsValue;
        // Get job name from form
        const jobNameInput = document.getElementById('job-name');
        const jobName = jobNameInput ? jobNameInput.value : '';
        
        // Collect job parameters
        const jobParameters = {
            chains: chainsParam,
            numDesigns: document.getElementById('num-designs').value || '10',
            temperature: (document.getElementById('temperature').value || '0.1')
        };
        
        // Submit job using service
        const jobResult = await window.proteinToolsService.runProteinMPNN(file, jobParameters, jobName);
        
        if (jobResult.success) {
            // Show success message
            alert(`ProteinMPNN design job submitted successfully!

Job ID: ${jobResult.job.id}
File: ${file.name}
Chains to design: ${jobParameters.chains}
Number of designs: ${jobParameters.numDesigns}
Status: ${jobResult.job.status}

You can track your job progress in the Jobs section.
The job is now running on the server!`);
            
            // Reset form
            document.getElementById('proteinmpnn-form').reset();
            console.log('Job submitted successfully:', jobResult);
        }
    } catch (error) {
        alert('Job submission failed: ' + error.message);
        console.error('Submission error:', error);
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});
