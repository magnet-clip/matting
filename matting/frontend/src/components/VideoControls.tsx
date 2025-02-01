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

export const VideoControls: Component<{ video: HTMLVideoElement; canvas: HTMLCanvasElement }> = ({ video, canvas }) => {
    const ui = useUnit(uiStore);
    const projects = useUnit(projectStore);

    const [frame, setFrame] = createSignal(0);
    const [time, setTime] = createSignal(0);

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

    const setupFrameCallback = (time: DOMHighResTimeStamp, meta: VideoFrameCallbackMetadata) => {
        setFrame(Math.round(meta.mediaTime * fps()));
        setTime(meta.mediaTime);

        cancelFrameCallbacks();
        ctx.drawImage(video, 0, 0);
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
    return (
        <div>
            <div style={{ display: "flex", "flex-direction": "row" }}>
                <span title="Step 1 frame back">
                    <IconButton>
                        <SkipPreviousIcon />
                    </IconButton>
                </span>
                <span title="Play / pause">
                    <IconButton onClick={play}>{ui().playing ? <PauseIcon /> : <PlayArrowIcon />}</IconButton>
                </span>
                <span title="Step 1 frame forth">
                    <IconButton>
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
            </div>
            <div style={{ display: "flex", "flex-direction": "row" }}>
                <span></span>
                <span>
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
        </div>
    );
};
