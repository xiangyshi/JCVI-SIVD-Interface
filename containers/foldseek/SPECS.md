# Foldseek Docker Container - Technical Specifications

## Overview
This document provides comprehensive technical specifications for the Foldseek Docker container setup, including performance benchmarks, container details, and structural analysis capabilities.

## Container Specifications

### Docker Image Details
- **Image Name**: `foldseek:latest`
- **Image ID**: `f58676745072`
- **Container Size**: **163 MB**
- **Base Image**: Ubuntu 22.04 LTS
- **Architecture**: Linux x86_64 with AVX2 optimization

### Foldseek Version
- **Version Hash**: `e3fadcd07f971e864c094ac4f3a78bf4ed845e07`
- **Build Type**: Linux AVX2 optimized
- **Source**: Official MMseqs2/Foldseek distribution

## Technology Stack

### Core Technologies
- **Containerization**: Docker
- **Base OS**: Ubuntu 22.04 LTS
- **Protein Structure Search**: Foldseek (MMseqs2-based)
- **Optimization**: AVX2 instruction set support
- **3D Structure Alphabet**: 3Di (3D interaction alphabet)

### Dependencies
- **wget**: For downloading Foldseek binary
- **tar**: For extracting compressed archives
- **Standard C++ runtime**: For Foldseek execution

### Programming Languages
- **Python 3.10**: Orchestration and benchmarking scripts
- **Bash**: Container setup and basic benchmarking
- **C++**: Foldseek core implementation

## Database Specifications

### Influenza Database
- **Database Name**: `fsInfluenzaDB`
- **Total Size**: **4.3 MB**
- **Number of Structures**: 1,663 entries
- **Database Files**: 16 files (including indices, headers, and coordinate data)

### Database Components
```
fsInfluenzaDB           - Main database file (503 KB)
fsInfluenzaDB_ca        - Cα coordinate data (2.9 MB)
fsInfluenzaDB_h         - Header information (171 KB)
fsInfluenzaDB_ss        - Secondary structure data (503 KB)
+ Associated index and lookup files
```

## Input Structure Analysis

### Sample PDB Structure (7cwm.pdb)
- **Total Lines**: 31,610
- **ATOM Records**: 30,156
- **Unique Residue Types**: 20 standard amino acids
- **File Size**: 2.4 MB
- **Sequence Length**: ~3,883 residues (large protein complex)

### Atomic Composition - 7cwm.pdb (Top 10)
```
C     - 3,883 atoms (Carbon backbone)
CA    - 3,883 atoms (Alpha carbon)
CB    - 3,618 atoms (Beta carbon)
CD1   - 969 atoms   (Delta carbon 1)
CD2   - 806 atoms   (Delta carbon 2)
CD    - 824 atoms   (Delta carbon)
CE1   - 457 atoms   (Epsilon carbon 1)
CE2   - 446 atoms   (Epsilon carbon 2)
CE    - 206 atoms   (Epsilon carbon)
CE3   - 36 atoms    (Epsilon carbon 3)
```

### Sample PDB Structure (8oyu.pdb)
- **Total Lines**: 9,833
- **ATOM Records**: 9,829
- **Unique Residue Types**: 20 standard amino acids
- **File Size**: 778 KB
- **Sequence Length**: ~999 residues (medium-sized protein)

### Atomic Composition - 8oyu.pdb (Top 10)
```
C     - 1,254 atoms (Carbon backbone)
CA    - 1,254 atoms (Alpha carbon)
CB    - 1,172 atoms (Beta carbon)
CD1   - 320 atoms   (Delta carbon 1)
CD    - 283 atoms   (Delta carbon)
CD2   - 272 atoms   (Delta carbon 2)
CE1   - 156 atoms   (Epsilon carbon 1)
CE2   - 141 atoms   (Epsilon carbon 2)
CE    - 74 atoms    (Epsilon carbon)
CE3   - 10 atoms    (Epsilon carbon 3)
```

## Performance Benchmarks

### Benchmark Environment
- **OS**: Linux 5.15.153.1-microsoft-standard-WSL2
- **CPU**: AMD with AVX2 support (16 threads)
- **Memory**: Available system RAM
- **GPU**: NVIDIA GPU (detected, 1489 MB VRAM)

### Benchmark Results (Sample Runs)

#### 7cwm.pdb (Large Protein Complex)
```
Runtime: 12.82 seconds
Max CPU Usage: 36.4%
Mean CPU Usage: 12.15%
Max Memory Usage: 2,617.0 MB
Mean Memory Usage: 1,869.04 MB
Max GPU Memory: 4,683.0 MB
Max GPU Utilization: 43.0%
```

#### 8oyu.pdb (Medium-sized Protein)
```
Runtime: 6.09 seconds
Max CPU Usage: 14.4%
Mean CPU Usage: 5.55%
Max Memory Usage: 2,576.6 MB
Mean Memory Usage: 1,818.53 MB
Max GPU Memory: 4,526.0 MB
Max GPU Utilization: 53.0%
```

### Performance Comparison
- **Size Impact**: Larger structures (7cwm: 30K atoms) take ~2x longer than medium structures (8oyu: 10K atoms)
- **CPU Scaling**: CPU usage scales with structure complexity (36.4% vs 14.4% max)
- **Memory Efficiency**: Memory usage remains relatively constant (~2.6GB) regardless of input size
- **GPU Utilization**: Smaller structures achieve higher GPU utilization (53% vs 43%)

### Search Performance
- **Prefiltering**: 864 sequences passed per query
- **Results per Query**: Up to 1,000 matches
- **Alignment Mode**: Structural alignment with TMscore
- **Sensitivity**: 9.5 (high sensitivity mode)
- **k-mer Length**: 6

## Benchmarking Capabilities

### Test Dataset Diversity
- **Large Complex**: 7cwm.pdb (30,156 atoms, 2.4 MB, ~3,883 residues)
- **Medium Protein**: 8oyu.pdb (9,829 atoms, 778 KB, ~999 residues)
- **Size Ratio**: 3:1 atom count, 3:1 file size, 4:1 residue count
- **Performance Scaling**: 2:1 runtime ratio demonstrates sub-linear scaling

### Metrics Collected
- **Runtime**: Precise execution time (seconds)
- **CPU Usage**: Maximum, mean, and minimum percentages
- **Memory Usage**: Peak, average, and minimum RAM consumption (MB)
- **GPU Memory**: VRAM usage statistics (MB)
- **GPU Utilization**: Graphics processing unit load (%)
- **Input Metadata**: File names and timestamps

### Benchmark Output Format
```csv
timestamp,input_file,runtime_seconds,cpu_percent_max,cpu_percent_mean,
cpu_percent_min,memory_mb_max,memory_mb_mean,memory_mb_min,
gpu_memory_mb_max,gpu_memory_mb_mean,gpu_memory_mb_min,
gpu_utilization_max,gpu_utilization_mean,gpu_utilization_min
```

## Search Algorithm Details

### Foldseek Parameters
- **TMscore Threshold**: 0 (no cutoff)
- **E-value Threshold**: 10
- **Alignment Type**: 2 (structural alignment)
- **Sensitivity**: 9.5 (maximum sensitivity)
- **Substitution Matrix**: 3Di alphabet
- **Gap Penalties**: Open: 10, Extension: 1
- **Max Results**: 1,000 per query

### Search Pipeline
1. **Structure Parsing**: Convert PDB to internal format
2. **3Di Encoding**: Translate structure to 3Di alphabet
3. **Prefiltering**: k-mer based rapid screening
4. **Alignment**: Detailed structural alignment
5. **Scoring**: TMscore and E-value calculation
6. **Output**: Formatted results in TSV

## Output Specifications

### Result Format
- **Format**: Tab-separated values (TSV)
- **Default Columns**: query, target, alntmscore, evalue, pident, bits
- **Customizable**: Output format configurable via parameters

### File Organization
```
input/          - PDB query structures
database/       - Foldseek database files
output/         - Search results (TSV files)
tmp/            - Temporary processing files
```

## System Requirements

### Minimum Requirements
- **CPU**: x86_64 with AVX2 support
- **RAM**: 2 GB minimum, 4 GB recommended
- **Storage**: 500 MB for container + database size
- **Docker**: Version 20.10 or later

### Recommended Configuration
- **CPU**: Multi-core processor (8+ cores)
- **RAM**: 8 GB or more
- **Storage**: SSD for faster I/O
- **GPU**: NVIDIA GPU with CUDA support (optional)

## Scalability

### Batch Processing
- **Multiple Files**: Automatic processing of all PDB files in input directory
- **Parallel Execution**: Utilizes available CPU cores
- **Memory Management**: Efficient cleanup of temporary files
- **Progress Tracking**: Real-time monitoring and logging

### Container Efficiency
- **Startup Time**: < 1 second
- **Memory Overhead**: Minimal Docker overhead
- **Volume Mounting**: Zero-copy data access
- **Resource Cleanup**: Automatic container removal after execution

---

*Last Updated: July 2025*
*Container Version: foldseek:latest (163MB)*
*Foldseek Version: e3fadcd07f971e864c094ac4f3a78bf4ed845e07*
