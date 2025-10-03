# LocalColabFold Docker Container - Technical Specifications

## Overview
This document provides comprehensive technical specifications for the LocalColabFold Docker container setup, including performance benchmarks, container details, and protein structure prediction capabilities.

## Container Specifications

### Docker Image Details
- **Image Name**: `localcolabfold:latest`
- **Image ID**: `0d9b66ffd2e1`
- **Container Size**: **42.6 GB**
- **Base Image**: NVIDIA CUDA 12.4.0 Runtime on Ubuntu 22.04 LTS
- **Architecture**: Linux x86_64 with CUDA support

### LocalColabFold Version
- **Installation Method**: Official installation script from YoshitakaMo/localcolabfold
- **Source**: `https://raw.githubusercontent.com/YoshitakaMo/localcolabfold/main/install_colabbatch_linux.sh`
- **ColabFold Version**: 1.5.5 (compatible with AlphaFold 2.3.2)
- **Build Type**: Conda-based installation with GPU acceleration

## Technology Stack

### Core Technologies
- **Containerization**: Docker with NVIDIA GPU support
- **Base OS**: Ubuntu 22.04 LTS
- **CUDA Runtime**: 12.4.0 (recommended for ColabFold 1.5.5+)
- **Protein Structure Prediction**: ColabFold (AlphaFold2 implementation)
- **Environment Management**: Conda/Miniconda
- **Compiler**: GCC 12.0+ (required for OpenMM 8.0.0)

### Dependencies
- **Python**: 3.10 (conda environment)
- **MMseqs2**: 14.7e284 (sequence search)
- **HH-suite**: 3.3.0 (profile HMMs)
- **Kalign**: 2.04 (multiple sequence alignment)
- **JAX**: GPU-accelerated machine learning framework
- **OpenMM**: Molecular dynamics (for --amber relaxation)
- **TensorFlow**: Neural network backend

### Programming Languages
- **Python 3.10**: Core ColabFold implementation and benchmarking
- **Bash**: Container orchestration and environment setup
- **C++**: MMseqs2 and HH-suite core components
- **CUDA**: GPU acceleration kernels

## Model Specifications

### AlphaFold2 Models
- **Model Types**: 
  - `alphafold2_ptm` (monomers, default)
  - `alphafold2_multimer_v3` (complexes, default)
  - `alphafold2_multimer_v1/v2` (legacy multimer models)
- **Model Count**: 5 models per prediction (default)
- **Parameter Source**: Automatically downloaded from ColabFold servers
- **Model Size**: ~1.5 GB per model type

### Prediction Parameters

**Default Configuration**
- **Recycles**: 3 (default, configurable)
- **MSA Mode**: mmseqs2_uniref_env (UniRef30 + Environmental)
- **Templates**: Optional PDB template usage
- **Relaxation**: Optional OpenMM/Amber energy minimization
- **Random Seeds**: Configurable for ensemble predictions

**Optimized Configuration (Used in 7CWM Benchmark)**
- **MSA Mode**: mmseqs2_uniref_env (UniRef30 + Environmental)
- **Pair Mode**: unpaired_paired (optimized pairing strategy)
- **Model Type**: auto (automatic model selection)
- **Recycles**: 3 (structure refinement iterations)
- **Model Count**: 1 (reduced from 5 for 5x speed improvement)
- **Pair Strategy**: greedy (efficient complex pairing)
- **Seeds**: 1 (single random seed)
- **Relax Max Iterations**: 200 (energy minimization limit)
- **Stop at Score**: 100 (early stopping for high confidence)

## Input Structure Analysis

### Sample Protein (test.fasta)
- **Protein Name**: test_protein (Insulin-like peptide)
- **Sequence**: `MALLWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT`
- **Sequence Length**: 55 residues
- **File Size**: 70 bytes
- **Protein Type**: Single-chain monomer

### Sequence Characteristics
- **N-terminal Signal**: MALLWMRLLPLLALLALWG (19 residues)
- **Mature Peptide**: PDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKT (36 residues)
- **Disulfide Bonds**: Potential (contains 2 cysteine residues)
- **Hydrophobic Regions**: Multiple (signal peptide and core regions)

## Performance Benchmarks

### Benchmark Environment
- **OS**: Linux 5.15.153.1-microsoft-standard-WSL2 (Windows Subsystem for Linux)
- **CPU**: 16 cores (AMD architecture with AVX2 support)
- **Memory**: 15.15 GB total system RAM
- **GPU**: NVIDIA GeForce RTX 4060 Ti (8 GB VRAM)
- **Storage**: SSD with Docker volume mounting

### Benchmark Results

#### Small Protein (test_protein - 55 residues)

**Performance Metrics**
```
Runtime: 2.26 minutes (135.6 seconds)
Max CPU Usage: 100.0% (peak during model inference)
Max Memory Usage: 3,394.8 MB (3.3 GB)
Max GPU Memory: 6,857.0 MB (6.7 GB VRAM)
Max GPU Utilization: 99.0%
Storage Generated: 1.1 MB output files
```

**Confidence Scores**
```
Rank 1: pLDDT=72.0, pTM=0.312 (alphafold2_ptm_model_3)
Rank 2: pLDDT=69.7, pTM=0.300 (alphafold2_ptm_model_4)  
Rank 3: pLDDT=66.1, pTM=0.326 (alphafold2_ptm_model_1)
Rank 4: pLDDT=59.9, pTM=0.315 (alphafold2_ptm_model_5)
Rank 5: pLDDT=58.2, pTM=0.324 (alphafold2_ptm_model_2)
```

#### Large Protein Complex (7CWM - 1501 residues)

**Sample Description**
- **Protein Complex**: SARS-CoV-2 Spike protein with antibody fragments
- **Chain A**: Spike glycoprotein (1273 residues)
- **Chain B**: P17 heavy chain (120 residues) 
- **Chain C**: P17 light chain (108 residues)
- **Total Length**: 1501 residues
- **Complexity**: Multi-chain protein-antibody complex

**Performance Metrics**
```
Runtime: 25.64 minutes (1538.4 seconds)
Max CPU Usage: 100.0% (sustained during inference)
Max Memory Usage: 3,394.8 MB (3.3 GB)
Max GPU Memory: 6,857.0 MB (6.7 GB VRAM)
Max GPU Utilization: 99.0%
Storage Generated: 37.0 MB output files
```

**Confidence Scores by Chain**
```
Chain A (Spike, 1273 residues): pLDDT=64.6, pTM=0.47
Chain B (Heavy, 120 residues):  pLDDT=93.3, pTM=0.867
Chain C (Light, 108 residues):  pLDDT=97.8, pTM=0.895
```

**Detailed Performance Profile**
- **Chain C (Light)**: 4.3 seconds (highest confidence, pLDDT=97.8)
- **Chain B (Heavy)**: 69.8 seconds (high confidence, pLDDT=93.3)
- **Chain A (Spike)**: 1375.1 seconds (lower confidence, pLDDT=64.6)
- **MSA Generation**: Variable per chain (largest for Spike protein)
- **Memory Efficiency**: Consistent RAM usage despite 27x sequence length increase

#### Resource Utilization Profile
- **CPU Intensive Phases**: MSA generation, template processing
- **GPU Intensive Phases**: Neural network inference (1 model × 3 recycles, optimized)
- **Memory Peak**: During model loading and inference
- **I/O Operations**: MSA download, model parameter loading, result writing
- **Scaling**: Linear runtime scaling with sequence length complexity

## Output Specifications

### File Organization

**Small Protein (55 residues)**
```
output/
└── {experiment_id}/
    ├── cite.bibtex                    - Citation information (2.7 KB)
    ├── config.json                    - Prediction configuration (1.1 KB)
    ├── log.txt                        - Detailed execution log (3.1 KB)
    ├── test_protein.a3m               - Multiple sequence alignment (190 KB)
    ├── test_protein.done.txt          - Completion marker (0 bytes)
    ├── test_protein_coverage.png      - MSA coverage plot (97 KB)
    ├── test_protein_env/              - Environment-specific MSA data
    ├── test_protein_pae.png           - Predicted aligned error plot (76 KB)
    ├── test_protein_plddt.png         - Confidence plot (157 KB)
    ├── test_protein_predicted_aligned_error_v1.json - PAE data (20 KB)
    ├── test_protein_scores_rank_*.json - Model confidence scores (20 KB each)
    └── test_protein_unrelaxed_rank_*.pdb - 3D structure files (35 KB each)
```

**Large Protein Complex (1501 residues)**
```
output/
└── {experiment_id}/
    ├── cite.bibtex                    - Citation information (2.7 KB)
    ├── config.json                    - Prediction configuration (1.1 KB)
    ├── log.txt                        - Detailed execution log (2.5 KB)
    ├── 7CWM_1_*_Spike_*.a3m          - Spike protein MSA (1.1 MB)
    ├── 7CWM_1_*_Spike_*.done.txt     - Completion marker (0 bytes)
    ├── 7CWM_1_*_Spike_*_coverage.png - MSA coverage plot (137 KB)
    ├── 7CWM_1_*_Spike_*_env/         - Environment-specific MSA data
    ├── 7CWM_1_*_Spike_*_pae.png      - Predicted aligned error plot (147 KB)
    ├── 7CWM_1_*_Spike_*_plddt.png    - Confidence plot (142 KB)
    ├── 7CWM_1_*_Spike_*_predicted_aligned_error_v1.json - PAE data (10.5 MB)
    ├── 7CWM_1_*_Spike_*_scores_rank_*.json - Model confidence scores (10.5 MB)
    ├── 7CWM_1_*_Spike_*_unrelaxed_rank_*.pdb - 3D structure files (786 KB)
    ├── 7CWM_2_*_heavy_chain_*.a3m    - Heavy chain MSA (2.2 MB)
    ├── 7CWM_2_*_heavy_chain_*.[files] - Heavy chain outputs (similar structure)
    ├── 7CWM_3_*_light_chain_*.a3m    - Light chain MSA (2.6 MB)
    └── 7CWM_3_*_light_chain_*.[files] - Light chain outputs (similar structure)
```

### Structure Files
- **Format**: PDB (Protein Data Bank)
- **Count**: 1 model (optimized for speed)
- **Ranking**: By pLDDT score (confidence)
- **Coordinates**: Unrelaxed (unless --amber flag used)
- **Size**: 
  - Small proteins (55 residues): ~35 KB per structure
  - Large proteins (1273 residues): ~786 KB per structure
  - Antibody chains (108-120 residues): ~66-75 KB per structure

### Visualization Files
- **Coverage Plot**: MSA depth and quality visualization
- **pLDDT Plot**: Per-residue confidence scores
- **PAE Plot**: Predicted aligned error between residue pairs
- **Format**: PNG images (publication-ready)

## Benchmarking Capabilities

### Automated Metrics Collection
- **Experiment ID**: Timestamp-based unique identifiers
- **Sequence Analysis**: Automatic FASTA parsing and length calculation
- **Resource Monitoring**: Real-time CPU, RAM, GPU utilization
- **Storage Tracking**: Input/output file size measurements
- **Runtime Profiling**: Precise execution timing

### CSV Output Format
```csv
experiment_id,input_sequence_length,storage_needed_gb,cpu_used,
cpu_cores_used,ram_gb,gpu_used,gpu_specs,vram_gb,runtime_minutes
```

### Benchmark Script Features
- **Multi-file Processing**: Batch processing of FASTA files
- **System Detection**: Automatic hardware specification detection
- **Error Handling**: Graceful failure recovery and logging
- **Progress Monitoring**: Real-time status updates
- **Resource Cleanup**: Automatic container management

## System Recommendations

### Minimum Requirements
- **CPU**: x86_64 with AVX2 support, 8 cores recommended
- **RAM**: 8 GB minimum, 16 GB recommended
- **GPU**: NVIDIA GPU with 6 GB VRAM minimum, 8 GB+ recommended
- **Storage**: 50 GB for container + models + temporary files
- **Docker**: Version 20.10+ with NVIDIA Container Toolkit
- **CUDA**: 12.1+ drivers (12.4 recommended)

### Recommended Configuration
- **CPU**: 16+ cores (AMD Ryzen or Intel Core i7/i9)
- **RAM**: 32 GB for large proteins and multimers
- **GPU**: RTX 4060 Ti / RTX 4070 or better (8+ GB VRAM)
- **Storage**: NVMe SSD for optimal I/O performance
- **Network**: High-bandwidth for MSA server queries

### Docker Configuration
```bash
# Required Docker run parameters
--gpus all                    # GPU access
-v input:/app/input          # Input volume mount
-v output:/app/output        # Output volume mount
```

---

*Last Updated: July 3, 2025*  
*Container Version: localcolabfold:latest (42.6GB)*  
*ColabFold Version: 1.5.5 (AlphaFold 2.3.2 compatible)*  
*CUDA Version: 12.4.0*  
*Benchmark Data: 7CWM (1501 residues) + test_protein (55 residues)* 