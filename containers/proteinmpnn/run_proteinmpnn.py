#!/usr/bin/env python3
"""
Simple script to run ProteinMPNN by copying PDB files into the container.
This avoids volume mounting issues and works reliably across different systems.
"""

import subprocess
import time
import csv
from datetime import datetime
from pathlib import Path

def check_docker():
    """Check if Docker is available and running."""
    try:
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True)
        if result.returncode != 0:
            print("Error: Docker is not installed or not in PATH")
            return False
        
        # Check if Docker daemon is running
        result = subprocess.run(['docker', 'info'], capture_output=True, text=True)
        if result.returncode != 0:
            print("Error: Docker daemon is not running")
            return False
        
        return True
    except FileNotFoundError:
        print("Error: Docker is not installed")
        return False

def check_gpu_support():
    """Check if GPU support is available."""
    try:
        # Test GPU support using our own proteinmpnn container
        result = subprocess.run(['docker', 'run', '--rm', '--gpus', 'all', 'proteinmpnn', 'python', '-c', 'import torch; print(torch.cuda.is_available())'], 
                              capture_output=True, text=True, timeout=30)
        return result.returncode == 0 and 'True' in result.stdout
    except:
        return False

def run_proteinmpnn_on_file(pdb_file, output_dir, num_sequences=5, temperature=0.1, seed=37, use_gpu=True):
    """Run ProteinMPNN on a single PDB file by copying it into the container."""
    
    print(f"  Processing {pdb_file.name}...")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Verify input file exists
    if not pdb_file.exists():
        raise FileNotFoundError(f"Input PDB file not found: {pdb_file}")
    
    # Create a temporary container to copy the file and run ProteinMPNN
    container_name = f"proteinmpnn_temp_{int(time.time())}"
    
    try:
        # Step 1: Start a container in detached mode
        start_cmd = ['docker', 'run', '-d', '--name', container_name]
        if use_gpu:
            start_cmd.extend(['--gpus', 'all'])
        start_cmd.extend(['proteinmpnn', 'tail', '-f', '/dev/null'])  # Keep container running
        
        print(f"  Starting container: {container_name}")
        result = subprocess.run(start_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to start container: {result.stderr}")
        
        # Step 2: Copy PDB file into container
        copy_cmd = ['docker', 'cp', str(pdb_file), f'{container_name}:/data/input/{pdb_file.name}']
        print(f"  Copying {pdb_file.name} into container...")
        result = subprocess.run(copy_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Failed to copy file: {result.stderr}")
        
        # Step 3: Run ProteinMPNN using docker exec
        run_cmd = [
            'docker', 'exec', container_name,
            'python', '/app/protein_mpnn_run.py',
            '--pdb_path', f'/data/input/{pdb_file.name}',
            '--out_folder', '/data/output',
            '--num_seq_per_target', str(num_sequences),
            '--sampling_temp', str(temperature),
            '--seed', str(seed)
        ]
        
        print(f"  Running ProteinMPNN with {num_sequences} sequences, temperature {temperature}...")
        result = subprocess.run(run_cmd, capture_output=True, text=True, timeout=300)
        
        # Step 4: Copy results back
        if result.returncode == 0:
            copy_back_cmd = ['docker', 'cp', f'{container_name}:/data/output/.', str(output_dir)]
            print(f"  Copying results back...")
            copy_result = subprocess.run(copy_back_cmd, capture_output=True, text=True)
            if copy_result.returncode != 0:
                print(f"  Warning: Failed to copy results back: {copy_result.stderr}")
        
        return result
        
    finally:
        # Clean up: Remove the container
        cleanup_cmd = ['docker', 'rm', '-f', container_name]
        subprocess.run(cleanup_cmd, capture_output=True, text=True)

def run_benchmark():
    """Run the benchmark for all PDB files."""
    
    # Check prerequisites
    if not check_docker():
        return
    
    # Setup paths
    input_dir = Path("input")
    output_dir = Path("output")
    csv_file = "proteinmpnn_benchmark.csv"
    
    # Create directories
    input_dir.mkdir(exist_ok=True)
    output_dir.mkdir(exist_ok=True)
    
    # Check GPU support
    gpu_available = check_gpu_support()
    if gpu_available:
        print("✓ GPU support detected")
    else:
        print("⚠ GPU support not available, will run on CPU")
    
    # CSV header
    fieldnames = [
        'timestamp', 'input_file', 'file_size_kb', 'num_sequences', 'temperature', 
        'runtime_seconds', 'success', 'gpu_used', 'sequences_generated', 'output_files'
    ]
    
    # Create CSV file with header
    with open(csv_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
    print(f"Created CSV file: {csv_file}")
    
    # Find all PDB files
    pdb_files = list(input_dir.glob("*.pdb"))
    
    if not pdb_files:
        print(f"No PDB files found in {input_dir}")
        print(f"Please place PDB files in the '{input_dir}' directory")
        return
    
    print(f"Found {len(pdb_files)} PDB files to benchmark")
    
    # Benchmark parameters
    test_configs = [
        {'num_sequences': 5, 'temperature': 0.1},
        {'num_sequences': 10, 'temperature': 0.2},
        {'num_sequences': 3, 'temperature': 0.05}
    ]
    
    for config in test_configs:
        print(f"\n=== Running with {config['num_sequences']} sequences, temperature {config['temperature']} ===")
        
        for pdb_file in pdb_files:
            print(f"\nBenchmarking: {pdb_file.name}")
            
            # Get file size
            file_size_kb = pdb_file.stat().st_size / 1024
            
            # Create unique output subdirectory
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            run_output_dir = output_dir / f"{pdb_file.stem}_{config['num_sequences']}seq_{config['temperature']}temp_{timestamp}"
            
            # Run ProteinMPNN
            start_time = time.time()
            
            try:
                result = run_proteinmpnn_on_file(
                    pdb_file, run_output_dir, 
                    num_sequences=config['num_sequences'],
                    temperature=config['temperature'],
                    use_gpu=gpu_available
                )
                
                end_time = time.time()
                runtime = end_time - start_time
                
                # Check success and count outputs
                success = result.returncode == 0
                output_files = list(run_output_dir.glob("*")) if run_output_dir.exists() else []
                sequences_generated = len([f for f in output_files if f.suffix in ['.fa', '.fasta']])
                
                # Prepare row data
                row_data = {
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'input_file': pdb_file.name,
                    'file_size_kb': round(file_size_kb, 2),
                    'num_sequences': config['num_sequences'],
                    'temperature': config['temperature'],
                    'runtime_seconds': round(runtime, 2),
                    'success': success,
                    'gpu_used': gpu_available,
                    'sequences_generated': sequences_generated,
                    'output_files': len(output_files)
                }
                
                # Write to CSV
                with open(csv_file, 'a', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writerow(row_data)
                
                if success:
                    print(f"✓ Completed {pdb_file.name} in {runtime:.2f}s")
                    print(f"  Generated {sequences_generated} sequences")
                    print(f"  Output saved to: {run_output_dir}")
                else:
                    print(f"✗ Failed {pdb_file.name}")
                    print(f"  Error: {result.stderr}")
                    if result.stdout:
                        print(f"  Output: {result.stdout}")
                
            except Exception as e:
                print(f"✗ Error benchmarking {pdb_file.name}: {e}")
                
                # Log the error
                row_data = {
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'input_file': pdb_file.name,
                    'file_size_kb': round(file_size_kb, 2),
                    'num_sequences': config['num_sequences'],
                    'temperature': config['temperature'],
                    'runtime_seconds': 0,
                    'success': False,
                    'gpu_used': False,
                    'sequences_generated': 0,
                    'output_files': 0
                }
                
                with open(csv_file, 'a', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writerow(row_data)
            
            # Small delay between runs
            time.sleep(2)
        
        # Delay between different configurations
        time.sleep(5)
    
    print(f"\nBenchmark completed! Results saved to {csv_file}")
    
    # Print summary
    print("\n=== BENCHMARK SUMMARY ===")
    try:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            
        successful_runs = [r for r in rows if r['success'] == 'True']
        total_runs = len(rows)
        
        print(f"Total runs: {total_runs}")
        print(f"Successful runs: {len(successful_runs)}")
        print(f"Success rate: {len(successful_runs)/total_runs*100:.1f}%")
        
        if successful_runs:
            avg_runtime = sum(float(r['runtime_seconds']) for r in successful_runs) / len(successful_runs)
            print(f"Average runtime: {avg_runtime:.2f}s")
            
    except Exception as e:
        print(f"Error generating summary: {e}")

if __name__ == "__main__":
    print("ProteinMPNN Container Processing Script")
    print("=====================================")
    print("This script will:")
    print("1. Look for PDB files in the 'input' directory")
    print("2. Copy each PDB file into a Docker container")
    print("3. Run ProteinMPNN inside the container")
    print("4. Copy results back to the 'output' directory")
    print("5. Generate a benchmark CSV file")
    print()
    
    run_benchmark() 