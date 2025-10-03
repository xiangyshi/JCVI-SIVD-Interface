FROM ubuntu:22.04

# Install wget and other dependencies
RUN apt-get update && \
    apt-get install -y wget && \
    rm -rf /var/lib/apt/lists/*

# Create a working directory
WORKDIR /app

# Download and install Foldseek
RUN wget https://mmseqs.com/foldseek/foldseek-linux-avx2.tar.gz && \
    tar xvzf foldseek-linux-avx2.tar.gz && \
    rm foldseek-linux-avx2.tar.gz

# Add Foldseek to PATH
ENV PATH="/app/foldseek/bin:${PATH}"

# Verify installation
RUN foldseek version

# Set the entrypoint
ENTRYPOINT ["foldseek"] 