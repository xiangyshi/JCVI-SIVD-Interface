#!/usr/bin/env python3
"""
Run ProteinMPNN using Docker container with CLI parameters.

This script accepts command line arguments and runs ProteinMPNN through Docker.
"""

import subprocess
import sys
import argparse
from pathlib import Path
import os

def print_msg(color: str, msg: str):
    """Print colored message to terminal."""
    print(f"\033[{color}m{msg}\033[0m")

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Run ProteinMPNN using Docker')
    parser.add_argument('input_file', help='PDB file to process')
    parser.add_argument('--chains', default='all', help='Chains to design ("all" for all chains)')
    parser.add_argument('--num-designs', type=int, default=10, help='Number of designs (default: 10)')
    parser.add_argument('--temperature', type=str, default='0.1', help='Sampling temperature string (e.g., "0.1" or "0.2 0.25")')
    parser.add_argument('--omit-aa', default='', help='Amino acids to omit')
    parser.add_argument('--output-dir', default='output', help='Output directory (default: output)')
    # Extended options
    parser.add_argument('--model-name', default='v_48_020', help='ProteinMPNN model: v_48_002, v_48_010, v_48_020, v_48_030')
    parser.add_argument('--batch-size', type=int, default=1, help='Batch size (default: 1)')
    parser.add_argument('--ca-only', action='store_true', default=False, help='Use CA-only models (default: false)')
    parser.add_argument('--max-length', type=int, help='Max sequence length (safety)')
    parser.add_argument('--seed', type=int, help='Random seed for reproducibility')
    parser.add_argument('--save-score', type=int, choices=[0,1], help='Save score (-log_prob) to npy (0/1)')
    parser.add_argument('--save-probs', type=int, choices=[0,1], help='Save per-position probabilities (0/1)')
    
    return parser.parse_args()

def check_docker():
    """Check if Docker is available."""
    try:
        subprocess.run(['docker', '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_msg("31", "Error: Docker is not available")
        return False

def run_proteinmpnn_docker(input_file, output_dir, chains, num_designs, temperature, omit_aa,
                           model_name='v_48_020', batch_size=1, ca_only=False,
                           max_length=None, seed=None, save_score=None, save_probs=None):
    """Run ProteinMPNN using Docker container."""
    
    import subprocess
    import shutil
    
    script_dir = Path(__file__).parent.absolute()
    
    # Handle input file path - if it's relative, make it relative to current working directory
    if Path(input_file).is_absolute():
        input_path = Path(input_file)
    else:
        input_path = Path.cwd() / input_file
    
    output_path = (script_dir / output_dir).absolute()
    
    # Ensure input file exists
    if not input_path.exists():
        print_msg("31", f"Input file does not exist: {input_path}")
        print_msg("31", f"Current working directory: {Path.cwd()}")
        print_msg("31", f"Script directory: {script_dir}")
        return 1
    
    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Docker paths (inside container)
    docker_input = f"/data/{input_path.relative_to(script_dir)}"
    docker_output = f"/data/{output_path.relative_to(script_dir)}"
    
    # Build ProteinMPNN command
    cmd = [
        "docker", "run", "--rm",
        "-v", f"{script_dir}:/data",
        "proteinmpnn",
        "python", "/app/protein_mpnn_run.py",
        "--pdb_path", docker_input,
        "--out_folder", docker_output,
        "--num_seq_per_target", str(num_designs),
        "--sampling_temp", str(temperature),
        "--model_name", str(model_name),
        "--batch_size", str(batch_size)
    ]

    # Only restrict chains if not requesting all
    if chains and str(chains).strip().lower() != 'all':
        cmd.insert(cmd.index("--out_folder"), "--pdb_path_chains")
        cmd.insert(cmd.index("--out_folder"), chains)
    
    if omit_aa:
        cmd.extend(["--omit_AAs", omit_aa])

    if ca_only:
        cmd.append("--ca_only")
    if max_length is not None:
        cmd.extend(["--max_length", str(max_length)])
    if seed is not None:
        cmd.extend(["--seed", str(seed)])
    if save_score is not None:
        cmd.extend(["--save_score", str(save_score)])
    if save_probs is not None:
        cmd.extend(["--save_probs", str(save_probs)])
    
    print_msg("36", f"Running: {' '.join(cmd)}")
    print_msg("34", f"Input: {input_path.name}")
    print_msg("34", f"Chains: {chains}")
    print_msg("34", f"Designs: {num_designs}")
    print_msg("34", f"Temperature: {temperature}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print_msg("32", f"✓ ProteinMPNN completed successfully")
            print_msg("32", f"✓ Results saved to: {output_path}")
            
            # Clean up the output structure - move files from seqs/ subdirectory to main output directory
            seqs_dir = output_path / "seqs"
            if seqs_dir.exists():
                print_msg("34", "Reorganizing output structure...")
                
                # Move all .fa files from seqs/ to the main output directory
                fa_files = list(seqs_dir.glob("*.fa"))
                for fa_file in fa_files:
                    target_path = output_path / fa_file.name
                    if target_path.exists():
                        target_path.unlink()  # Remove existing file if it exists
                    
                    # Use subprocess with sudo to move the file (handle permission issues)
                    try:
                        result = subprocess.run(['sudo', 'mv', str(fa_file), str(target_path)], 
                                             capture_output=True, text=True, check=True)
                        print_msg("32", f"Moved {fa_file.name} to output directory")
                    except subprocess.CalledProcessError as e:
                        print_msg("31", f"Failed to move {fa_file.name}: {e}")
                        # Fallback: try to copy and then remove
                        try:
                            shutil.copy2(fa_file, target_path)
                            fa_file.unlink()
                            print_msg("32", f"Copied {fa_file.name} to output directory")
                        except Exception as copy_error:
                            print_msg("31", f"Failed to copy {fa_file.name}: {copy_error}")
                
                # Remove the seqs directory
                try:
                    shutil.rmtree(seqs_dir)
                    print_msg("32", "Removed seqs subdirectory")
                except Exception as e:
                    print_msg("31", f"Failed to remove seqs directory: {e}")
                    # Fallback: use sudo
                    try:
                        subprocess.run(['sudo', 'rm', '-rf', str(seqs_dir)], 
                                     capture_output=True, text=True, check=True)
                        print_msg("32", "Removed seqs subdirectory with sudo")
                    except subprocess.CalledProcessError as sudo_error:
                        print_msg("31", f"Failed to remove seqs directory even with sudo: {sudo_error}")
            
            # List output files (now directly in the output directory)
            output_files = list(output_path.glob("*.fa"))
            if output_files:
                print_msg("32", f"✓ Generated {len(output_files)} sequence files")
                for f in output_files[:3]:  # Show first 3
                    print_msg("37", f"  - {f.name}")
                if len(output_files) > 3:
                    print_msg("37", f"  ... and {len(output_files) - 3} more")
            
            return 0
        else:
            print_msg("31", f"✗ ProteinMPNN failed with return code {result.returncode}")
            print_msg("31", f"STDERR: {result.stderr}")
            return result.returncode
            
    except Exception as e:
        print_msg("31", f"✗ Docker execution failed: {e}")
        return 1

def main():
    """Main function."""
    args = parse_args()
    
    print_msg("34", "🧬 ProteinMPNN Docker Runner")
    print_msg("34", "=" * 50)
    
    # Check Docker availability
    if not check_docker():
        return 1
    
    # Run ProteinMPNN
    return run_proteinmpnn_docker(
        args.input_file,
        args.output_dir,
        args.chains,
        args.num_designs,
        args.temperature,
        args.omit_aa,
        args.model_name,
        args.batch_size,
        args.ca_only,
        args.max_length,
        args.seed,
        args.save_score,
        args.save_probs
    )

if __name__ == "__main__":
    sys.exit(main())
