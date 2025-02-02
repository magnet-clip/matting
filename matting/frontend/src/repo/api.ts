import { VideoInfo } from "../models/models";

const BASE_URL = "http://localhost:8080";

class VideoApi {
    constructor(private baseUrl: string) {}

    public async upload(hash: string, file: File): Promise<VideoInfo> {
        const fd = new FormData();
        fd.append("hash", hash);
        fd.append("file", file);

        try {
            const response = await fetch(`${this.baseUrl}/upload`, {
                method: "post",
                body: fd,
            });
            return await response.json();
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    public async getFirstFrame(hash: string): Promise<ArrayBuffer> {
        try {
            const response = await fetch(`${this.baseUrl}/frame/${hash}`, {
                method: "get",
            });
            return await response.arrayBuffer();
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    public async matting(fd: FormData) {
        try {
            const response = await fetch(`${this.baseUrl}/matting`, {
                method: "post",
                body: fd,
            });
            return await response.arrayBuffer();
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}

export const videoApi = new VideoApi(BASE_URL);
