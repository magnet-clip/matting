from aiohttp import web
import os
from pathlib import Path
import cv2

TMP_PATH = "/tmp/matting"
os.makedirs(TMP_PATH, exist_ok=True)

routes = web.RouteTableDef()


@routes.get("/ready")
async def hello(request):
    return web.Response(text="yes")


@routes.post("/upload")
async def upload(request: web.Request):
    reader = await request.multipart()
    field = await reader.next()
    assert field.name == "hash"
    hash = await field.read(decode=True)
    hash = hash.decode()

    field = await reader.next()
    assert field.name == "file"
    filename = field.filename

    folder = Path(TMP_PATH) / hash
    if folder.exists():
        return web.Response(text="Already exists")

    os.makedirs(str(folder))

    size = 0
    with open(str(folder / filename), "wb") as f:
        while True:
            chunk = await field.read_chunk()
            if not chunk:
                break
            size += len(chunk)
            f.write(chunk)

    # TODO frames of standard resolution
    # TODO recoding into smaller video?
    #
    vidcap = cv2.VideoCapture("big_buck_bunny_720p_5mb.mp4")
    success, image = vidcap.read()
    count = 0
    while success:
        cv2.imwrite("frame%d.jpg" % count, image)  # save frame as JPEG file
        success, image = vidcap.read()
        print("Read a new frame: ", success)
        count += 1

    return web.Response(
        text="{} sized of {} successfully stored".format(filename, size)
    )


app = web.Application()
app.add_routes(routes)
web.run_app(app)
