import { Platform } from "react-native";

import type { EngineStartOptions, IGenerativeMusicEngine } from "./types";

const createPlatformEngine = (): IGenerativeMusicEngine => {
  if (Platform.OS === "web") {
    const module = require("./musicEngine.web") as {
      GenerativeMusicEngine: new () => IGenerativeMusicEngine;
    };
    return new module.GenerativeMusicEngine();
  }

  const module = require("./musicEngine.native") as {
    GenerativeMusicEngine: new () => IGenerativeMusicEngine;
  };
  return new module.GenerativeMusicEngine();
};

export class GenerativeMusicEngine implements IGenerativeMusicEngine {
  private readonly engine = createPlatformEngine();

  async start(options: EngineStartOptions) {
    await this.engine.start(options);
  }

  async stop() {
    await this.engine.stop();
  }

  async setMode(mode: EngineStartOptions["mode"]) {
    await this.engine.setMode(mode);
  }

  async setVolume(volume: number) {
    await this.engine.setVolume(volume);
  }

  async dispose() {
    await this.engine.dispose();
  }
}
