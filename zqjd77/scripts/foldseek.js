/**
 * Foldseek Frontend Script - Clean version using services
 * Depends on: services/api-service.js, services/protein-tools-service.js
 */

function toggleInputMethod() {
    const queryType = document.getElementById('query-type').value;
    
    // Hide all input groups
    document.getElementById('pdb-file-group').style.display = 'none';
    document.getElementById('pdb-id-group').style.display = 'none';
    
    // Show the selected input group
    if (queryType === 'pdb-file') {
        document.getElementById('pdb-file-group').style.display = 'block';
    } else if (queryType === 'pdb-id') {
        document.getElementById('pdb-id-group').style.display = 'block';
    }
}

// Auto-uppercase PDB ID input
document.getElementById('pdb-id').addEventListener('input', function(e) {
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById('foldseek-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        // Disable submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        const queryType = document.getElementById('query-type').value;
        let input, displayName;
        
        // Handle different input types
        if (queryType === 'pdb-file') {
            const fileInput = document.getElementById('pdb-file');
            if (!fileInput.files.length) {
                alert('Please select a PDB file.');
                return;
            }
            
            input = fileInput.files[0];
            displayName = input.name;
            
            if (!window.proteinToolsService.validatePDBFile(input)) {
                alert('Please select a valid PDB file.');
                return;
            }
        } else if (queryType === 'pdb-id') {
            const pdbIdRaw = document.getElementById('pdb-id').value.trim().toUpperCase();
            // Validate PDB ID: exactly 4 alphanumeric characters
            if (!/^[A-Z0-9]{4}$/.test(pdbIdRaw)) {
                alert('Please enter a valid 4-character PDB ID (e.g., 7CWM).');
                return;
            }
            displayName = pdbIdRaw;
            // Fetch the PDB file from RCSB and create a File object
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
            input = new File([blob], `${pdbIdRaw}.pdb`, { type: 'chemical/x-pdb' });
        } else if (queryType === 'sequence') {
            input = document.getElementById('sequence').value.trim();
            if (!input) {
                alert('Please enter a protein sequence.');
                return;
            }
            
            if (!window.proteinToolsService.validateFASTA(input)) {
                alert('Please enter a valid protein sequence.');
                return;
            }
            displayName = 'Sequence';
        }
        
        // Get job name from form
        const jobNameInput = document.getElementById('job-name');
        const jobName = jobNameInput ? jobNameInput.value : '';
        
        // Collect search parameters
        const parameters = {
            database: document.getElementById('database').value,
            evalue: document.getElementById('evalue').value,
            maxResults: document.getElementById('max-results').value,
            alignmentType: '0',
        };
        
        // Submit job using service
        const jobResult = await window.proteinToolsService.runFoldseek(input, queryType, parameters, jobName);
        
        if (jobResult.success) {
            alert(`Foldseek structure search job submitted successfully!
                
Job ID: ${jobResult.job.id}
Job Name: ${jobResult.job.jobName}
Query: ${displayName}
Database: ${parameters.database}
Status: ${jobResult.job.status}

The search is now running on the server!
You can track your job progress in the Jobs section.`);
                            
            // Reset form
            document.getElementById('foldseek-form').reset();
            toggleInputMethod(); // Reset UI state
            console.log('Foldseek job submitted successfully:', jobResult);
        }
    } catch (error) {
        alert('Foldseek job submission failed: ' + error.message);
        console.error('Foldseek submission error:', error);
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});
