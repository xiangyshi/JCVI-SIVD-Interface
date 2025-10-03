#!/usr/bin/env python3
"""
Run Foldseek easy-search on PDB structures using Docker container.

This script runs Foldseek through a Docker container, mounting the necessary
directories for input files, database, and output.

Usage:
    python run_foldseek_docker.py [OPTIONS] [QUERY_FILE]
    
Arguments:
    QUERY_FILE              Specific PDB file to process (optional, processes all if not specified)

Options:
    --input DIR             Input directory (default: input/)
    --output DIR            Output directory (default: output/)
    --db PATH               Database path (default: database/influenza/fsInfluenzaDB)
    --tmp DIR               Temporary directory (default: tmp/)
    --format FORMAT         Output format (default: query,target,alntmscore,evalue,pident,bits)
    --job-id ID             Job ID for creating job-specific directories and completion markers
    --sensitivity FLOAT     Search sensitivity (default: 9.5)
    --evalue FLOAT          E-value threshold (default: 10.0)
    --max-seqs INT          Maximum sequences per query (default: 1000)
    --threads INT           Number of threads (default: 8)
    --tmscore-threshold FLOAT  TM-score threshold (default: 0.0)
    --coverage FLOAT        Coverage threshold (default: 0.0)
    --min-seq-id FLOAT      Minimum sequence identity (default: 0.0)
    --alignment-mode INT    Alignment mode (default: 3)

Examples:
    # Process all PDB files with default parameters
    python run_foldseek_docker.py
    
    # Process specific file with custom sensitivity
    python run_foldseek_docker.py --sensitivity 8.0 7cwm.pdb
    
    # Custom database and output format
    python run_foldseek_docker.py --db custom/db --format "query,target,evalue" 8oyu.pdb

All arguments have sensible defaults matching the repository layout.
"""
import subprocess
import sys
from pathlib import Path
import os

SCRIPT_DIR = Path(__file__).resolve().parent

# Default locations based on current directory structure
DEFAULT_INPUT_DIR = SCRIPT_DIR / "input"
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "output"
DEFAULT_DB = SCRIPT_DIR / "database" / "influenza" / "fsInfluenzaDB"
DEFAULT_TMP = SCRIPT_DIR / "tmp"
DEFAULT_FORMAT = "query,target,alntmscore,evalue,pident,bits"


def print_msg(color: str, msg: str):
    """Print colored message to terminal."""
    print(f"\033[{color}m{msg}\033[0m")


def parse_args():
    """Parse command line arguments."""
    input_dir = DEFAULT_INPUT_DIR
    output_dir = DEFAULT_OUTPUT_DIR
    db_path = DEFAULT_DB
    tmp_dir = DEFAULT_TMP
    fmt = DEFAULT_FORMAT
    
    # Job management
    job_id = None
    
    # Foldseek parameters
    sensitivity = 9.5
    evalue = 10.0
    max_seqs = 1000
    threads = 8
    tmscore_threshold = 0.0
    coverage = 0.0
    min_seq_id = 0.0
    alignment_mode = 3
    query_file = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--input" and i + 1 < len(args):
            input_dir = Path(args[i + 1])
            i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output_dir = Path(args[i + 1])
            i += 2
        elif args[i] == "--db" and i + 1 < len(args):
            db_path = Path(args[i + 1])
            i += 2
        elif args[i] == "--tmp" and i + 1 < len(args):
            tmp_dir = Path(args[i + 1])
            i += 2
        elif args[i] == "--format" and i + 1 < len(args):
            fmt = args[i + 1]
            i += 2
        elif args[i] == "--sensitivity" and i + 1 < len(args):
            try:
                sensitivity = float(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid sensitivity value: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--evalue" and i + 1 < len(args):
            try:
                evalue = float(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid evalue: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--max-seqs" and i + 1 < len(args):
            try:
                max_seqs = int(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid max-seqs: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--threads" and i + 1 < len(args):
            try:
                threads = int(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid threads: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--tmscore-threshold" and i + 1 < len(args):
            try:
                tmscore_threshold = float(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid tmscore-threshold: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--coverage" and i + 1 < len(args):
            try:
                coverage = float(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid coverage: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--min-seq-id" and i + 1 < len(args):
            try:
                min_seq_id = float(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid min-seq-id: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--alignment-mode" and i + 1 < len(args):
            try:
                alignment_mode = int(args[i + 1])
            except ValueError:
                print_msg("31", f"Invalid alignment-mode: {args[i + 1]}")
                sys.exit(1)
            i += 2
        elif args[i] == "--job-id" and i + 1 < len(args):
            job_id = args[i + 1]
            i += 2
        elif args[i].startswith("--"):
            print_msg("31", f"Unknown option: {args[i]}")
            sys.exit(1)
        else:
            # This should be the query file
            if query_file is None:
                query_file = args[i]
                i += 1
            else:
                print_msg("31", f"Multiple query files specified: {query_file}, {args[i]}")
                sys.exit(1)
    
    params = {
        'sensitivity': sensitivity,
        'evalue': evalue,
        'max_seqs': max_seqs,
        'threads': threads,
        'tmscore_threshold': tmscore_threshold,
        'coverage': coverage,
        'min_seq_id': min_seq_id,
        'alignment_mode': alignment_mode
    }
    
    return input_dir, output_dir, db_path, tmp_dir, fmt, params, query_file, job_id


def run_foldseek_docker(query_pdb: Path, db_path: Path, out_tsv: Path, tmp_dir: Path, fmt: str, params: dict) -> int:
    """Run Foldseek using Docker container with mounted volumes."""
    
    # Create absolute paths for mounting
    script_dir_abs = SCRIPT_DIR.resolve()
    
    # Ensure all paths are absolute and resolve them relative to script directory if needed
    if not query_pdb.is_absolute():
        query_pdb = script_dir_abs / query_pdb
    if not db_path.is_absolute():
        db_path = script_dir_abs / db_path
    if not out_tsv.is_absolute():
        out_tsv = script_dir_abs / out_tsv
    if not tmp_dir.is_absolute():
        tmp_dir = script_dir_abs / tmp_dir
    
    # Docker paths (inside container)
    docker_query = f"/data/{query_pdb.relative_to(script_dir_abs)}"
    docker_db = f"/data/{db_path.relative_to(script_dir_abs)}"
    docker_output = f"/data/{out_tsv.relative_to(script_dir_abs)}"
    docker_tmp = f"/data/{tmp_dir.relative_to(script_dir_abs)}"
    
    # Detect ProstT5 databases (created from FASTA). These do not contain "*_ca" files
    # and therefore cannot output TM-score related fields or accept TM-score thresholds.
    ca_sidecar_path = Path(f"{db_path}_ca")
    is_prostt5_db = not ca_sidecar_path.exists()

    # Adjust output format for ProstT5 DBs by removing TM-score dependent fields
    effective_format = fmt
    if is_prostt5_db and fmt:
        # Remove 'alntmscore' if present in the comma-separated format list
        try:
            fields = [f.strip() for f in fmt.split(',')]
            fields = [f for f in fields if f.lower() != 'alntmscore']
            effective_format = ','.join(fields) if fields else 'query,target,evalue,bits'
        except Exception:
            # Fallback to a safe minimal format if parsing fails
            effective_format = 'query,target,evalue,bits'

    cmd = [
        "docker", "run", "--rm",
        "-v", f"{script_dir_abs}:/data",
        "foldseek",
        "easy-search",
        docker_query,
        docker_db,
        docker_output,
        docker_tmp,
        "--format-output", effective_format,
        "-s", str(params['sensitivity']),
        "-e", str(params['evalue']),
        "--max-seqs", str(params['max_seqs']),
        "--threads", str(params['threads']),
        "-c", str(params['coverage']),
        "--min-seq-id", str(params['min_seq_id']),
        "--alignment-mode", str(params['alignment_mode'])
    ]

    # Only pass TM-score threshold for databases that include CA coordinates
    if not is_prostt5_db:
        cmd.extend(["--tmscore-threshold", str(params['tmscore_threshold'])])
    
    print_msg("36", f"Running: {' '.join(cmd)}")
    return subprocess.run(cmd).returncode


def create_job_completion_marker(output_dir: Path, job_id: str, success: bool = True):
    """Create a completion marker file for the job."""
    if job_id:
        marker_file = output_dir / f"{job_id}.done.txt"
        status = "SUCCESS" if success else "FAILED"
        try:
            import datetime
            timestamp = datetime.datetime.now().isoformat()
            with open(marker_file, 'w') as f:
                f.write(f"Job {job_id} completed with status: {status}\n")
                f.write(f"Timestamp: {timestamp}\n")
            print_msg("32", f"Created completion marker: {marker_file}")
        except Exception as e:
            print_msg("31", f"Failed to create completion marker: {e}")


def main():
    """Main function."""
    input_dir, output_dir, db_path, tmp_dir, fmt, params, query_file, job_id = parse_args()

    # Check if Docker is available
    try:
        subprocess.run(["docker", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_msg("31", "Docker is not available or not running")
        return 1

    # Check if foldseek image exists
    try:
        subprocess.run(["docker", "images", "-q", "foldseek"], capture_output=True, check=True)
    except subprocess.CalledProcessError:
        print_msg("31", "Foldseek Docker image not found. Please build it first with: docker build -t foldseek .")
        return 1

    if not db_path.exists():
        print_msg("31", f"DB path {db_path} not found")
        return 1

    if not input_dir.exists():
        print_msg("31", f"Input directory {input_dir} not found")
        return 1

    # Create output and tmp directories
    output_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)
    
    # If job_id is provided, create job-specific tmp directory structure
    if job_id:
        # Only create job-specific tmp directory (output dir is already job-specific from server)
        job_tmp_dir = tmp_dir / job_id
        job_tmp_dir.mkdir(parents=True, exist_ok=True)
        
        # Update tmp directory to use job-specific path
        tmp_dir = job_tmp_dir
        
        print_msg("34", f"Job {job_id}: Using directories:")
        print_msg("34", f"  Output: {output_dir}")
        print_msg("34", f"  Temp: {tmp_dir}")

    # Handle specific query file vs all files
    if query_file:
        query_path = input_dir / query_file
        if not query_path.exists():
            print_msg("31", f"Query file {query_path} not found")
            return 1
        if not query_path.suffix.lower() == '.pdb':
            print_msg("31", f"Query file must be a PDB file: {query_file}")
            return 1
        pdb_files = [query_path]
    else:
        # Find all PDB files in input directory
        pdb_files = list(input_dir.glob("*.pdb"))
        if not pdb_files:
            print_msg("33", f"No PDB files found in {input_dir}")
            return 0

    print_msg("34", f"Found {len(pdb_files)} PDB file(s) to process")
    print_msg("34", f"Parameters: sensitivity={params['sensitivity']}, evalue={params['evalue']}, max-seqs={params['max_seqs']}")
    
    successful_jobs = 0
    failed_jobs = 0

    for pdb_file in pdb_files:
        out_tsv = output_dir / f"{pdb_file.stem}_fs.tsv"
        
        print_msg("36", f"Processing {pdb_file.name}...")
        ret = run_foldseek_docker(pdb_file, db_path, out_tsv, tmp_dir, fmt, params)
        
        if ret == 0:
            print_msg("32", f"   ✓ {pdb_file.name} → {out_tsv.name}")
            successful_jobs += 1
        else:
            print_msg("31", f"   × Foldseek failed ({ret}) for {pdb_file.name}")
            failed_jobs += 1

    print_msg("32", f"Completed: {successful_jobs} successful, {failed_jobs} failed")
    
    # Create completion marker if job_id is provided
    if job_id:
        success = failed_jobs == 0
        create_job_completion_marker(output_dir, job_id, success)
        
        # Also create job info file with details
        job_info_file = output_dir / f"{job_id}_info.txt"
        try:
            with open(job_info_file, 'w') as f:
                f.write(f"Job ID: {job_id}\n")
                f.write(f"Processed files: {len(pdb_files)}\n")
                f.write(f"Successful: {successful_jobs}\n")
                f.write(f"Failed: {failed_jobs}\n")
                f.write(f"Parameters: {params}\n")
                f.write(f"Database: {db_path}\n")
                f.write(f"Output format: {fmt}\n")
        except Exception as e:
            print_msg("31", f"Failed to create job info file: {e}")
    
    return 0 if failed_jobs == 0 else 1


if __name__ == "__main__":
    sys.exit(main()) 