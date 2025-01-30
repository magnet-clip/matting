import { createStore, createEffect as createSideEffect } from "effector";
import { createEffect, type Component } from "solid-js";
import { VideoRecord } from "./models";
import { useUnit } from "effector-solid";
import { videoRepo } from "./repo/database";

const loadVideoList = createSideEffect(async () => {
  const videos = await videoRepo.videos();
  return videos;
});

const videoStore = createStore<VideoRecord[]>([]).on(
  loadVideoList.doneData,
  (state, videos) => {
    return videos;
  }
);

export const Videos: Component = () => {
  const videos = useUnit(videoStore);
  createEffect(() => {
    console.log(videos().at(0));
  });
  return <></>;
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
      <div style={{ "flex-grow": 0 }}>
        <Videos />
      </div>
      <div style={{ "flex-grow": 1 }}>
        <Content />
      </div>
    </main>
  );
};

export default App;
