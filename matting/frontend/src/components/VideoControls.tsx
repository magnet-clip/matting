import { IconButton } from "@suid/material";
import { useUnit } from "effector-solid";
import { Component, createEffect, createMemo, createSignal } from "solid-js";
import { uiStore, projectStore, setPlaying, setCurrentFrame } from "../repo/store";
import { FixedWidthText } from "./utils/FixedWidthText";
import PlayArrowIcon from "@suid/icons-material/PlayArrow";
import SkipNextIcon from "@suid/icons-material/SkipNext";
import SkipPreviousIcon from "@suid/icons-material/SkipPrevious";
import AutoAwesomeIcon from "@suid/icons-material/AutoAwesome";
import PauseIcon from "@suid/icons-material/Pause";
import { clamp } from "../utils/clamp";
import { SeekSlider } from "./SeekSlider";
import { DeletePointsButton } from "./DeletePointsButton";
import VisibilityIcon from "@suid/icons-material/Visibility";
import VisibilityOffIcon from "@suid/icons-material/VisibilityOff";

export const VideoControls: Component<{
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    onMatting: () => void;
    hasPoints: () => boolean;
}> = ({ video, canvas, onMatting, hasPoints }) => {
    const ui = useUnit(uiStore);
    const projects = useUnit(projectStore);
    const [showMatting, setShowMatting] = createSignal(true);

    const [img, setImg] = createSignal<HTMLImageElement>();

    const project = createMemo(() => {
        const id = projects().project;
        return projects().projects.find((p) => p.uuid === id);
    });

    const videoInfo = createMemo(() => {
        const hash = project().hash;
        return projects().videos.find((v) => v.hash === hash);
    });

    const marks = createMemo(() => {
        return [...new Set(project().points?.map((p) => p.frame))];
    });

    const callbacks: number[] = [];
    const ctx = canvas.getContext("2d");
    const cancelFrameCallbacks = () => {
        while (callbacks.length > 0) {
            video.cancelVideoFrameCallback(callbacks.pop());
        }
    };

    const fps = createMemo(() => videoInfo()?.fps);
    const duration = createMemo(() => (videoInfo()?.frames - 1) / fps());
    const time = () => ui().currentFrame / fps();

    const handleFrame = (time: number) => {
        setCurrentFrame(Math.round(time * fps()));
    };

    const matting = createMemo(() => {
        const currentFrame = ui().currentFrame;
        return project().mattings?.[currentFrame];
    });

    createEffect(() => {
        const [w, h] = videoInfo().resolution;
        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(video, 0, 0);

        const matt = matting();
        if (ui().playing || !matting || !showMatting()) return;

        const blob = new Blob([matt]);
        const url = URL.createObjectURL(blob);
        const image = img();
        image.src = url;
        image.addEventListener(
            "load",
            () => {
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = 0.6;
                ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, w, h);
                URL.revokeObjectURL(url);
            },
            { once: true },
        );
    });

    const frameCallback = (time: DOMHighResTimeStamp, meta: VideoFrameCallbackMetadata) => {
        handleFrame(meta.mediaTime);
        callbacks.push(video.requestVideoFrameCallback(frameCallback));
    };

    const play = () => {
        const playing = ui().playing;
        if (playing) {
            video.pause();
            while (callbacks.length > 0) {
                const callback = callbacks.pop();
                video.cancelVideoFrameCallback(callback);
            }
        } else {
            callbacks.push(video.requestVideoFrameCallback(frameCallback));
            video.play();
            video.addEventListener("pause", () => {
                setPlaying(false);
                cancelFrameCallbacks();
            });
        }
        setPlaying(!playing);
    };

    const gotoFrame = (f: number) => {
        const newFrame = clamp(f, 0, videoInfo().frames - 1);
        if (newFrame === ui().currentFrame) return;

        video.currentTime = newFrame / fps();
        video.addEventListener(
            "seeked",
            () => {
                handleFrame(video.currentTime);
            },
            { once: true },
        );
    };

    const step = (numFrames: number) => {
        if (ui().playing) {
            video.pause();
        }

        gotoFrame(ui().currentFrame + numFrames);
    };

    return (
        <div style={{ display: "flex", "flex-direction": "row", width: "100%", "align-items": "center" }}>
            <span style={{ "flex-grow": 0 }}>
                <span title="Step 1 frame back">
                    <IconButton onClick={() => step(-1)}>
                        <SkipPreviousIcon />
                    </IconButton>
                </span>
                <span title="Play / pause">
                    <IconButton onClick={play}>{ui().playing ? <PauseIcon /> : <PlayArrowIcon />}</IconButton>
                </span>
                <span title="Step 1 frame forth">
                    <IconButton onClick={() => step(1)}>
                        <SkipNextIcon />
                    </IconButton>
                </span>
                <span title={hasPoints() ? "Matting..." : "Add points to perform matting!"}>
                    <IconButton disabled={!hasPoints()} onClick={onMatting}>
                        <AutoAwesomeIcon />
                    </IconButton>
                </span>
                <span title={showMatting() ? "Matting..." : "Add points to perform matting!"}>
                    <IconButton disabled={!matting()} onClick={() => setShowMatting(!showMatting())}>
                        {showMatting() ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                </span>
                <DeletePointsButton />
            </span>
            <span style={{ "flex-grow": 1, display: "flex", "justify-content": "space-around" }}>
                <SeekSlider gotoFrame={gotoFrame} videoInfo={videoInfo} marks={marks} />
            </span>
            <span style={{ "flex-grow": 0 }}>
                <div>
                    <FixedWidthText text={"Frame "} width={30} />
                    <FixedWidthText width={80} text={() => `${ui().currentFrame}  / `} />
                    <FixedWidthText width={40} text={() => videoInfo()?.frames - 1} />
                </div>
                <div>
                    <FixedWidthText text={"Time "} width={30} />
                    <FixedWidthText width={80} text={() => `${time().toFixed(2)}  / `} />
                    <FixedWidthText width={40} text={() => duration().toFixed(2)} />
                </div>
            </span>
            <img
                ref={setImg}
                style={{
                    display: "none",
                }}
            />
        </div>
    );
};
