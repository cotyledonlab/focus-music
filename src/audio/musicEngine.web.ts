import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { el, type NodeRepr_t } from "@elemaudio/core";
import WebRenderer from "@elemaudio/web-renderer";

import { MODE_CONFIGS, type FocusMode } from "../constants/modes";

import { buildSongComposition, describeSongKey, midiToHz } from "./composition";
import { createSongPreset, type SongDrumKit, type SongPreset, type SongTimbre } from "./song";
import type { EngineStartOptions, IGenerativeMusicEngine } from "./types";

type ConstRef = {
  node: NodeRepr_t;
  set: (props: { value: number }) => Promise<unknown>;
};

type EngineRefs = {
  master: ConstRef;
  beat: ConstRef;
  carrier: ConstRef;
  root: ConstRef;
  warmth: ConstRef;
  energy: ConstRef;
};

type TimbreProfile = {
  droneSawMix: number;
  droneSquareMix: number;
  droneDrive: number;
  droneCutoffBase: number;
  droneCutoffMove: number;
  stereoWidth: number;
  airGain: number;
  shimmerGain: number;
  riffSawMix: number;
  riffSquareMix: number;
  riffDrive: number;
  riffCutoffBase: number;
  riffCutoffMove: number;
};

type DrumKitProfile = {
  kickDecay: number;
  kickClick: number;
  kickSweep: number;
  kickBase: number;
  snareBody: number;
  snareNoise: number;
  hatMetal: number;
  hatNoise: number;
  clapNoise: number;
  drive: number;
};

const TIMBRE_PROFILES: Record<SongTimbre, TimbreProfile> = {
  analog: {
    droneSawMix: 0.22,
    droneSquareMix: 0.06,
    droneDrive: 0.12,
    droneCutoffBase: 480,
    droneCutoffMove: 1800,
    stereoWidth: 0.7,
    airGain: 1,
    shimmerGain: 0.9,
    riffSawMix: 0.74,
    riffSquareMix: 0.12,
    riffDrive: 0.2,
    riffCutoffBase: 750,
    riffCutoffMove: 2200
  },
  glass: {
    droneSawMix: 0.12,
    droneSquareMix: 0.16,
    droneDrive: 0.08,
    droneCutoffBase: 620,
    droneCutoffMove: 2600,
    stereoWidth: 0.85,
    airGain: 1.15,
    shimmerGain: 1.22,
    riffSawMix: 0.44,
    riffSquareMix: 0.32,
    riffDrive: 0.12,
    riffCutoffBase: 1100,
    riffCutoffMove: 2800
  },
  noir: {
    droneSawMix: 0.18,
    droneSquareMix: 0.1,
    droneDrive: 0.18,
    droneCutoffBase: 360,
    droneCutoffMove: 1500,
    stereoWidth: 0.62,
    airGain: 0.74,
    shimmerGain: 0.58,
    riffSawMix: 0.68,
    riffSquareMix: 0.18,
    riffDrive: 0.28,
    riffCutoffBase: 620,
    riffCutoffMove: 1750
  },
  dust: {
    droneSawMix: 0.26,
    droneSquareMix: 0.08,
    droneDrive: 0.24,
    droneCutoffBase: 420,
    droneCutoffMove: 1400,
    stereoWidth: 0.74,
    airGain: 0.92,
    shimmerGain: 0.78,
    riffSawMix: 0.58,
    riffSquareMix: 0.24,
    riffDrive: 0.35,
    riffCutoffBase: 680,
    riffCutoffMove: 1900
  }
};

const DRUM_KITS: Record<SongDrumKit, DrumKitProfile> = {
  kit808: {
    kickDecay: 0.22,
    kickClick: 0.02,
    kickSweep: 105,
    kickBase: 34,
    snareBody: 0.32,
    snareNoise: 0.8,
    hatMetal: 0.1,
    hatNoise: 0.9,
    clapNoise: 0.7,
    drive: 0.12
  },
  kit909: {
    kickDecay: 0.16,
    kickClick: 0.07,
    kickSweep: 145,
    kickBase: 40,
    snareBody: 0.48,
    snareNoise: 1,
    hatMetal: 0.24,
    hatNoise: 1,
    clapNoise: 0.9,
    drive: 0.18
  },
  linndrum: {
    kickDecay: 0.12,
    kickClick: 0.05,
    kickSweep: 82,
    kickBase: 46,
    snareBody: 0.55,
    snareNoise: 0.72,
    hatMetal: 0.15,
    hatNoise: 0.82,
    clapNoise: 0.85,
    drive: 0.24
  }
};

const createConstRef = (core: WebRenderer, key: string, value: number): ConstRef => {
  const [node, set] = core.createRef("const", { key, value }, []) as [NodeRepr_t, (props: { value: number }) => Promise<unknown>];

  return { node, set };
};

export class GenerativeMusicEngine implements IGenerativeMusicEngine {
  private core: WebRenderer | null = null;
  private context: AudioContext | null = null;
  private outputNode: AudioNode | null = null;

  private refs: EngineRefs | null = null;
  private mode: FocusMode = "focus";
  private song: SongPreset = createSongPreset("focus", 220_101);
  private volume = 0.6;
  private isRunning = false;

  private evolveTick = 0;
  private evolveTimer: ReturnType<typeof setInterval> | null = null;
  private meter = { min: 0, max: 0, ts: 0 };

  async start({ mode, volume, song }: EngineStartOptions) {
    this.mode = mode;
    this.volume = volume;
    this.song = song;

    await this.configureAudioSession();
    await this.ensureRenderer();

    if (!this.core || !this.context) {
      throw new Error("Unable to initialize Elementary renderer.");
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }

    if (!this.refs) {
      this.refs = this.createRefs();
    }

    this.evolveTick = 0;
    await this.renderGraph();
    await this.updateModeRefs();
    await this.refs.master.set({ value: this.volume });

    if (this.evolveTimer) {
      clearInterval(this.evolveTimer);
    }

    // Refresh graph at phrase boundaries for evolving arrangements.
    this.evolveTimer = setInterval(() => {
      void this.renderGraph();
    }, 12000);

    this.isRunning = true;
  }

  async stop() {
    if (!this.core || !this.context) {
      return;
    }

    if (this.evolveTimer) {
      clearInterval(this.evolveTimer);
      this.evolveTimer = null;
    }

    if (this.refs) {
      await this.refs.master.set({ value: 0 });
    }

    await this.core.render(0, 0);
    await this.context.suspend();
    this.isRunning = false;
  }

  async setMode(mode: FocusMode) {
    this.mode = mode;

    if (!this.refs || !this.core || !this.isRunning) {
      return;
    }

    await this.updateModeRefs();
    this.evolveTick += 1;
    await this.renderGraph();
  }

  async setSong(song: SongPreset) {
    this.song = song;

    if (!this.core || !this.isRunning) {
      return;
    }

    await this.updateModeRefs();
    this.evolveTick += 1;
    await this.renderGraph();
  }

  async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));

    if (!this.refs) {
      return;
    }

    await this.refs.master.set({ value: this.volume });
  }

  async dispose() {
    await this.stop();

    if (this.outputNode) {
      this.outputNode.disconnect();
      this.outputNode = null;
    }

    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }

    this.context = null;
    this.core = null;
    this.refs = null;
  }

  private async configureAudioSession() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
    } catch {
      // Ignore web/audio mode mismatches.
    }
  }

  private async ensureRenderer() {
    if (this.core && this.context && this.outputNode) {
      return;
    }

    const AudioContextCtor =
      globalThis.AudioContext || (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error("Web Audio is not available in this runtime.");
    }

    const context = new AudioContextCtor();
    const core = new WebRenderer();

    const node = await core.initialize(context, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });

    node.connect(context.destination);

    core.on("meter", (data) => {
      this.meter = { min: data.min, max: data.max, ts: Date.now() };
      (globalThis as { __focusMusicDebug?: unknown }).__focusMusicDebug = {
        mode: this.mode,
        song: {
          id: this.song.id,
          name: this.song.name,
          key: describeSongKey(this.song),
          timbre: this.song.timbre,
          progression: this.song.progression
        },
        isRunning: this.isRunning,
        contextState: this.context?.state ?? "unknown",
        currentTime: this.context?.currentTime ?? 0,
        meter: this.meter
      };
    });

    this.context = context;
    this.core = core;
    this.outputNode = node;
  }

  private createRefs(): EngineRefs {
    if (!this.core) {
      throw new Error("Renderer not initialized");
    }

    const cfg = MODE_CONFIGS[this.mode];

    return {
      master: createConstRef(this.core, "master", this.volume),
      beat: createConstRef(this.core, "beat", cfg.beatHz),
      carrier: createConstRef(this.core, "carrier", cfg.carrierHz),
      root: createConstRef(this.core, "root", midiToHz(this.song.rootMidi)),
      warmth: createConstRef(this.core, "warmth", cfg.warmth),
      energy: createConstRef(this.core, "energy", cfg.energy)
    };
  }

  private async updateModeRefs() {
    if (!this.refs) {
      return;
    }

    const cfg = MODE_CONFIGS[this.mode];

    await Promise.all([
      this.refs.beat.set({ value: cfg.beatHz }),
      this.refs.carrier.set({ value: cfg.carrierHz }),
      this.refs.root.set({ value: midiToHz(this.song.rootMidi) }),
      this.refs.warmth.set({ value: cfg.warmth }),
      this.refs.energy.set({ value: cfg.energy })
    ]);
  }

  private async renderGraph() {
    if (!this.core || !this.refs) {
      return;
    }

    const cfg = MODE_CONFIGS[this.mode];
    const song = this.song;
    const timbre = TIMBRE_PROFILES[song.timbre];
    const drums = DRUM_KITS[song.drumKit];
    const patterns = buildSongComposition(this.mode, song, this.evolveTick, cfg.pulseBpm);
    this.evolveTick += 1;

    const reset = 0;

    const master = el.smooth(0.997, this.refs.master.node);
    const beat = el.smooth(0.999, this.refs.beat.node);
    const carrier = el.smooth(0.999, this.refs.carrier.node);
    const root = el.smooth(0.999, this.refs.root.node);
    const warmth = el.smooth(0.998, this.refs.warmth.node);
    const energy = el.smooth(0.998, this.refs.energy.node);

    const chordStep = el.train((cfg.pulseBpm / 60) * song.tempoScale / 8 + 0.002);
    const harmonicMotion = el.seq({ key: "harmonic-seq", seq: patterns.chordRatioSeq, hold: true }, chordStep, reset);

    const padStep = el.train((cfg.pulseBpm / 60) * song.tempoScale / 4 + 0.002);
    const drones = patterns.padRatioSeqs.map((padSeq, i) => {
      const padRatio = el.seq({ key: `pad-ratio-${i}`, seq: padSeq, hold: true }, padStep, reset);
      const drift = el.add(1, el.mul(0.004 + i * 0.002, el.cycle(0.008 + i * 0.004)));
      const freq = el.mul(root, padRatio, drift);

      const sine = el.cycle(freq);
      const saw = el.blepsaw(el.mul(freq, 1.001 + i * 0.001));
      const square = el.square(el.mul(freq, 0.5));
      const fundamentalMix = Math.max(0.2, 1 - timbre.droneSawMix - timbre.droneSquareMix);
      const osc = el.add(el.mul(fundamentalMix, sine), el.mul(timbre.droneSawMix, saw), el.mul(timbre.droneSquareMix, square));

      const cutoff = el.add(
        timbre.droneCutoffBase,
        el.mul(timbre.droneCutoffMove, song.brightness),
        el.mul(1200, energy),
        el.mul(620, warmth)
      );
      const filtered = el.lowpass(cutoff, 0.74, osc);
      return el.mul(0.09 + cfg.warmth * 0.03 - i * 0.01, el.tanh(el.mul(1 + timbre.droneDrive, filtered)));
    });

    const bassStep = el.train(patterns.pulseRate / 2 + 0.001);
    const bassRatio = el.seq({ key: "bass-ratio", seq: patterns.bassRatioSeq, hold: true }, bassStep, reset);
    const bass = el.mul(0.07, el.lowpass(180 + song.brightness * 90, 0.72, el.blepsaw(el.mul(root, bassRatio))));

    const pulseTrig = el.train(patterns.pulseRate);
    const pulseGate = el.seq({ key: "pulse-gate", seq: patterns.pulseGateSeq, hold: true }, pulseTrig, reset);
    const pulseRatio = el.seq({ key: "pulse-ratio", seq: patterns.pulseRatioSeq, hold: true }, pulseTrig, reset);
    const pulseAccent = el.seq({ key: "pulse-accent", seq: patterns.pulseAccentSeq, hold: true }, pulseTrig, reset);

    const pulseEnv = el.adsr(0.002, 0.11, 0, 0.17 + cfg.warmth * 0.2, pulseGate);
    const pulseFreq = el.mul(root, pulseRatio);
    const pulseOsc = el.add(el.mul(0.72, el.cycle(pulseFreq)), el.mul(0.28, el.square(el.mul(pulseFreq, 2.01))));
    const pulseTone = el.mul(
      0.045 + cfg.energy * 0.035 + song.drumDensity * 0.026,
      pulseAccent,
      pulseEnv,
      el.lowpass(250 + cfg.energy * 360 + song.brightness * 260, 0.84, pulseOsc)
    );

    const air = el.mul(
      timbre.airGain * (0.007 + cfg.warmth * 0.014),
      el.lowpass(
        el.add(1400, el.mul(1900, song.brightness), el.mul(800, warmth)),
        0.68,
        el.pinknoise({ key: "air-noise", seed: patterns.seed + 1 })
      )
    );

    const shimmer = el.mul(
      timbre.shimmerGain * (0.008 + cfg.energy * 0.01 + song.brightness * 0.02),
      el.cycle(el.mul(root, 0.5, harmonicMotion, el.add(1, el.mul(0.012, el.cycle(0.024)))))
    );

    const drumStep = el.train(patterns.drumRate);

    const kickGate = el.seq({ key: "kick-seq", seq: patterns.kickSeq, hold: true }, drumStep, reset);
    const kickEnv = el.adsr(0.001, 0.06, 0, drums.kickDecay + cfg.warmth * 0.08, kickGate);
    const kickPitch = el.add(drums.kickBase, el.mul(drums.kickSweep, el.mul(kickEnv, kickEnv)));
    const kickBody = el.cycle(kickPitch);
    const kickClick = el.highpass(2200, 0.72, el.noise({ key: "kick-click", seed: patterns.seed + 11 }));
    const kick = el.mul(
      0.25 + song.drumDensity * 0.31,
      el.tanh(el.add(el.mul(kickEnv, kickBody), el.mul(drums.kickClick, kickEnv, kickClick)))
    );

    const snareGate = el.seq({ key: "snare-seq", seq: patterns.snareSeq, hold: true }, drumStep, reset);
    const snareEnv = el.adsr(0.001, 0.05, 0, 0.13 + cfg.warmth * 0.08, snareGate);
    const snareNoise = el.bandpass(
      1800 + cfg.energy * 1300 + song.brightness * 1000,
      0.86,
      el.noise({ key: "snare-noise", seed: patterns.seed + 17 })
    );
    const snareBody = el.cycle(170 + cfg.energy * 45);
    const snare = el.mul(
      0.1 + song.drumDensity * 0.14,
      el.tanh(el.add(el.mul(snareEnv, snareNoise, drums.snareNoise), el.mul(drums.snareBody, snareEnv, snareBody)))
    );

    const hatGate = el.seq({ key: "hat-seq", seq: patterns.hatSeq, hold: true }, drumStep, reset);
    const hatEnv = el.adsr(0.0008, 0.01, 0, 0.035, hatGate);
    const hatNoise = el.highpass(5000 + song.brightness * 2600, 0.78, el.noise({ key: "hat-noise", seed: patterns.seed + 23 }));
    const hatMetal = el.square(6100 + cfg.energy * 1200 + song.brightness * 1100);
    const hats = el.mul(
      0.07 + song.drumDensity * 0.08,
      hatEnv,
      el.tanh(el.add(el.mul(drums.hatNoise, hatNoise), el.mul(drums.hatMetal, hatMetal)))
    );

    const openHatGate = el.seq({ key: "openh-seq", seq: patterns.openHatSeq, hold: true }, drumStep, reset);
    const openHatEnv = el.adsr(0.001, 0.02, 0, 0.14 + cfg.warmth * 0.12, openHatGate);
    const openHat = el.mul(
      0.055 + song.drumDensity * 0.06,
      openHatEnv,
      el.highpass(3900 + song.brightness * 1900, 0.74, el.pinknoise({ key: "openh-noise", seed: patterns.seed + 29 }))
    );

    const clapGate = el.seq({ key: "clap-seq", seq: patterns.clapSeq, hold: true }, drumStep, reset);
    const clapEnv = el.adsr(0.001, 0.02, 0, 0.11, clapGate);
    const clap = el.mul(
      0.05 + song.drumDensity * 0.07,
      clapEnv,
      el.bandpass(1400 + cfg.energy * 700 + song.brightness * 1000, 0.9, el.mul(drums.clapNoise, el.noise({ key: "clap-noise", seed: patterns.seed + 31 })))
    );

    const rimGate = el.seq({ key: "rim-seq", seq: patterns.rimSeq, hold: true }, drumStep, reset);
    const rimEnv = el.adsr(0.001, 0.008, 0, 0.04, rimGate);
    const rim = el.mul(0.025 + song.drumDensity * 0.035, rimEnv, el.cycle(1020 + cfg.energy * 320));

    const drumBus = el.add(kick, snare, hats, openHat, clap, rim);
    const drumShaped = el.tanh(
      el.mul(
        1 + drums.drive,
        el.lowpass(10800 + song.brightness * 2100, 0.74, el.highpass(58 + song.subTrim * 36, 0.72, drumBus))
      )
    );

    const riffTrig = el.train(patterns.riffRate);
    const riffGate = el.seq({ key: "riff-gate", seq: patterns.riffGateSeq, hold: true }, riffTrig, reset);
    const riffRatio = el.seq({ key: "riff-ratio", seq: patterns.riffRatioSeq, hold: true }, riffTrig, reset);
    const riffAccent = el.seq({ key: "riff-accent", seq: patterns.riffAccentSeq, hold: true }, riffTrig, reset);
    const riffEnv = el.adsr(0.0015, 0.08, 0.1, 0.12 + song.hookDensity * 0.16, riffGate);

    const riffFreq = el.mul(root, song.riffRegister, riffRatio, el.add(1, el.mul(song.swing * 0.55, el.cycle(0.16))));
    const riffSaw = el.blepsaw(riffFreq);
    const riffSquare = el.square(el.mul(riffFreq, 1.004));
    const riffSine = el.cycle(el.mul(riffFreq, 2.01));
    const riffFundamental = Math.max(0.1, 1 - timbre.riffSawMix - timbre.riffSquareMix);
    const riffOsc = el.add(el.mul(timbre.riffSawMix, riffSaw), el.mul(timbre.riffSquareMix, riffSquare), el.mul(riffFundamental, riffSine));
    const riffFilter = el.lowpass(
      el.add(timbre.riffCutoffBase, el.mul(timbre.riffCutoffMove, song.brightness), el.mul(700, energy)),
      0.76,
      riffOsc
    );
    const riffPhase = el.allpass(el.add(520, el.mul(440, el.cycle(0.08))), 0.66, riffFilter);
    const riff = el.mul(0.05 + song.hookDensity * 0.11, riffAccent, riffEnv, el.tanh(el.mul(1 + timbre.riffDrive, riffPhase)));

    const leftCarrierFreq = el.sub(el.mul(carrier, el.add(1, el.mul(0.004, el.cycle(0.013)))), el.div(beat, 2));
    const rightCarrierFreq = el.add(el.mul(carrier, el.add(1, el.mul(0.004, el.cycle(0.017)))), el.div(beat, 2));

    const leftCarrier = el.mul(0.13, el.cycle(leftCarrierFreq));
    const rightCarrier = el.mul(0.13, el.cycle(rightCarrierFreq));

    const bedRaw = el.add(...drones, bass, pulseTone, air, shimmer, riff);
    const bed = el.highpass(108 + song.subTrim * 120, 0.72, bedRaw);

    const stereoDrift = el.mul(0.018 + timbre.stereoWidth * 0.012, el.cycle(0.006));
    const duckAmount = 0.18 + song.drumDensity * 0.17;
    const duck = el.sub(1, el.mul(duckAmount, kickEnv));

    const leftBed = el.mul(duck, el.add(1, stereoDrift), bed);
    const rightBed = el.mul(duck, el.sub(1, stereoDrift), bed);

    const drumPan = el.mul(0.22, el.cycle(0.09));
    const drumPresence = 0.2 + song.drumDensity * 0.58;
    const leftDrums = el.mul(drumPresence, el.add(1, drumPan), drumShaped);
    const rightDrums = el.mul(drumPresence, el.sub(1, drumPan), drumShaped);

    const preLeft = el.add(leftBed, leftCarrier, leftDrums);
    const preRight = el.add(rightBed, rightCarrier, rightDrums);

    const eqLeft = el.highpass(44 + song.subTrim * 30, 0.74, el.lowshelf(140, 0.707, -7 - song.subTrim * 8, preLeft));
    const eqRight = el.highpass(44 + song.subTrim * 30, 0.74, el.lowshelf(140, 0.707, -7 - song.subTrim * 8, preRight));

    const left = el.tanh(el.mul(master, eqLeft));
    const right = el.tanh(el.mul(master, eqRight));

    const meteredLeft = el.meter({ name: "focus-left-meter" }, left);
    const meteredRight = el.meter({ name: "focus-right-meter" }, right);

    await this.core.render(meteredLeft, meteredRight);

    (globalThis as { __focusMusicDebug?: unknown }).__focusMusicDebug = {
      mode: this.mode,
      song: {
        id: this.song.id,
        name: this.song.name,
        key: describeSongKey(this.song),
        timbre: this.song.timbre,
        progression: this.song.progression
      },
      isRunning: this.isRunning,
      contextState: this.context?.state ?? "unknown",
      currentTime: this.context?.currentTime ?? 0,
      meter: this.meter
    };
  }
}
