# FROM ghcr.io/astral-sh/uv:debian AS uv-image
# FROM ghcr.io/astral-sh/uv@sha256:e93557bf61564f012c5bcf300c14d524c8f1078967caddb38ad10afc36bdb81a
FROM nvidia/cuda:12.6.2-cudnn-devel-ubuntu24.04

# COPY --from=ghcr.io/astral-sh/uv@sha256:e93557bf61564f012c5bcf300c14d524c8f1078967caddb38ad10afc36bdb81a /uv /uvx /bin/
# The installer requires curl (and certificates) to download the release archive
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates

# Download the latest installer
ADD https://astral.sh/uv/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh

# Ensure the installed binary is on the `PATH`
ENV PATH="/root/.local/bin/:$PATH"

ENV UV_COMPILE_BYTECODE=1
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates git liblzma-dev ffmpeg libsm6 libxext6 

WORKDIR /app

RUN uv venv 

COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen -vv
RUN --mount=type=cache,target=/root/.cache/uv uv pip install https://github.com/magnet-clip/sam2.git -vv

RUN uv run server.py