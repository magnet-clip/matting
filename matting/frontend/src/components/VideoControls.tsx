import { IconButton } from "@suid/material";
import { useUnit } from "effector-solid";
import { Component, createSignal, createMemo } from "solid-js";
import { uiStore, projectStore, setPlaying } from "../repo/store";
import { FixedWidthText } from "./utils/FixedWidthText";
import PlayArrowIcon from "@suid/icons-material/PlayArrow";
import SkipNextIcon from "@suid/icons-material/SkipNext";
import SkipPreviousIcon from "@suid/icons-material/SkipPrevious";
// import AddCircleOutlineIcon from "@suid/icons-material/AddCircleOutline";
import AutoAwesomeIcon from "@suid/icons-material/AutoAwesome";
import PauseIcon from "@suid/icons-material/Pause";

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export const VideoControls: Component<{ video: HTMLVideoElement; canvas: HTMLCanvasElement }> = ({ video, canvas }) => {
    let slider!: HTMLSpanElement;
    const ui = useUnit(uiStore);
    const projects = useUnit(projectStore);

    const [frame, setFrame] = createSignal(0);
    const [time, setTime] = createSignal(0);
    const [drag, setDrag] = createSignal(false);

    const videoInfo = createMemo(() => {
        const id = projects().project;
        const hash = projects().projects.find((p) => p.uuid === id).hash;
        const res = projects().videos.find((v) => v.hash === hash);
        return res;
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

    const handleFrame = (time: number) => {
        setFrame(Math.round(time * fps()));
        setTime(time);

        cancelFrameCallbacks();
        ctx.drawImage(video, 0, 0);
    };

    const setupFrameCallback = (time: DOMHighResTimeStamp, meta: VideoFrameCallbackMetadata) => {
        handleFrame(meta.mediaTime);
        callbacks.push(video.requestVideoFrameCallback(setupFrameCallback));
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
            video.play();
            callbacks.push(video.requestVideoFrameCallback(setupFrameCallback));
            video.addEventListener("pause", () => {
                setPlaying(false);
                cancelFrameCallbacks();
            });
        }
        setPlaying(!playing);
    };

    const gotoFrame = (f: number) => {
        const newFrame = clamp(f, 0, videoInfo().frames - 1);
        if (newFrame === frame()) return;

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

        gotoFrame(frame() + numFrames);
    };

    const handleDrag = (click: boolean, e: MouseEvent) => {
        if (!click && !drag()) return;
        const rect = slider.getBoundingClientRect();
        const clientX = e.pageX;
        const x = clamp(clientX - rect.left, 0, rect.width);
        const frame = Math.round(((videoInfo()?.frames - 1) * x) / rect.width);
        gotoFrame(frame);
    };

    return (
        <div
            style={{ display: "flex", "flex-direction": "row", width: "100%", "align-items": "center" }}
            onMouseMove={[handleDrag, false]}>
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
                <span title="Matting...">
                    {/* <IconButton>
                    <AddCircleOutlineIcon />
                </IconButton> */}
                    <IconButton>
                        <AutoAwesomeIcon />
                    </IconButton>
                </span>
            </span>
            <span style={{ "flex-grow": 1, display: "flex", "justify-content": "space-around" }}>
                <span style={{ width: "80%", position: "relative" }}>
                    <span
                        ref={slider}
                        style={{
                            display: "inline-block",
                            height: "4px",
                            width: "100%",
                            border: "1px solid lightblue",
                            "background-color": "lightblue",
                            "border-radius": "3px",
                            "vertical-align": "middle",
                            cursor: "pointer",
                        }}
                        onClick={[handleDrag, true]}
                        onMouseDown={() => setDrag(true)}
                        onMouseUp={() => setDrag(false)}
                    />
                    <span
                        style={{
                            position: "absolute",
                            border: "1px solid gray",
                            background: "lightblue",
                            "border-radius": "10px",
                            display: "inline-block",
                            height: "16px",
                            width: "16px",
                            top: "2px",
                            left: `${Math.round((100 * frame()) / (videoInfo()?.frames - 1))}%`,
                            cursor: "pointer",
                        }}
                        onMouseDown={() => setDrag(true)}
                        onMouseUp={() => setDrag(false)}
                    />
                </span>
            </span>
            <span style={{ "flex-grow": 0 }}>
                <div>
                    <FixedWidthText text={"Frame "} width={30} />
                    <FixedWidthText width={80} text={() => `${frame()}  / `} />
                    <FixedWidthText width={40} text={() => videoInfo()?.frames - 1} />
                </div>
                <div>
                    <FixedWidthText text={"Time "} width={30} />
                    <FixedWidthText width={80} text={() => `${time().toFixed(2)}  / `} />
                    <FixedWidthText width={40} text={() => duration().toFixed(2)} />
                </div>
            </span>
        </div>
    );
};
