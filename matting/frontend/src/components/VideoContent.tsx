import { Input } from "@suid/material";
import { useUnit } from "effector-solid";
import { Component, createSignal, createEffect, Show } from "solid-js";
import { VideoData, VideoInfo } from "../models/models";
import { videoRepo } from "../repo/database";
import { projectStore, setProjectName } from "../repo/store";
import { arrayToUrl } from "../utils/array-to-url";
import { VideoControls } from "./VideoControls";

export const VideoContent: Component = () => {
    let video!: HTMLVideoElement;
    let canvas!: HTMLCanvasElement;
    const state = useUnit(projectStore);

    const [videoLoaded, setVideoLoaded] = createSignal(false);
    const [videoData, setVideoData] = createSignal<VideoData>();
    const [videoInfo, setVideoInfo] = createSignal<VideoInfo>();

    const project = () => {
        const id = state().project;
        return state().projects.find((p) => p.uuid === id);
    };

    createEffect(() => {
        if (!project()) return;
        videoRepo.getVideo(project().hash).then(([data, info]) => {
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
                    <div style={{ width: "80%", display: "flex", "flex-direction": "column", margin: "20px" }}>
                        <div>
                            <canvas
                                ref={canvas}
                                style={{ width: "100%", border: "1px solid gray" }}
                                width={videoInfo().resolution[0]}
                                height={videoInfo().resolution[1]}
                            />
                            <video ref={video} style={{ display: "none" }} />
                        </div>
                        <VideoControls video={video} canvas={canvas} />
                    </div>
                </Show>
            </div>
        </Show>
    );
};
