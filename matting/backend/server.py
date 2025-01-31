from aiohttp import web
import os
from pathlib import Path
import cv2
import json
from utils import MattingPredictor, SamVideoParser
import torch
from uuid import uuid4 as uuid
import numpy as np
from zipfile import ZipFile
import logging
from logging import Logger

TMP_PATH = "/tmp/matting"
RESOLUTION = (768, 432)
PORT = 8080
MODEL_PATH = "../../model/model.pt"

device = "cuda"


routes = web.RouteTableDef()

logger: Logger = None
parser: SamVideoParser = None
predictor: MattingPredictor = None


def init_logger():
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    ch.setFormatter(formatter)
    logger.addHandler(ch)
    return logger


def init():
    os.makedirs(TMP_PATH, exist_ok=True)

    logger.info("Loading model...")
    with open(MODEL_PATH, "rb") as fh:
        model = torch.load(fh, weights_only=False)
    logger.info("Loading SAM2...")
    parser = SamVideoParser(device)
    logger.info("Creating predictor...")
    predictor = MattingPredictor(parser, model, device)
    logger.info("Ready")
    return parser, predictor


class MattingResponse:
    @classmethod
    def response(cls, status, code, message, data):
        return web.json_response(
            {"status": status, "message": message, **data}, status=code
        )

    @classmethod
    def success(cls, message, data={}):
        return cls.response("success", 200, message, data)

    @classmethod
    def fail(cls, message, data={}):
        return cls.response("fail", 500, message, data)


@routes.get("/ready")
async def hello():
    logger.info("READY request")
    return web.Response(text="yes")


@routes.post("/matting")
async def matting(request: web.Request):
    request_id = str(uuid())
    post = await request.post()
    points = json.loads(post.get("points"))
    start = int(post.get("start"))
    finish = int(post.get("finish"))
    hash = post.get("hash")

    params_path = Path(TMP_PATH) / hash / "params.json"
    with open(str(params_path), "r") as params:
        data = json.load(params)
        resolution = data["resolution"]

    for p in points:
        p[0] = p[0] / resolution[0] * RESOLUTION[0]
        p[1] = p[1] / resolution[1] * RESOLUTION[1]

    frames_path = Path(TMP_PATH) / hash / "frames"
    matting_path = Path(TMP_PATH) / hash / request_id
    os.makedirs(str(matting_path))

    for frame_idx, matting, segment in predictor.predict_frames(
        frames_path, points, start=start, finish=finish
    ):
        cv2.imwrite(
            str(matting_path / f"{frame_idx:05d}.jpg"),
            (matting * 255).astype(np.uint8),
        )

    zip_path = str(Path(TMP_PATH) / hash / "matting.zip")
    with ZipFile(zip_path, "w") as zip:
        for file in matting_path.glob("*.jpg"):
            zip.write(file, os.path.basename(file))

    return web.FileResponse(zip_path, status=200)


@routes.post("/upload")
async def upload(request: web.Request):
    try:
        reader = await request.multipart()

        field = await reader.next()
        assert field.name == "hash"
        hash = await field.read(decode=True)
        hash = hash.decode()

        field = await reader.next()
        assert field.name == "file"
        filename = field.filename
        try:
            extension = filename.split(".")[1]
        except Exception:
            return MattingResponse.fail("")

        folder = Path(TMP_PATH) / hash
        if folder.exists():
            return MattingResponse.success("Already exists")

        os.makedirs(str(folder))

        size = 0
        full_filename = str(folder / f"video.{extension}")
        with open(full_filename, "wb") as f:
            while True:
                chunk = await field.read_chunk()
                if not chunk:
                    break
                size += len(chunk)
                f.write(chunk)

        frames_folder = folder / "frames"
        os.makedirs(str(frames_folder))

        vidcap = cv2.VideoCapture(full_filename)
        fps = vidcap.get(cv2.CAP_PROP_FPS)
        success, image = vidcap.read()
        count = 0
        while success:
            resolution = image.shape
            image = cv2.resize(image, RESOLUTION, interpolation=cv2.INTER_LANCZOS4)
            cv2.imwrite(str(frames_folder / f"{count:05d}.jpg"), image)
            success, image = vidcap.read()
            count += 1

        info = {
            "size": size,
            "frames": count,
            "resolution": resolution,
            "fps": fps,
        }

        with open(str(folder / "params.json"), "w") as params:
            json.dump(info, params)

        return MattingResponse.success("Parsed", info)
    except Exception:
        return MattingResponse.fail("Unexpected error")


if __name__ == "__main__":
    logger = init_logger()
    logger.info("Starting...")
    parser, predictor = init()
    app = web.Application()
    app.add_routes(routes)
    web.run_app(app, port=PORT)
