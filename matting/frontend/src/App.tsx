import { createEffect, createMemo, For, JSX, type Component } from "solid-js";
import { useUnit } from "effector-solid";
import { Divider, Drawer, Button } from "@suid/material";
import { importVideo, store, loadProjectList } from "./repo/store";
import { ProjectData } from "./models/models";
import AddIcon from "@suid/icons-material/Add";
import { arrayToUrl } from "./utils/array-to-url";

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

export const ProjectCard: Component<{ info: ProjectData }> = ({ info }) => {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <Divider style={{ "margin-bottom": "5px" }} />
      <img src={arrayToUrl(info.frame)} style={{ width: "200px" }} />
      <span>{info.name}</span>
    </div>
  );
};

export const Projects: Component = () => {
  const state = useUnit(store);
  const projects = createMemo(() =>
    state().projects.sort((a, b) => a.accessed - b.accessed)
  );
  return (
    <div>
      <UploadVideo />
      <For each={projects()}>{(project) => <ProjectCard info={project} />}</For>
    </div>
  );
};

export const Content: Component = () => {
  return <></>;
};

const App: Component = () => {
  createEffect(() => {
    loadProjectList();
  });
  return (
    <main style={{ display: "flex", "flex-direction": "row" }}>
      <Drawer variant="permanent" PaperProps={{ sx: { width: "200px" } }}>
        <Projects />
      </Drawer>
      <Content />
    </main>
  );
};

export default App;
