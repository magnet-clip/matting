import { createStore, createEffect as createSideEffect } from "effector";
import { createEffect, JSX, type Component } from "solid-js";
import { VideoRecord } from "./models";
import { useUnit } from "effector-solid";
import { videoRepo } from "./repo/database";
import { Drawer } from "@suid/material";
import { v4 as uuid } from "uuid";

export const hashVideo = async (data: ArrayBuffer): Promise<string> => {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((a) => a.toString(16).padStart(2, "0"))
    .join("");
};

type VideoUploadResponse = {
  frames: number;
  resolution: [number, number];
  fps: number;
};

const BASE_URL = "http://localhost:8080";

class VideoApi {
  constructor(private baseUrl: string) {}
  public async upload(hash: string, file: File) {
    const fd = new FormData();
    fd.append("hash", hash);
    fd.append("file", file);

    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: "post",
        body: fd,
      });
      const json = await response.json();
      return json as VideoUploadResponse;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}

const videoApi = new VideoApi(BASE_URL);

const loadVideoList = createSideEffect(async () => {
  const videos = await videoRepo.videos();
  return videos;
});

const readFile = async (file: File): Promise<ArrayBuffer> => {
  return new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  });
};

const importVideo = createSideEffect(async (file: File) => {
  // 1) read file to arraybuffer
  // 2) upload to server, parse and get metadata
  // 3) also get first frame - from server or when showing?
  // 2) assign uuid! to project
  const content = await readFile(file);
  const hash = await hashVideo(content);
  const data = await videoApi.upload(hash, file);
  if (data !== null) {
    const id = uuid();
    await videoRepo.addVideo(hash, content, data);
    await projectRepo.addProject(id, hash, file.name);
  } else {
    // TODO show some error message like toast
  }
});

const videoStore = createStore<VideoRecord[]>([]).on(
  loadVideoList.doneData,
  (state, videos) => {
    return videos;
  }
);

export const UploadVideo: Component = () => {
  let fileInput!: HTMLInputElement;

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
