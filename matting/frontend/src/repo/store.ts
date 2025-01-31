import { createEffect, createEvent, createStore } from "effector";
import { VideoData, ProjectData } from "../models/models";
import { hashVideo } from "../utils/hash-video";
import { readFile } from "../utils/read-file";
import { videoApi } from "./api";
import { projectRepo, videoRepo } from "./database";
import { v4 as uuid } from "uuid";

export const loadProjectList = createEffect(async () => {
  const projects = await projectRepo.projects();
  return projects;
});

export const importVideo = createEffect(
  async (file: File): Promise<[VideoData, ProjectData]> => {
    try {
      const content = await readFile(file);
      const hash = await hashVideo(content);
      const data = await videoApi.upload(hash, file);
      if (data !== null) {
        const frame = await videoApi.getFirstFrame(hash);
        const videoData = { ...data, hash };
        await videoRepo.addVideo(hash, content, videoData);
        const projectData = {
          uuid: uuid(),
          hash,
          name: file.name.split(".")[0],
          frame,
          accessed: Date.now(),
        };
        await projectRepo.addProject(projectData);
        return [videoData, projectData];
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }
);

type MattingState = {
  project: string;
  projects: ProjectData[];
  videos: VideoData[];
};

const initialState: MattingState = {
  project: null,
  projects: [],
  videos: [],
};

export const selectProject = createEvent<string>();

export const store = createStore<MattingState>(initialState)
  .on(loadProjectList.doneData, (state, projects) => ({ ...state, projects }))
  .on(importVideo.doneData, (state, data) => {
    if (!data) return state;
    const [video, project] = data;
    if (state.videos.some((v) => v.hash === video.hash)) {
      return {
        ...state,
        projects: [...state.projects, project],
      };
    } else {
      return {
        ...state,
        videos: [...state.videos, video],
        projects: [...state.projects, project],
      };
    }
  })
  .on(selectProject, (state, project) => ({ ...state, project }));
