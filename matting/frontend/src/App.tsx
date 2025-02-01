import { createEffect, createMemo, createSignal, Index, JSX, Show, type Component } from "solid-js";
import { useUnit } from "effector-solid";
import { Divider, Drawer, Button, Input, IconButton } from "@suid/material";
import {
    importVideo,
    loadProjectList,
    selectProject,
    updateProjectAccess,
    setProjectName,
    deleteProject,
    projectStore,
    uiStore,
    setPlaying,
} from "./repo/store";
import { VideoData, VideoInfo, type ProjectData } from "./models/models";
import AddIcon from "@suid/icons-material/Add";
import { arrayToUrl } from "./utils/array-to-url";
import { A, useParams } from "@solidjs/router";
import DeleteIcon from "@suid/icons-material/Delete";
import { videoRepo } from "./repo/database";
import PlayArrowIcon from "@suid/icons-material/PlayArrow";
import SkipNextIcon from "@suid/icons-material/SkipNext";
import SkipPreviousIcon from "@suid/icons-material/SkipPrevious";
// import AddCircleOutlineIcon from "@suid/icons-material/AddCircleOutline";
import AutoAwesomeIcon from "@suid/icons-material/AutoAwesome";
import PauseIcon from "@suid/icons-material/Pause";

export const UploadVideo: Component = () => {
    let fileInput!: HTMLInputElement;

    const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
        importVideo(e.currentTarget.files[0]);
        e.currentTarget.value = "";
    };

    return (
        <div style={{ "text-align": "center" }}>
            <form style={{ display: "none" }}>
                <input ref={fileInput} type="file" accept="video/mp4" onChange={handleChange} />
            </form>
            <Button onClick={() => fileInput.click()} startIcon={<AddIcon />}>
                new video
            </Button>
        </div>
    );
};

export const ProjectCard: Component<{
    info: () => ProjectData;
}> = ({ info }) => {
    const state = useUnit(projectStore);
    const [hover, setHover] = createSignal(false);
    const handleDelete: JSX.EventHandler<HTMLButtonElement, Event> = (e) => {
        e.stopPropagation();
        e.preventDefault();
        deleteProject(info().uuid);
    };

    return (
        <A
            style={{
                display: "flex",
                "flex-direction": "column",
                "text-decoration": "none",
            }}
            href={`/${info().uuid}`}
            activeClass="default"
            inactiveClass="default">
            <Divider style={{ "margin-bottom": "5px" }} />
            <span style={{ margin: "5px" }}>
                <img src={arrayToUrl(info().frame)} style={{ width: "200px" }} />
                <span
                    style={{
                        display: "flex",
                        "flex-direction": "row",
                        "justify-content": "space-between",
                    }}
                    onMouseOver={() => setHover(true)}
                    onMouseOut={() => setHover(false)}>
                    <span
                        style={{
                            "font-weight": state().project === info().uuid ? "bold" : null,
                        }}>
                        {info().name || "<no name>"}
                    </span>
                    <span style={{ visibility: hover() ? "visible" : "hidden" }}>
                        <IconButton style={{ padding: 0 }} onClick={(e) => handleDelete(e)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </span>
                </span>
            </span>
        </A>
    );
};

export const Projects: Component = () => {
    const state = useUnit(projectStore);

    const projects = () => state().projects.sort((a, b) => b.accessed - a.accessed);

    return (
        <div>
            <UploadVideo />
            <Index each={projects()}>{(project, index) => <ProjectCard info={project} data-index={index} />}</Index>
        </div>
    );
};

const FixedWidthText: Component<{ text: string | number | (() => string | number); width: number }> = ({
    text,
    width,
}) => {
    return (
        <span style={{ width: `${width}px`, display: "inline-block", "text-align": "right" }}>
            {typeof text === "function" ? text() : text}
        </span>
    );
};

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

export const Content: Component = () => {
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

const App: Component = () => {
    const params = useParams();

    createEffect(() => {
        updateProjectAccess(params.projectId);
        loadProjectList();
    });

    createEffect(() => {
        selectProject(params.projectId);
    });

    return (
        <main style={{ display: "flex", "flex-direction": "row" }}>
            <Drawer variant="permanent" PaperProps={{ sx: { width: "210px" } }} style={{ width: "210px" }}>
                <Projects />
            </Drawer>
            <Content />
        </main>
    );
};

export default App;
