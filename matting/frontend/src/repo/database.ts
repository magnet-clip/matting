import { openDB } from "idb";
import { VideoRecord } from "../models";

const LAST_DB_VERSION = 1;
const VIDEO_INFO_TABLE = "video-info";
const VIDEO_DATA_TABLE = "video-data";

const db = await openDB("matting", LAST_DB_VERSION, {
  upgrade: (db) => {
    const videoInfo = db.createObjectStore(VIDEO_INFO_TABLE, {
      keyPath: "hash",
    });
    videoInfo.createIndex("hash", "hash");
    const videoData = db.createObjectStore(VIDEO_DATA_TABLE, {
      keyPath: "hash",
    });
    videoData.createIndex("hash", "hash");
  },
});

class VideoRepo {
  public async videos(): Promise<VideoRecord[]> {
    const res = await db.getAll(VIDEO_INFO_TABLE);
    return res;
  }

  public async addVideo(hash: string, content: ArrayBuffer, data) {
    throw new Error("Method not implemented.");
  }
}

export const videoRepo = new VideoRepo();
