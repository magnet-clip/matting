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

TMP_PATH = "/tmp/matting"
RESOLUTION = (768, 432)
PORT = 8080
MODEL_PATH = "../../model/model.pt"

device = "cuda"


os.makedirs(TMP_PATH, exist_ok=True)

with open(MODEL_PATH, "rb") as fh:
    model = torch.load(fh, weights_only=False)
parser = SamVideoParser(device)
predictor = MattingPredictor(parser, model, device)

routes = web.RouteTableDef()


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
        success, image = vidcap.read()
        count = 0
        while success:
            resolution = image.shape
            image = cv2.resize(image, RESOLUTION, interpolation=cv2.INTER_LANCZOS4)
            cv2.imwrite(str(frames_folder / f"{count:05d}.jpg"), image)
            success, image = vidcap.read()
            count += 1

        with open(str(folder / "params.json"), "w") as params:
            json.dump({"resolution": list(resolution[:2][::-1])}, params)

        return MattingResponse.success(
            "Parsed",
            {"size": size, "name": filename, "frames": count, "resolution": resolution},
        )
    except Exception:
        return MattingResponse.fail("Unexpected error")


app = web.Application()
app.add_routes(routes)
web.run_app(app, port=PORT)
