#!/bin/bash
set -e

if [ $# -lt 2 ]; then
    echo "Usage: $0 <input_fasta_or_structure_dir> <db_name>"
    exit 1
fi

INPUT=$1
DBNAME=$2
DBDIR="database/$DBNAME"
WEIGHTS_DIR="weights"

mkdir -p "$DBDIR"
mkdir -p "tmp"

# Base docker run command
DOCKER_CMD="docker run --rm -v $(pwd):/data foldseek:latest"

# If input is fasta/fa → use ProstT5
if [[ "$INPUT" == *.fasta || "$INPUT" == *.fa ]]; then
    echo "[INFO] FASTA input detected → Using ProstT5"

    # Download ProstT5 weights if not already present
    if [ ! -d "$WEIGHTS_DIR" ]; then
        echo "[INFO] Downloading ProstT5 weights..."
        $DOCKER_CMD databases ProstT5 /data/$WEIGHTS_DIR /data/tmp
    else
        echo "[INFO] ProstT5 weights already present → Skipping download"
    fi

    # Create DB with ProstT5
    $DOCKER_CMD createdb /data/$INPUT /data/$DBDIR/$DBNAME --prostt5-model /data/$WEIGHTS_DIR
else
    echo "[INFO] Structure input detected (not FASTA)"
    $DOCKER_CMD createdb /data/$INPUT /data/$DBDIR/$DBNAME
fi

echo "[DONE] Database created in $DBDIR/"
