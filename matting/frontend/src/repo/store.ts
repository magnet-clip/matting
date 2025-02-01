import { createEffect, createEvent, createStore } from "effector";
import { VideoInfo, ProjectData } from "../models/models";
import { hashVideo } from "../utils/hash-video";
import { readFile } from "../utils/read-file";
import { videoApi } from "./api";
import { projectRepo, videoRepo } from "./database";
import { v4 as uuid } from "uuid";

export const loadProjectList = createEffect(async (): Promise<[ProjectData[], VideoInfo[]]> => {
    const projects = await projectRepo.getAllPojects();
    const videos = await videoRepo.getAllVideosInfo();
    return [projects, videos];
});

export const updateProjectAccess = createEffect(async (uuid: string) => {
    const accessed = Date.now();
    await projectRepo.updateProjectAccess(uuid, accessed);
    return { uuid, accessed };
});

export const setProjectName = createEffect(async ({ uuid, name }: { uuid: string; name: string }) => {
    await projectRepo.updateProjectName(uuid, name);
    return [uuid, name];
});

export const deleteProject = createEffect(async (uuid: string) => {
    await projectRepo.deleteProject(uuid);
    // TODO delete unused videos
    return uuid;
});

export const importVideo = createEffect(async (file: File): Promise<[VideoInfo, ProjectData]> => {
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
});

type UiState = {
    playing: boolean;
};

type MattingState = {
    project: string;
    projects: ProjectData[];
    videos: VideoInfo[];
};

const initialUiState: UiState = {
    playing: false,
};

const initialState: MattingState = {
    project: null,
    projects: [],
    videos: [],
};

export const selectProject = createEvent<string>();
export const setPlaying = createEvent<boolean>();

export const projectStore = createStore<MattingState>(initialState)
    .on(loadProjectList.doneData, (state, [projects, videos]) => ({ ...state, projects, videos }))
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
    .on(selectProject, (state, project) => ({ ...state, project }))
    .on(setProjectName, (state, { uuid, name }) => ({
        ...state,
        projects: state.projects.map((p) => (p.uuid === uuid ? { ...p, name } : p)),
    }))
    .on(updateProjectAccess.doneData, (state, { uuid, accessed }) => ({
        ...state,
        projects: state.projects.map((p) => (p.uuid === uuid ? { ...p, accessed } : p)),
    }))
    .on(deleteProject.doneData, (state, uuid) => ({
        ...state,
        project: state.project === uuid ? null : state.project,
        projects: state.projects.filter((p) => p.uuid !== uuid),
    }));

export const uiStore = createStore<UiState>(initialUiState)
    .on(selectProject, (state) => ({
        ...state,
        playing: false,
    }))
    .on(setPlaying, (state, playing) => ({ ...state, playing }));
