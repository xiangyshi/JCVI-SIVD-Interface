#!/usr/bin/env python3
"""
Run ColabFold using Docker container with CLI parameters.

This script accepts command line arguments and runs ColabFold through Docker.
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
    parser = argparse.ArgumentParser(description='Run ColabFold using Docker')
    parser.add_argument('input_file', help='FASTA file to process')
    parser.add_argument('--model-type', default='auto', help='Model type (default: auto)')
    parser.add_argument('--num-models', type=int, default=5, help='Number of models (default: 5)')
    parser.add_argument('--num-recycles', type=int, default=3, help='Number of recycles (default: 3)')
    parser.add_argument('--max-seq', type=int, help='Maximum sequence clusters (default: auto)')
    parser.add_argument('--max-extra-seq', type=int, help='Maximum extra sequences (default: auto)')
    parser.add_argument('--max-msa', default='auto', help='Maximum MSA sequences in format max_seq:max_extra_seq (default: auto)')
    parser.add_argument('--output-dir', default='output', help='Output directory (default: output)')
    parser.add_argument('--use-gpu', action='store_true', default=True, help='Use GPU if available')
    
    return parser.parse_args()

def check_docker():
    """Check if Docker is available."""
    try:
        subprocess.run(['docker', '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_msg("31", "Error: Docker is not available")
        return False

def run_colabfold_docker(input_file, output_dir, model_type, num_models, num_recycles, max_seq=None, max_extra_seq=None, max_msa='auto', use_gpu=True):
    """Run ColabFold using Docker container."""
    
    script_dir = Path(__file__).parent.absolute()
    input_path = Path(input_file).absolute()
    output_path = (script_dir / output_dir).absolute()
    
    # Ensure input file exists
    if not input_path.exists():
        print_msg("31", f"Input file does not exist: {input_path}")
        return 1
    
    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Docker paths (inside container)
    docker_input = f"/data/{input_path.relative_to(script_dir)}"
    docker_output = f"/data/{output_path.relative_to(script_dir)}"
    
    # Build ColabFold command
    cmd = [
        "docker", "run", "--rm"
    ]
    
    # Add GPU support if requested and available
    if use_gpu:
        cmd.extend(["--gpus", "all"])
    
    cmd.extend([
        "-v", f"{script_dir}:/data",
        "colabfold",
        "colabfold_batch",
        docker_input,
        docker_output,
        "--model-type", model_type,
        "--num-models", str(num_models),
        "--num-recycle", str(num_recycles)
    ])
    
    # Handle max-seq and max-extra-seq parameters
    if max_seq is not None and max_extra_seq is not None:
        # Both parameters provided, use them together
        cmd.extend(["--max-msa", f"{max_seq}:{max_extra_seq}"])
    elif max_seq is not None:
        # Only max_seq provided, use default ratio
        cmd.extend(["--max-msa", f"{max_seq}:{max_seq * 2}"])
    elif max_extra_seq is not None:
        # Only max_extra_seq provided, use default ratio
        max_seq_val = max_extra_seq // 2
        cmd.extend(["--max-msa", f"{max_seq_val}:{max_extra_seq}"])
    elif max_msa != 'auto':
        # Legacy max-msa parameter provided
        max_msa_value = str(max_msa)
        if ':' not in max_msa_value:
            # If it's a single number, convert to format "number:number*2"
            max_seq_val = int(max_msa_value)
            max_msa_value = f"{max_seq_val}:{max_seq_val * 2}"
        cmd.extend(["--max-msa", max_msa_value])
    
    print_msg("36", f"Running: {' '.join(cmd)}")
    print_msg("34", f"Input: {input_path.name}")
    print_msg("34", f"Model type: {model_type}")
    print_msg("34", f"Number of models: {num_models}")
    print_msg("34", f"GPU: {'Yes' if use_gpu else 'No'}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print_msg("32", f"✓ ColabFold completed successfully")
            print_msg("32", f"✓ Results saved to: {output_path}")
            
            # List output files
            output_files = list(output_path.rglob("*.pdb"))
            if output_files:
                print_msg("32", f"✓ Generated {len(output_files)} structure files")
                for f in output_files[:3]:  # Show first 3
                    print_msg("37", f"  - {f.name}")
                if len(output_files) > 3:
                    print_msg("37", f"  ... and {len(output_files) - 3} more")
            
            return 0
        else:
            print_msg("31", f"✗ ColabFold failed with return code {result.returncode}")
            print_msg("31", f"STDERR: {result.stderr}")
            return result.returncode
            
    except Exception as e:
        print_msg("31", f"✗ Docker execution failed: {e}")
        return 1

def main():
    """Main function."""
    args = parse_args()
    
    print_msg("34", "🧬 ColabFold Docker Runner")
    print_msg("34", "=" * 50)
    
    # Check Docker availability
    if not check_docker():
        return 1
    
    # Run ColabFold
    return run_colabfold_docker(
        args.input_file,
        args.output_dir,
        args.model_type,
        args.num_models,
        args.num_recycles,
        args.max_seq,
        args.max_extra_seq,
        args.max_msa,
        args.use_gpu
    )

if __name__ == "__main__":
    sys.exit(main())
