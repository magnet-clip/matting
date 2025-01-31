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
import { type ProjectData } from "./models/models";
import AddIcon from "@suid/icons-material/Add";
import { arrayToUrl } from "./utils/array-to-url";
import { A, useParams } from "@solidjs/router";
import DeleteIcon from "@suid/icons-material/Delete";

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
                            "min-height": "20px",
                        }}>
                        {info().name || "<unnamed>"}
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

export const Content: Component = () => {
    const state = useUnit(store);

    const name = () => {
        const id = state().project;
        const project = state().projects.find((p) => p.uuid === id);
        if (project) {
            return project.name;
        } else {
            return null;
        }
    };

    return (
        <Show when={name() !== null}>
            <div
                style={{
                    margin: "5px",
                    display: "flex",
                    "flex-direction": "column",
                    width: "100%",
                }}>
                <span>
                    <Input
                        value={name()}
                        onChange={(e) => setProjectName({ uuid: state().project, name: e.target.value })}
                    />
                </span>
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
