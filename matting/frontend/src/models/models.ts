export type VideoData = {
    hash: string;
    content: ArrayBuffer;
};

export type VideoInfo = {
    frames: number;
    resolution: [number, number];
    fps: number;
    hash: string;
};

export type ProjectSettings = {
    start: number;
    finish: number;
    mattings: Record<number, ArrayBuffer>;
};

export type ProjectData = {
    uuid: string;
    hash: string;
    name: string;
    frame: ArrayBuffer;
    accessed: number;
} & Partial<ProjectSettings>;
