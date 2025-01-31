import {
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  type Component,
} from "solid-js";
import { useUnit } from "effector-solid";
import { Divider, Drawer, Button } from "@suid/material";
import {
  importVideo,
  store,
  loadProjectList,
  selectProject,
  updateProjectAccess,
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
  info: ProjectData;
}> = ({ info }) => {
  const state = useUnit(store);
  return (
    <A
      style={{
        display: "flex",
        "flex-direction": "column",
        "text-decoration": "none",
      }}
      href={`/${info.uuid}`}
      activeClass="default"
      inactiveClass="default"
    >
      <Divider style={{ "margin-bottom": "5px" }} />
      <img src={arrayToUrl(info.frame)} style={{ width: "200px" }} />
      <span
        style={{ "font-weight": state().project === info.uuid ? "bold" : null }}
      >
        {info.name}
      </span>
    </A>
  );
};

export const Projects: Component = () => {
  const state = useUnit(store);

  const projects = createMemo(() =>
    state().projects.sort((a, b) => b.accessed - a.accessed)
  );

  return (
    <div>
      <UploadVideo />
      <For each={projects()}>{(project) => <ProjectCard info={project} />}</For>
    </div>
  );
};

export const Content: Component = () => {
  const state = useUnit(store);
  return (
    <div style={{ margin: "5px" }}>
      {state().project} - AAAAAAAAAAAAAAAAAAAAAAAAAAAAAaaa
    </div>
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
