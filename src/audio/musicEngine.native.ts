import { Audio, InterruptionModeAndroid, InterruptionModeIOS, type AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";

import { MODE_CONFIGS, type FocusMode } from "../constants/modes";

import { Mulberry32 } from "./random";
import type { EngineStartOptions, IGenerativeMusicEngine } from "./types";
import { encodeStereoWavBase64 } from "./wav";

const SAMPLE_RATE = 22050;
const SEGMENT_SECONDS = 18;
const CROSSFADE_SECONDS = 4;

type PreparedSound = {
  sound: Audio.Sound;
  uri: string;
};

export class GenerativeMusicEngine implements IGenerativeMusicEngine {
  private mode: FocusMode = "focus";
  private volume = 0.6;
  private active: PreparedSound | null = null;
  private warming: PreparedSound | null = null;
  private regenTimer: ReturnType<typeof setTimeout> | null = null;
  private seedCounter = 0;
  private crossfading = false;
  private running = false;

  async start({ mode, volume }: EngineStartOptions) {
    this.mode = mode;
    this.volume = volume;

    await this.configureAudioSession();

    if (this.running) {
      await this.setVolume(volume);
      return;
    }

    this.active = await this.createSegmentSound();
    await this.active.sound.setIsLoopingAsync(true);
    await this.active.sound.setVolumeAsync(this.volume);
    await this.active.sound.playAsync();

    this.running = true;
    this.scheduleRegeneration();
  }

  async stop() {
    this.running = false;
    if (this.regenTimer) {
      clearTimeout(this.regenTimer);
      this.regenTimer = null;
    }

    await Promise.all([
      this.unloadPreparedSound(this.active),
      this.unloadPreparedSound(this.warming)
    ]);

    this.active = null;
    this.warming = null;
    this.crossfading = false;
  }

  async setMode(mode: FocusMode) {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;

    if (this.running && !this.crossfading) {
      await this.crossfadeToNewSegment();
    }
  }

  async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));

    if (this.active) {
      await this.active.sound.setVolumeAsync(this.volume);
    }
  }

  async dispose() {
    await this.stop();
  }

  private async configureAudioSession() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });
  }

  private scheduleRegeneration() {
    if (!this.running) {
      return;
    }

    if (this.regenTimer) {
      clearTimeout(this.regenTimer);
    }

    const intervalMs = (SEGMENT_SECONDS - CROSSFADE_SECONDS) * 1000;
    this.regenTimer = setTimeout(() => {
      void this.crossfadeToNewSegment();
    }, intervalMs);
  }

  private async crossfadeToNewSegment() {
    if (!this.running || this.crossfading || !this.active) {
      return;
    }

    this.crossfading = true;
    this.warming = await this.createSegmentSound();

    await this.warming.sound.setIsLoopingAsync(true);
    await this.warming.sound.setVolumeAsync(0);
    await this.warming.sound.playAsync();

    const steps = 20;
    const stepMs = (CROSSFADE_SECONDS * 1000) / steps;

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const fadeOut = this.volume * (1 - t);
      const fadeIn = this.volume * t;

      if (this.active) {
        await this.active.sound.setVolumeAsync(Math.max(0, fadeOut));
      }
      if (this.warming) {
        await this.warming.sound.setVolumeAsync(Math.max(0, fadeIn));
      }

      await new Promise((resolve) => {
        setTimeout(resolve, stepMs);
      });
    }

    const previous = this.active;
    this.active = this.warming;
    this.warming = null;

    await this.unloadPreparedSound(previous);

    this.crossfading = false;
    this.scheduleRegeneration();
  }

  private async createSegmentSound() {
    const uri = await this.generateSegmentWavFile();
    const sound = new Audio.Sound();

    const status = await sound.loadAsync({ uri }, { shouldPlay: false, volume: 0 }, false);
    this.assertStatusLoaded(status);

    return { sound, uri };
  }

  private async generateSegmentWavFile() {
    const cfg = MODE_CONFIGS[this.mode];
    const rng = new Mulberry32(Date.now() + this.seedCounter * 9973);
    this.seedCounter += 1;

    const totalSamples = Math.floor(SAMPLE_RATE * SEGMENT_SECONDS);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);

    const phase = [rng.range(0, Math.PI * 2), rng.range(0, Math.PI * 2), rng.range(0, Math.PI * 2)];
    const lfoRates = [rng.range(0.004, 0.018), rng.range(0.003, 0.012), rng.range(0.002, 0.009)];
    const twoPi = Math.PI * 2;

    for (let i = 0; i < totalSamples; i += 1) {
      const t = i / SAMPLE_RATE;

      const leftBeat = Math.sin(twoPi * (cfg.carrierHz - cfg.beatHz / 2) * t + phase[0]);
      const rightBeat = Math.sin(twoPi * (cfg.carrierHz + cfg.beatHz / 2) * t + phase[0]);

      let droneLeft = 0;
      let droneRight = 0;
      for (let d = 0; d < 3; d += 1) {
        const ratio = cfg.droneIntervals[d % cfg.droneIntervals.length];
        const lfo = 1 + 0.01 * Math.sin(twoPi * lfoRates[d] * t + phase[d]);
        const freq = cfg.droneRootHz * ratio * lfo;
        const amp = 0.18 / (d + 1);
        const drift = 0.0035 * Math.sin(twoPi * (lfoRates[d] * 0.5) * t + phase[(d + 1) % 3]);

        droneLeft += Math.sin(twoPi * (freq * (1 - drift)) * t + phase[d]) * amp;
        droneRight += Math.sin(twoPi * (freq * (1 + drift)) * t + phase[d]) * amp;
      }

      const pulsePeriod = 60 / cfg.pulseBpm;
      const pulsePhase = (t % pulsePeriod) / pulsePeriod;
      const pulseEnv = Math.exp(-9.5 * pulsePhase);
      const pulseFreq = 42 + cfg.energy * 28 + 3.5 * Math.sin(twoPi * 0.07 * t + phase[1]);
      const pulse = Math.sin(twoPi * pulseFreq * t + phase[2]) * pulseEnv * (0.06 + cfg.energy * 0.04);

      const movement = 0.02 * Math.sin(twoPi * 0.03 * t + phase[0]);
      const shimmer = 0.0035 * Math.sin(twoPi * (1400 + cfg.warmth * 500) * t + phase[1]);

      const l = leftBeat * 0.16 + droneLeft + pulse + movement + shimmer;
      const r = rightBeat * 0.16 + droneRight + pulse - movement + shimmer;

      left[i] = Math.tanh(l * 0.82);
      right[i] = Math.tanh(r * 0.82);
    }

    const wav = encodeStereoWavBase64(left, right, SAMPLE_RATE);
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    const uri = `${baseDir}focus-segment-${Date.now()}-${this.seedCounter}.wav`;

    await FileSystem.writeAsStringAsync(uri, wav, {
      encoding: FileSystem.EncodingType.Base64
    });

    return uri;
  }

  private async unloadPreparedSound(prepared: PreparedSound | null) {
    if (!prepared) {
      return;
    }

    try {
      await prepared.sound.stopAsync();
    } catch {
      // Already stopped.
    }

    await prepared.sound.unloadAsync();

    try {
      await FileSystem.deleteAsync(prepared.uri, { idempotent: true });
    } catch {
      // Ignore file cleanup failures.
    }
  }

  private assertStatusLoaded(status: AVPlaybackStatus) {
    if (!status.isLoaded) {
      throw new Error("Unable to load generated audio segment.");
    }
  }
}
