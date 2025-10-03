# LocalColabFold Docker Container

This repository contains a Dockerfile for running LocalColabFold, a tool for protein structure prediction that can run locally without requiring Google Colab.

## Prerequisites

- Docker installed on your system
- NVIDIA GPU with CUDA support (12.4 recommended, 11.8 or later required)
- NVIDIA Container Toolkit installed

## Building the Container

To build the container, run:

```bash
docker build -t localcolabfold .
```

## Running the Container

### Basic Usage
To run a basic prediction without templates or relaxation:

```bash
docker run --gpus all \
  -v $(pwd)/input:/app/input \
  -v $(pwd)/output:/app/output \
  localcolabfold \
  colabfold_batch /app/input/sequence.fasta /app/output
```

### Advanced Usage
To run prediction with templates and amber relaxation:

```bash
docker run --gpus all \
  -v $(pwd)/input:/app/input \
  -v $(pwd)/output:/app/output \
  localcolabfold \
  colabfold_batch --templates --amber /app/input/sequence.fasta /app/output
```

## Input Format

Your input should be a FASTA format file containing the protein sequence(s) you want to predict. Example:

```
>protein_name
SEQUENCE_HERE
```

For protein complexes, separate sequences with ':' in the FASTA file:
```
>complex_name
SEQUENCE1:SEQUENCE2
```

## Model Types

The container automatically detects whether to use:
- `alphafold2_ptm` for monomers
- `alphafold2_multimer_v3` for complexes

You can manually specify other model types:
- `alphafold2_multimer_v1`
- `alphafold2_multimer_v2`

## Output

The output will be saved in the specified output directory and will include:
- PDB files of the predicted structures
- PAE (Predicted Aligned Error) plots
- Confidence scores
- Other relevant prediction metrics

## Notes

- The container uses CUDA 12.4 and GCC 12 for optimal compatibility
- For amber relaxation, the container is pre-configured with the correct library paths
- GPU memory requirements vary based on sequence length
- For best results, ensure your GPU has at least 8GB of VRAM
- The installation script automatically downloads all necessary model parameters

## Troubleshooting

If you encounter any errors:
1. Ensure your NVIDIA drivers are up to date
2. Check that your input FASTA file is properly formatted
3. Verify that your GPU has enough memory for the sequence length
4. Make sure the input and output directories have proper permissions 