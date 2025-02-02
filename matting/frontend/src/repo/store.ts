import { createEffect, createEvent, createStore } from "effector";
import { VideoInfo, ProjectData, PointData } from "../models/models";
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

const reloadProject = createEffect(async (uuid: string): Promise<[ProjectData, string]> => {
    const project = await projectRepo.getProject(uuid);
    return [project, uuid];
});

export const updateProjectAccess = createEffect(async (uuid: string) => {
    const accessed = Date.now();
    await projectRepo.updateProjectAccess(uuid, accessed);
    await reloadProject(uuid);
});

export const deleteFramePoints = createEffect(async ({ uuid, frame }: { uuid: string; frame: number }) => {
    await projectRepo.deleteFramePoints(uuid, frame);
    await reloadProject(uuid);
});

export const deleteAllPoints = createEffect(async (uuid: string) => {
    await projectRepo.deleteAllPoints(uuid);
    await reloadProject(uuid);
});

export const setProjectName = createEffect(async ({ uuid, name }: { uuid: string; name: string }) => {
    await projectRepo.updateProjectName(uuid, name);
    await reloadProject(uuid);
});

export const deleteProject = createEffect(async (uuid: string) => {
    const [hash, unused] = await projectRepo.deleteProject(uuid);
    if (unused) {
        console.warn(`No more projects with video ${hash}`);
        await videoRepo.deleteVideo(hash);
    }
    await reloadProject(uuid);
});

export const addMattingPoint = createEffect(async ({ data, uuid }: { data: PointData; uuid: string }) => {
    await projectRepo.addPoint(uuid, data);
    await reloadProject(uuid);
});

export const deleteMattingPoint = createEffect(async ({ uuid, point }: { uuid: string; point: string }) => {
    await projectRepo.deletePoint(uuid, point);
    await reloadProject(uuid);
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
    currentFrame: number;
};

type MattingState = {
    project: string;
    projects: ProjectData[];
    videos: VideoInfo[];
};

const initialUiState: UiState = {
    playing: false,
    currentFrame: 0,
};

const initialState: MattingState = {
    project: null,
    projects: [],
    videos: [],
};

export const selectProject = createEvent<string>();
export const setPlaying = createEvent<boolean>();
export const setCurrentFrame = createEvent<number>();

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
    .on(reloadProject.doneData, (state, data) => {
        const [project, uuid] = data;
        return {
            ...state,
            projects: state.projects.map((p) => (p.uuid !== uuid ? p : project)).filter((p) => !!p),
        };
    });

projectStore.watch((state) => console.log(state));

export const uiStore = createStore<UiState>(initialUiState)
    .on(selectProject, (state) => ({
        ...state,
        ...initialUiState,
    }))
    .on(setPlaying, (state, playing) => ({ ...state, playing }))
    .on(setCurrentFrame, (state, currentFrame) => ({ ...state, currentFrame }));
