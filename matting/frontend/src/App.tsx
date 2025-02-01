import { createEffect, createSignal, Index, JSX, Show, type Component } from "solid-js";
import { useUnit } from "effector-solid";
import { Divider, Drawer, Button, Input, IconButton } from "@suid/material";
import {
    importVideo,
    store,
    loadProjectList,
    selectProject,
    updateProjectAccess,
    setProjectName,
    deleteProject,
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
    const state = useUnit(store);
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
    const state = useUnit(store);

    const projects = () => state().projects.sort((a, b) => b.accessed - a.accessed);

    return (
        <div>
            <UploadVideo />
            <Index each={projects()}>{(project, index) => <ProjectCard info={project} data-index={index} />}</Index>
        </div>
    );
};

export const VideoControls: Component<{ video: HTMLVideoElement }> = ({ video }) => {
    return (
        <span style={{ display: "flex", "flex-direction": "row" }}>
            <span title="Step 1 frame back">
                <IconButton>
                    <SkipPreviousIcon />
                </IconButton>
            </span>
            <span title="Play / pause">
                <IconButton>
                    <PlayArrowIcon />
                </IconButton>
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
        </span>
    );
};

export const Content: Component = () => {
    let video!: HTMLVideoElement;
    let canvas!: HTMLCanvasElement;
    const state = useUnit(store);

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
                        <VideoControls video={video} />
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
