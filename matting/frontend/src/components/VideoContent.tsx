import { Input } from "@suid/material";
import { useUnit } from "effector-solid";
import { Component, createSignal, createEffect, Show, createMemo, Index } from "solid-js";
import { VideoData, VideoInfo } from "../models/models";
import { videoRepo } from "../repo/database";
import { addMattingPoint, deleteMattingPoint, projectStore, setProjectName, uiStore } from "../repo/store";
import { arrayToUrl } from "../utils/array-to-url";
import { VideoControls } from "./VideoControls";
import { v4 as uuid } from "uuid";

export const VideoContent: Component = () => {
    let video!: HTMLVideoElement;
    let canvas!: HTMLCanvasElement;
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
        const currentFrame = ui().currentFrame;
        if (!project()) return;
        return project().points?.filter((p) => p.frame === currentFrame);
    });

    const hash = createMemo(() => project()?.hash);

    createEffect(() => {
        if (!hash()) return;
        console.log("Reloading video");
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
                video.addEventListener(
                    "seeked",
                    () => {
                        canvas.getContext("2d").drawImage(video, 0, 0);
                    },
                    { once: true },
                );
                video.currentTime = 0;
            },
            { once: true },
        );
    });

    const addPoint = (e: MouseEvent) => {
        addMattingPoint({
            uuid: project().uuid,
            data: { uuid: uuid(), frame: ui().currentFrame, x: e.offsetX, y: e.offsetY },
        });
    };

    const deletePoint = (uuid: string) => {
        deleteMattingPoint({ uuid: project().uuid, point: uuid });
    };

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
                            ref={canvas}
                            style={{ width: "100%", border: "1px solid gray" }}
                            width={videoInfo().resolution[0]}
                            height={videoInfo().resolution[1]}
                            onClick={addPoint}
                        />
                        <Index each={points()}>
                            {(p) => (
                                <span
                                    style={{
                                        position: "absolute",
                                        left: `${p().x - 10}px`,
                                        top: `${p().y - 10}px`,
                                        display: "inline-block",
                                        width: "20px",
                                        height: "20px",
                                        border: "2px solid blue",
                                        "border-radius": "20px",
                                        cursor: "pointer",
                                        "z-index": "10",
                                    }}
                                    onClick={[deletePoint, p().uuid]}
                                />
                            )}
                        </Index>
                        <VideoControls video={video} canvas={canvas} />
                    </div>
                </Show>
                <video ref={video} style={{ display: "none" }} />
            </div>
        </Show>
    );
};
