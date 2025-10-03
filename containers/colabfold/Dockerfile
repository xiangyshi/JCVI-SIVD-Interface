FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies including GCC 12
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    build-essential \
    software-properties-common \
    && add-apt-repository -y ppa:ubuntu-toolchain-r/test \
    && apt-get update \
    && apt-get install -y gcc-12 g++-12 \
    && update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 100 \
    && update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 100 \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Download and run the installation script
RUN wget https://raw.githubusercontent.com/YoshitakaMo/localcolabfold/main/install_colabbatch_linux.sh \
    && bash install_colabbatch_linux.sh

# Add environment variables for WSL2 compatibility
ENV TF_FORCE_UNIFIED_MEMORY="1"
ENV XLA_PYTHON_CLIENT_MEM_FRACTION="4.0"
ENV XLA_PYTHON_CLIENT_ALLOCATOR="platform"
ENV TF_FORCE_GPU_ALLOW_GROWTH="true"

# Add colabfold to PATH and set library path
ENV PATH="/app/localcolabfold/colabfold-conda/bin:$PATH"
ENV LD_LIBRARY_PATH="/app/localcolabfold/colabfold-conda/lib:${LD_LIBRARY_PATH}"

# Create directories for input and output
RUN mkdir -p /app/input /app/output

# Create entrypoint script
RUN echo '#!/bin/bash\n\
source /app/localcolabfold/colabfold-conda/etc/profile.d/conda.sh\n\
conda activate colabfold\n\
exec "$@"' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command - show help
CMD ["colabfold_batch", "--help"]