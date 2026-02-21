import type { FocusMode } from "../constants/modes";

export type EngineStartOptions = {
  mode: FocusMode;
  volume: number;
};

export interface IGenerativeMusicEngine {
  start(options: EngineStartOptions): Promise<void>;
  stop(): Promise<void>;
  setMode(mode: FocusMode): Promise<void>;
  setVolume(volume: number): Promise<void>;
  dispose(): Promise<void>;
}
