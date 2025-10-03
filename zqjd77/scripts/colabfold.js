/**
 * ColabFold Frontend Script - Clean version using services
 * Depends on: services/api-service.js, services/protein-tools-service.js
 */

function toggleInputMethod() {
    const inputMethod = document.getElementById('input-method').value;
    const sequenceGroup = document.getElementById('sequence-group');
    const fileGroup = document.getElementById('file-group');
    const sequenceInput = document.getElementById('sequence');
    const fileInput = document.getElementById('fasta-file');
    
    if (inputMethod === 'paste') {
        sequenceGroup.style.display = 'block';
        fileGroup.style.display = 'none';
        sequenceInput.required = true;
        fileInput.required = false;
    } else if (inputMethod === 'file') {
        sequenceGroup.style.display = 'none';
        fileGroup.style.display = 'block';
        sequenceInput.required = false;
        fileInput.required = true;
    }
}

function updateMaxExtraSeq() {
    const maxSeqSelect = document.getElementById('max-seq');
    const maxExtraSeqSelect = document.getElementById('max-extra-seq');
    
    if (maxSeqSelect.value !== 'auto') {
        const maxSeq = parseInt(maxSeqSelect.value);
        const maxExtraSeq = maxSeq * 2;
        
        // Find the closest available option
        const options = Array.from(maxExtraSeqSelect.options).map(opt => parseInt(opt.value)).filter(val => !isNaN(val));
        const closest = options.reduce((prev, curr) => {
            return (Math.abs(curr - maxExtraSeq) < Math.abs(prev - maxExtraSeq) ? curr : prev);
        });
        
        maxExtraSeqSelect.value = closest.toString();
    }
}

// Add event listener for max-seq changes
document.addEventListener('DOMContentLoaded', function() {
    const maxSeqSelect = document.getElementById('max-seq');
    if (maxSeqSelect) {
        maxSeqSelect.addEventListener('change', updateMaxExtraSeq);
    }
});

document.getElementById('colabfold-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        // Disable submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        const inputMethod = document.getElementById('input-method').value;
        let input, displayName;
        
        if (inputMethod === 'paste') {
            const sequenceData = document.getElementById('sequence').value.trim();
            if (!sequenceData) {
                alert('Please enter a protein sequence.');
                return;
            }
            
            // Validate sequence
            if (!window.proteinToolsService.validateFASTA(sequenceData)) {
                // Check if sequence is too short
                let sequence = sequenceData.trim();
                if (sequence.startsWith('>')) {
                    const lines = sequence.split('\n');
                    if (lines.length > 1) {
                        sequence = lines.slice(1).join('').trim();
                    } else {
                        sequence = sequence.substring(1).trim();
                    }
                }
                sequence = sequence.replace(/\s/g, '');
                
                if (sequence.length < 10) {
                    alert('Protein sequence is too short. Please provide a sequence with at least 10 amino acids for meaningful structure prediction.');
                } else {
                    alert('Please enter a valid protein sequence containing only standard amino acid characters (ACDEFGHIKLMNPQRSTVWY).');
                }
                return;
            }
            
            input = sequenceData;
            displayName = 'Sequence data';
        } else {
            const fileInput = document.getElementById('fasta-file');
            if (!fileInput.files.length) {
                alert('Please select a FASTA file.');
                return;
            }
            
            const file = fileInput.files[0];
            if (!window.proteinToolsService.validateFASTA(file)) {
                alert('Please select a valid FASTA file.');
                return;
            }
            
            input = file;
            displayName = file.name;
        }
        
        // Get job name from form
        const jobNameInput = document.getElementById('job-name');
        const jobName = jobNameInput ? jobNameInput.value : '';
        
        // Get parameters from form
        const parameters = {
            modelType: document.getElementById('model-type').value,
            numRecycles: document.getElementById('num-recycles').value,
            maxSeq: document.getElementById('max-seq').value,
            maxExtraSeq: document.getElementById('max-extra-seq').value,
            numModels: document.getElementById('num-models').value,
        };

        // Submit job using service
        const jobResult = await window.proteinToolsService.runColabFold(input, parameters, jobName);
        
        if (jobResult.success) {
            alert(`ColabFold structure prediction job submitted successfully!

Job ID: ${jobResult.job.id}
Job Name: ${jobResult.job.jobName}
Input: ${displayName}
Status: ${jobResult.job.status}

The job is now running on the server! This may take several minutes to complete.
You can track your job progress in the Jobs section.`);
            
            // Reset form
            document.getElementById('colabfold-form').reset();
            toggleInputMethod(); // Reset UI state
            console.log('ColabFold job submitted successfully:', jobResult.job);
        }
    } catch (error) {
        alert('ColabFold job submission failed: ' + error.message);
        console.error('ColabFold submission error:', error);
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});
