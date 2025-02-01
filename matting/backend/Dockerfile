FROM ghcr.io/astral-sh/uv:debian 

ENV UV_COMPILE_BYTECODE=1
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates git liblzma-dev ffmpeg libsm6 libxext6 

WORKDIR /app

RUN uv venv 

COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen
RUN --mount=type=cache,target=/root/.cache/uv uv pip install https://github.com/magnet-clip/sam2.git

RUN uv run server.py