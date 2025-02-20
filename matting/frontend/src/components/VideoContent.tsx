import { Input } from "@suid/material";
import { useUnit } from "effector-solid";
import { Component, createSignal, createEffect, Show, createMemo, Index, onMount } from "solid-js";
import { VideoData, VideoInfo } from "../models/models";
import { videoRepo } from "../repo/database";
import {
    addMattingPoint,
    deleteMattingPoint,
    projectStore,
    setCurrentFrame,
    setProjectName,
    uiStore,
} from "../repo/store";
import { arrayToUrl } from "../utils/array-to-url";
import { VideoControls } from "./VideoControls";
import { v4 as uuid } from "uuid";
import styles from "./VideoContent.module.css";
import { MattingDialog } from "./MattingDialog";

export const VideoContent: Component = () => {
    let video!: HTMLVideoElement;

    const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
    const [canvasRect, setCanvasRect] = createSignal<DOMRect>();

    const state = useUnit(projectStore);
    const ui = useUnit(uiStore);

    const [videoLoaded, setVideoLoaded] = createSignal(false);
    const [videoData, setVideoData] = createSignal<VideoData>();
    const [videoInfo, setVideoInfo] = createSignal<VideoInfo>();

    const project = createMemo(() => {
        const id = state().project;
        return state().projects.find((p) => p.uuid === id);
    });

    const points = createMemo(() => {
        if (!project()) return [];
        if (!canvasRect()) return [];

        const currentFrame = ui().currentFrame;
        return project().points?.filter((p) => p.frame === currentFrame);
    });

    const hash = createMemo(() => project()?.hash);

    createEffect(() => {
        if (!hash()) return;
        videoRepo.getVideo(hash()).then(([data, info]) => {
            setVideoData(data);
            setVideoInfo(info);
            setVideoLoaded(true);
        });
    });

    createEffect(() => {
        if (!videoLoaded()) return;
        video.src = arrayToUrl(videoData().content);
        video.addEventListener(
            "loadeddata",
            () => {
                video.addEventListener("seeked", () => setCurrentFrame(0), { once: true });
                video.currentTime = 0;
            },
            { once: true },
        );
    });

    const observer = createMemo(
        () =>
            new ResizeObserver((entries) => {
                setCanvasRect(entries[0].contentRect);
            }),
    );

    createEffect(() => {
        if (canvas()) observer().observe(canvas());
    });

    const addPoint = (e: MouseEvent) => {
        addMattingPoint({
            uuid: project().uuid,
            data: {
                uuid: uuid(),
                frame: ui().currentFrame,
                x: e.offsetX / canvasRect().width,
                y: e.offsetY / canvasRect().height,
            },
        });
    };

    const deletePoint = (uuid: string) => {
        deleteMattingPoint({ uuid: project().uuid, point: uuid });
    };

    const [mattingOpen, setMattingOpen] = createSignal(false);

    return (
        <Show when={project()}>
            <div style={{ display: "flex", "flex-direction": "column", width: "100%" }}>
                <div
                    style={{
                        margin: "5px",
                        display: "flex",
                        "flex-direction": "column",
                        width: "100%",
                    }}>
                    <span>
                        <Input
                            value={project().name}
                            onChange={(e) => setProjectName({ uuid: state().project, name: e.target.value })}
                        />
                    </span>
                </div>
                <Show when={videoLoaded()} fallback={<>Loading...</>}>
                    <div
                        style={{
                            width: "80%",
                            display: "flex",
                            "flex-direction": "column",
                            margin: "20px",
                            position: "relative",
                        }}>
                        <canvas
                            ref={setCanvas}
                            style={{ width: "100%", border: "1px solid gray" }}
                            width={videoInfo().resolution[0]}
                            height={videoInfo().resolution[1]}
                            onClick={addPoint}
                        />
                        <Index each={points()}>
                            {(point) => {
                                return (
                                    <span
                                        class={styles.outerdot}
                                        style={{
                                            left: `calc(${Math.round(point().x * canvasRect().width) - 10}px)`,
                                            top: `calc(${Math.round(point().y * canvasRect().height) - 10}px)`,
                                        }}
                                        onClick={() => deletePoint(point().uuid)}>
                                        <span class={styles.innerdot} />
                                    </span>
                                );
                            }}
                        </Index>
                        <VideoControls
                            video={video}
                            canvas={canvas()}
                            onMatting={() => setMattingOpen(true)}
                            hasPoints={() => points().length > 0}
                        />
                        {mattingOpen() && (
                            <MattingDialog
                                handleClose={() => setMattingOpen(false)}
                                currentFrame={ui().currentFrame}
                                hash={project().hash}
                                points={points().map((p) => [p.x, p.y])}
                                uuid={project().uuid}
                                numFrames={videoInfo().frames - 1}
                            />
                        )}
                    </div>
                </Show>
                <video ref={video} style={{ display: "none" }} />
            </div>
        </Show>
    );
};
