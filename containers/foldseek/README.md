# Foldseek Docker Container

This repository contains a Dockerfile for running Foldseek in a container. The container uses the Linux AVX2 build of Foldseek.

## Prerequisites

- Docker installed on your system
- AVX2 support on your CPU (most modern CPUs have this)

## Building the Container

To build the container, run:

```bash
docker build -t foldseek .
```

## Running the Container

To run Foldseek commands, you can use:

```bash
docker run -it --rm foldseek [command]
```

For example, to check the version:

```bash
docker run -it --rm foldseek version
```

To run Foldseek with data from your local machine, mount a volume:

```bash
docker run -it --rm -v $(pwd):/data foldseek [command]
```

Note: When mounting a volume, make sure to reference paths using the `/data` directory inside the container.

## Example Usage

Here's an example of how to run a search:

```bash
docker run -it --rm -v $(pwd):/data foldseek easy-search /data/queries.pdb /data/targets.pdb /data/results.m8 /data/tmp
```

For more information about Foldseek commands and usage, visit the [official Foldseek documentation](https://github.com/steineggerlab/foldseek).