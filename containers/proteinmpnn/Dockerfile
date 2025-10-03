# Use PyTorch base image with CUDA support
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

# Set working directory
WORKDIR /app

# Install system dependencies including build tools
RUN apt-get update && apt-get install -y \
    git \
    wget \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Clone ProteinMPNN repository
RUN git clone https://github.com/dauparas/ProteinMPNN.git .

# Install Python dependencies
RUN pip install numpy

# Create directories for input/output data
RUN mkdir -p /data/input /data/output

# Set environment variables
ENV PYTHONPATH=/app
ENV CUDA_VISIBLE_DEVICES=0

# Set working directory for data
WORKDIR /data

# Default command - prints help
CMD ["python", "/app/protein_mpnn_run.py", "--help"] 