import type { FocusMode } from "../constants/modes";
import type { SongPreset } from "./song";

export type EngineStartOptions = {
  mode: FocusMode;
  volume: number;
  song: SongPreset;
};

export interface IGenerativeMusicEngine {
  start(options: EngineStartOptions): Promise<void>;
  stop(): Promise<void>;
  setMode(mode: FocusMode): Promise<void>;
  setSong(song: SongPreset): Promise<void>;
  setVolume(volume: number): Promise<void>;
  dispose(): Promise<void>;
}
