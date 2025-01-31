import { createStore, createEffect as createSideEffect } from "effector";
import { createEffect, JSX, type Component } from "solid-js";
import { VideoRecord } from "./models";
import { useUnit } from "effector-solid";
import { videoRepo } from "./repo/database";
import { Divider, Drawer } from "@suid/material";

const loadVideoList = createSideEffect(async () => {
  const videos = await videoRepo.videos();
  return videos;
});

const importVideo = createSideEffect(async (file: File) => {
  // 1) read file to arraybuffer
  // 2) upload to server, parse and get metadata
  // 3) also get first frame - from server or when showing?
  // 2) assign uuid! to project
});

const videoStore = createStore<VideoRecord[]>([]).on(
  loadVideoList.doneData,
  (state, videos) => {
    return videos;
  }
);

export const UploadVideo: Component = () => {
  let fileInput: HTMLInputElement = null;

  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    importVideo(e.currentTarget.files[0]);
  };

  const handleImportStart = () => {
    fileInput.click();
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
      <span>
        No videos uploaded. Click{" "}
        <a href="#" onClick={handleImportStart}>
          here
        </a>{" "}
        to upload one
      </span>
    </div>
  );
};

export const Videos: Component = () => {
  const videos = useUnit(videoStore);
  if (videos().length == 0) {
    return <UploadVideo />;
  } else {
    return <>videos!</>;
  }
};

export const Content: Component = () => {
  return <></>;
};

const App: Component = () => {
  createEffect(() => {
    loadVideoList();
  });
  return (
    <main style={{ display: "flex", "flex-direction": "row" }}>
      <Drawer
        variant="permanent"
        PaperProps={{ sx: { width: "200px", padding: "5px" } }}
      >
        <Videos />
      </Drawer>
      <Content />
    </main>
  );
};

export default App;
