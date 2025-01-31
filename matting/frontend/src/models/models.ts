export type VideoData = {
  frames: number;
  resolution: [number, number];
  fps: number;
  hash: string;
};

export type ProjectData = {
  uuid: string;
  hash: string;
  name: string;
  frame: ArrayBuffer;
  accessed: number;
};
