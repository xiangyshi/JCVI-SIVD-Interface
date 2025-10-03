# ProteinMPNN Docker Container

This Docker container provides a ready-to-use environment for running ProteinMPNN, a powerful deep learning model for protein sequence design.

## Prerequisites

- Docker installed on your system
- NVIDIA GPU with CUDA support (recommended)
- nvidia-docker2 installed (for GPU support)

## Building the Container

```bash
docker build -t proteinmpnn .
```

## Running the Container

### Basic Usage

```bash
# Run with GPU support
docker run --gpus all -it proteinmpnn

# Run without GPU
docker run -it proteinmpnn
```

### Running with Data Volumes

To process your own PDB files, mount a local directory containing your input files:

```bash
docker run --gpus all \
  -v /path/to/your/input:/data/input \
  -v /path/to/your/output:/data/output \
  -it proteinmpnn \
  python /app/protein_mpnn_run.py \
  --pdb_path /data/input/your_protein.pdb \
  --out_folder /data/output \
  --num_seq_per_target 5 \
  --sampling_temp "0.1" \
  --seed 37
```

## Example Commands

1. Design sequences for a single chain:
```bash
docker run --gpus all -v $(pwd):/data -it proteinmpnn \
  python /app/protein_mpnn_run.py \
  --pdb_path /data/input/protein.pdb \
  --chain_id A \
  --out_folder /data/output
```

2. Design sequences with fixed residues:
```bash
docker run --gpus all -v $(pwd):/data -it proteinmpnn \
  python /app/protein_mpnn_run.py \
  --pdb_path /data/input/protein.pdb \
  --chain_id A \
  --fixed_positions "10,11,12,13,14" \
  --out_folder /data/output
```

3. Design with higher sampling temperature for more diversity:
```bash
docker run --gpus all -v $(pwd):/data -it proteinmpnn \
  python /app/protein_mpnn_run.py \
  --pdb_path /data/input/protein.pdb \
  --sampling_temp "0.2" \
  --out_folder /data/output
```

## Important Notes

1. The container uses the latest version of ProteinMPNN from the official repository.
2. Input PDB files should be placed in the mounted input directory.
3. Results will be saved to the mounted output directory.
4. Use `--gpus all` flag only if you have NVIDIA GPU and nvidia-docker2 installed.

## Reference

If you use this container, please cite the original ProteinMPNN paper:

```
@article{dauparas2022robust,
  title={Robust deep learning--based protein sequence design using ProteinMPNN},
  author={Dauparas, Justas and others},
  journal={Science},
  volume={378},
  number={6615},
  pages={49--56},
  year={2022},
  publisher={American Association for the Advancement of Science}
}
``` 