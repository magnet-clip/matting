import { createEffect, Index, JSX, Show, type Component } from "solid-js";
import { useUnit } from "effector-solid";
import { Divider, Drawer, Button, Input } from "@suid/material";
import {
  importVideo,
  store,
  loadProjectList,
  selectProject,
  updateProjectAccess,
  setProjectName,
} from "./repo/store";
import { type ProjectData } from "./models/models";
import AddIcon from "@suid/icons-material/Add";
import { arrayToUrl } from "./utils/array-to-url";
import { A, useParams } from "@solidjs/router";

export const UploadVideo: Component = () => {
  let fileInput!: HTMLInputElement;

  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    importVideo(e.currentTarget.files[0]);
    e.currentTarget.value = "";
  };

  return (
    <div style={{ "text-align": "center" }}>
      <form style={{ display: "none" }}>
        <input
          ref={fileInput}
          type="file"
          accept="video/mp4"
          onChange={handleChange}
        />
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
  return (
    <A
      style={{
        display: "flex",
        "flex-direction": "column",
        "text-decoration": "none",
      }}
      href={`/${info().uuid}`}
      activeClass="default"
      inactiveClass="default"
    >
      <Divider style={{ "margin-bottom": "5px" }} />
      <img src={arrayToUrl(info().frame)} style={{ width: "200px" }} />
      <span
        style={{
          "font-weight": state().project === info().uuid ? "bold" : null,
        }}
      >
        {info().name}
      </span>
    </A>
  );
};

export const Projects: Component = () => {
  const state = useUnit(store);

  const projects = () =>
    state().projects.sort((a, b) => b.accessed - a.accessed);

  return (
    <div>
      <UploadVideo />
      <Index each={projects()}>
        {(project, index) => <ProjectCard info={project} data-index={index} />}
      </Index>
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
    <Show when={name() && state().project}>
      <div
        style={{
          margin: "5px",
          display: "flex",
          "flex-direction": "column",
          width: "100%",
        }}
      >
        <Input
          value={name()}
          onChange={(e) =>
            setProjectName({ uuid: state().project, name: e.target.value })
          }
        />
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
      <Drawer
        variant="permanent"
        PaperProps={{ sx: { width: "200px" } }}
        style={{ width: "200px" }}
      >
        <Projects />
      </Drawer>
      <Content />
    </main>
  );
};

export default App;
