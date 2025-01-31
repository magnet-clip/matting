import { openDB } from "idb";
import { VideoInfo as VideoInfo, ProjectData as ProjectData, VideoData } from "../models/models";

const LAST_DB_VERSION = 2;
const VIDEO_INFO_TABLE = "video-info"; // hash -> arraybuffer
const VIDEO_DATA_TABLE = "video-data"; // hash -> fps, resolution, num of frames
const PROJECTS_TABLE = "project";

const db = await openDB("matting", LAST_DB_VERSION, {
    upgrade: (db, oldVer, newVer) => {
        if (oldVer <= 1) {
            const videoInfo = db.createObjectStore(VIDEO_INFO_TABLE, {
                keyPath: "hash",
            });
            videoInfo.createIndex("hash", "hash");
            const videoData = db.createObjectStore(VIDEO_DATA_TABLE, {
                keyPath: "hash",
            });
            videoData.createIndex("hash", "hash");
        }
        if (oldVer <= 2) {
            const projects = db.createObjectStore(PROJECTS_TABLE, {
                keyPath: "uuid",
            });
            projects.createIndex("uuid", "uuid");
        }
    },
});

class ProjectRepo {
    public async projects(): Promise<ProjectData[]> {
        return await db.getAll(PROJECTS_TABLE);
    }

    public async addProject(data: ProjectData) {
        await db.add(PROJECTS_TABLE, data);
    }

    public async updateProjectAccess(uuid: string, accessed: number) {
        const t = db.transaction([PROJECTS_TABLE], "readwrite");
        const videoInfo = t.objectStore(PROJECTS_TABLE);
        const record = (await videoInfo.get(uuid)) as ProjectData;
        if (!record) {
            t.abort();
            return;
        } else {
            record.accessed = accessed;
            await videoInfo.put(record);
            t.commit();
        }
    }

    public async updateProjectName(uuid: string, name: string) {
        const t = db.transaction([PROJECTS_TABLE], "readwrite");
        const videoInfo = t.objectStore(PROJECTS_TABLE);
        const record = (await videoInfo.get(uuid)) as ProjectData;
        if (!record) {
            t.abort();
            return;
        } else {
            record.name = name;
            await videoInfo.put(record);
            t.commit();
        }
    }

    public async deleteProject(uuid: string) {
        await db.delete(PROJECTS_TABLE, uuid);
    }
}

class VideoRepo {
    public async addVideo(hash: string, content: ArrayBuffer, data: VideoInfo) {
        const t = db.transaction([VIDEO_INFO_TABLE, VIDEO_DATA_TABLE], "readwrite");
        const videoInfo = t.objectStore(VIDEO_INFO_TABLE);
        const record = await videoInfo.get(hash);
        if (record) {
            t.abort();
        } else {
            await videoInfo.add(data);
            const videoData = t.objectStore(VIDEO_DATA_TABLE);
            await videoData.add({ hash, content });
            t.commit();
        }
    }

    public async getVideo(hash: string): Promise<[VideoData, VideoInfo]> {
        return Promise.all([db.get(VIDEO_DATA_TABLE, hash), db.get(VIDEO_INFO_TABLE, hash)]);
    }
}

export const videoRepo = new VideoRepo();
export const projectRepo = new ProjectRepo();
