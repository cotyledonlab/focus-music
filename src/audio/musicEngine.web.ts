import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { el, type NodeRepr_t } from "@elemaudio/core";
import WebRenderer from "@elemaudio/web-renderer";

import { MODE_CONFIGS, type FocusMode } from "../constants/modes";

import { Mulberry32 } from "./random";
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

type PatternSet = {
  seed: number;
  chordSeq: number[];
  voiceSeqs: number[][];
  pulseGateSeq: number[];
  pulsePitchSeq: number[];
  pulseRate: number;
  drumRate: number;
  kickSeq: number[];
  snareSeq: number[];
  hatSeq: number[];
  openHatSeq: number[];
  clapSeq: number[];
  rimSeq: number[];
};

const rotatePattern = (seq: number[], offset: number) => {
  const n = seq.length;
  if (!n) {
    return seq;
  }

  const shift = ((offset % n) + n) % n;
  return [...seq.slice(n - shift), ...seq.slice(0, n - shift)];
};

const euclideanPattern = (steps: number, pulses: number, rotation = 0) => {
  const pattern: number[] = [];
  let bucket = 0;

  for (let i = 0; i < steps; i += 1) {
    bucket += pulses;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push(1);
    } else {
      pattern.push(0);
    }
  }

  return rotatePattern(pattern, rotation);
};

const withAnchors = (seq: number[], anchors: number[]) => {
  const next = [...seq];
  anchors.forEach((index) => {
    const normalized = ((index % next.length) + next.length) % next.length;
    next[normalized] = 1;
  });
  return next;
};

const createConstRef = (core: WebRenderer, key: string, value: number): ConstRef => {
  const [node, set] = core.createRef("const", { key, value }, []) as [
    NodeRepr_t,
    (props: { value: number }) => Promise<unknown>
  ];

  return { node, set };
};

export class GenerativeMusicEngine implements IGenerativeMusicEngine {
  private core: WebRenderer | null = null;
  private context: AudioContext | null = null;
  private outputNode: AudioNode | null = null;

  private refs: EngineRefs | null = null;
  private mode: FocusMode = "focus";
  private volume = 0.6;
  private isRunning = false;

  private evolveTick = 0;
  private evolveTimer: ReturnType<typeof setInterval> | null = null;
  private meter = { min: 0, max: 0, ts: 0 };

  async start({ mode, volume }: EngineStartOptions) {
    this.mode = mode;
    this.volume = volume;

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

    // Refresh the graph so rhythmic and harmonic patterns keep evolving.
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
      root: createConstRef(this.core, "root", cfg.droneRootHz),
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
      this.refs.root.set({ value: cfg.droneRootHz }),
      this.refs.warmth.set({ value: cfg.warmth }),
      this.refs.energy.set({ value: cfg.energy })
    ]);
  }

  private buildPatterns(): PatternSet {
    const cfg = MODE_CONFIGS[this.mode];
    const seed = (Date.now() + this.evolveTick * 9973) | 0;
    const rng = new Mulberry32(seed);

    const modeScale: Record<FocusMode, number[]> = {
      focus: [1, 1.125, 1.25, 1.333, 1.5, 1.667, 1.875],
      relax: [1, 1.125, 1.2, 1.333, 1.5, 1.6, 1.8],
      sleep: [1, 1.067, 1.2, 1.333, 1.5, 1.6, 1.778]
    };

    const drumBpmByMode: Record<FocusMode, number> = {
      focus: 122,
      relax: 98,
      sleep: 76
    };

    const scale = modeScale[this.mode];

    const chordSeq = Array.from({ length: 8 }, () => {
      return scale[Math.floor(rng.range(0, scale.length))] ?? 1;
    });

    const voiceSeqs = [0, 1, 2].map((voice) =>
      Array.from({ length: 16 }, () => {
        const span = 0.02 + voice * 0.01 + cfg.warmth * 0.01;
        return 1 + rng.range(-span, span);
      })
    );

    const pulseDensity = 0.5 + cfg.energy * 0.35 - cfg.warmth * 0.15;
    const pulseGateSeq = Array.from({ length: 32 }, (_, i) => {
      if (i % 8 === 0) {
        return 1;
      }
      return rng.chance(pulseDensity) ? 1 : 0;
    });

    const pitchPool = [42, 45, 48, 50, 52, 55, 57, 60].map((midi) =>
      440 * Math.pow(2, (midi - 69) / 12)
    );

    const pulsePitchSeq = Array.from({ length: 32 }, () => {
      return pitchPool[Math.floor(rng.range(0, pitchPool.length))] ?? 55;
    });

    const kickSeq = withAnchors(
      euclideanPattern(16, this.mode === "focus" ? 5 : this.mode === "relax" ? 4 : 3, Math.floor(rng.range(0, 4))),
      [0, 8]
    );

    const snareSeq = withAnchors(
      euclideanPattern(16, this.mode === "focus" ? 3 : 2, Math.floor(rng.range(0, 8))),
      [4, 12]
    );

    const hatSeq = euclideanPattern(16, this.mode === "sleep" ? 7 : 11, Math.floor(rng.range(0, 16)));
    const openHatSeq = euclideanPattern(16, this.mode === "focus" ? 4 : 3, Math.floor(rng.range(0, 16)));
    const clapSeq = withAnchors(
      euclideanPattern(16, this.mode === "focus" ? 4 : 3, Math.floor(rng.range(0, 16))),
      [12]
    );
    const rimSeq = euclideanPattern(16, this.mode === "sleep" ? 2 : 4, Math.floor(rng.range(0, 16)));

    return {
      seed,
      chordSeq,
      voiceSeqs,
      pulseGateSeq,
      pulsePitchSeq,
      pulseRate: (cfg.pulseBpm / 60) * (1.25 + cfg.energy * 0.4),
      drumRate: (drumBpmByMode[this.mode] / 60) * 4,
      kickSeq,
      snareSeq,
      hatSeq,
      openHatSeq,
      clapSeq,
      rimSeq
    };
  }

  private async renderGraph() {
    if (!this.core || !this.refs) {
      return;
    }

    const cfg = MODE_CONFIGS[this.mode];
    const patterns = this.buildPatterns();
    this.evolveTick += 1;

    const reset = 0;

    const master = el.smooth(0.997, this.refs.master.node);
    const beat = el.smooth(0.999, this.refs.beat.node);
    const carrier = el.smooth(0.999, this.refs.carrier.node);
    const root = el.smooth(0.999, this.refs.root.node);
    const warmth = el.smooth(0.998, this.refs.warmth.node);
    const energy = el.smooth(0.998, this.refs.energy.node);

    const chordStep = el.train(cfg.pulseBpm / 60 / 8 + 0.002);
    const harmonicMotion = el.seq({ key: "harmonic-seq", seq: patterns.chordSeq, hold: true }, chordStep, reset);

    const drones = patterns.voiceSeqs.map((voiceSeq, i) => {
      const step = el.seq({ key: `voice-seq-${i}`, seq: voiceSeq, hold: true }, el.train(0.06 + i * 0.02), reset);
      const wobble = el.add(1, el.mul(0.01 + i * 0.005, el.cycle(0.007 + i * 0.004)));
      const interval = cfg.droneIntervals[i % cfg.droneIntervals.length] ?? 1;

      const freq = el.mul(root, interval, harmonicMotion, step, wobble);
      const osc = el.cycle(freq);
      const cutoff = el.add(520, el.mul(1400, energy), el.mul(700, warmth), el.mul(180, el.cycle(0.011 + i * 0.006)));
      const filtered = el.lowpass(cutoff, 0.72, osc);

      return el.mul(0.08 + cfg.warmth * 0.04 - i * 0.01, filtered);
    });

    const pulseTrig = el.train(patterns.pulseRate);
    const pulseGate = el.seq({ key: "pulse-gate", seq: patterns.pulseGateSeq, hold: true }, pulseTrig, reset);
    const pulsePitch = el.seq({ key: "pulse-pitch", seq: patterns.pulsePitchSeq, hold: true }, pulseTrig, reset);

    const pulseEnv = el.adsr(0.003, 0.09, 0, 0.15 + cfg.warmth * 0.2, pulseGate);
    const pulseOsc = el.cycle(pulsePitch);
    const pulseTone = el.mul(0.09 + cfg.energy * 0.08, pulseEnv, el.lowpass(220 + cfg.energy * 260, 0.9, pulseOsc));

    const air = el.mul(
      0.008 + cfg.warmth * 0.018,
      el.lowpass(el.add(900, el.mul(2200, warmth)), 0.65, el.pinknoise({ key: "air-noise", seed: patterns.seed }))
    );

    const shimmer = el.mul(0.02 + cfg.energy * 0.01, el.cycle(el.mul(root, 0.5, harmonicMotion, el.add(1, el.mul(0.01, el.cycle(0.021))))));

    const drumStep = el.train(patterns.drumRate);

    const kickGate = el.seq({ key: "kick-seq", seq: patterns.kickSeq, hold: true }, drumStep, reset);
    const kickEnv = el.adsr(0.001, 0.05, 0, 0.1 + cfg.warmth * 0.08, kickGate);
    const kickPitch = el.add(40, el.mul(130, el.mul(kickEnv, kickEnv)));
    const kickBody = el.cycle(kickPitch);
    const kickClick = el.highpass(2400, 0.72, el.noise({ key: "kick-click", seed: patterns.seed + 11 }));
    const kick = el.mul(
      0.42 + cfg.energy * 0.22,
      el.tanh(el.add(el.mul(kickEnv, kickBody), el.mul(0.06, kickEnv, kickClick)))
    );

    const snareGate = el.seq({ key: "snare-seq", seq: patterns.snareSeq, hold: true }, drumStep, reset);
    const snareEnv = el.adsr(0.001, 0.04, 0, 0.14 + cfg.warmth * 0.08, snareGate);
    const snareNoise = el.bandpass(
      2200 + cfg.energy * 1400,
      0.86,
      el.noise({ key: "snare-noise", seed: patterns.seed + 17 })
    );
    const snareBody = el.cycle(180 + cfg.energy * 32);
    const snare = el.mul(
      0.18 + cfg.energy * 0.12,
      el.tanh(el.add(el.mul(snareEnv, snareNoise), el.mul(0.5, snareEnv, snareBody)))
    );

    const hatGate = el.seq({ key: "hat-seq", seq: patterns.hatSeq, hold: true }, drumStep, reset);
    const hatEnv = el.adsr(0.0008, 0.01, 0, 0.03, hatGate);
    const hatNoise = el.highpass(5600 + cfg.energy * 1200, 0.78, el.noise({ key: "hat-noise", seed: patterns.seed + 23 }));
    const hatMetal = el.square(6800 + cfg.energy * 900);
    const hats = el.mul(0.1 + cfg.energy * 0.06, hatEnv, el.tanh(el.add(hatNoise, el.mul(0.2, hatMetal))));

    const openHatGate = el.seq({ key: "openh-seq", seq: patterns.openHatSeq, hold: true }, drumStep, reset);
    const openHatEnv = el.adsr(0.001, 0.02, 0, 0.12 + cfg.warmth * 0.12, openHatGate);
    const openHat = el.mul(
      0.07 + cfg.energy * 0.04,
      openHatEnv,
      el.highpass(4200 + cfg.energy * 900, 0.74, el.pinknoise({ key: "openh-noise", seed: patterns.seed + 29 }))
    );

    const clapGate = el.seq({ key: "clap-seq", seq: patterns.clapSeq, hold: true }, drumStep, reset);
    const clapEnv = el.adsr(0.001, 0.02, 0, 0.11, clapGate);
    const clap = el.mul(
      0.08 + cfg.energy * 0.05,
      clapEnv,
      el.bandpass(1600 + cfg.energy * 800, 0.9, el.noise({ key: "clap-noise", seed: patterns.seed + 31 }))
    );

    const rimGate = el.seq({ key: "rim-seq", seq: patterns.rimSeq, hold: true }, drumStep, reset);
    const rimEnv = el.adsr(0.001, 0.008, 0, 0.035, rimGate);
    const rim = el.mul(0.06 + cfg.energy * 0.03, rimEnv, el.cycle(1280 + cfg.energy * 220));

    const drumBus = el.add(kick, snare, hats, openHat, clap, rim);
    const drumShaped = el.lowpass(11000, 0.76, el.highpass(38, 0.72, drumBus));

    const leftCarrierFreq = el.sub(el.mul(carrier, el.add(1, el.mul(0.004, el.cycle(0.013)))), el.div(beat, 2));
    const rightCarrierFreq = el.add(el.mul(carrier, el.add(1, el.mul(0.004, el.cycle(0.017)))), el.div(beat, 2));

    const leftCarrier = el.mul(0.16, el.cycle(leftCarrierFreq));
    const rightCarrier = el.mul(0.16, el.cycle(rightCarrierFreq));

    const bed = el.add(...drones, pulseTone, air, shimmer);

    const stereoDrift = el.mul(0.02, el.cycle(0.006));
    const leftBed = el.mul(el.add(1, stereoDrift), bed);
    const rightBed = el.mul(el.sub(1, stereoDrift), bed);

    const drumPan = el.mul(0.2, el.cycle(0.09));
    const drumPresence = 0.35 + cfg.energy * 0.45 - cfg.warmth * 0.1;
    const leftDrums = el.mul(drumPresence, el.add(1, drumPan), drumShaped);
    const rightDrums = el.mul(drumPresence, el.sub(1, drumPan), drumShaped);

    const left = el.tanh(el.mul(master, el.add(leftBed, leftCarrier, leftDrums)));
    const right = el.tanh(el.mul(master, el.add(rightBed, rightCarrier, rightDrums)));

    const meteredLeft = el.meter({ name: "focus-left-meter" }, left);
    const meteredRight = el.meter({ name: "focus-right-meter" }, right);

    await this.core.render(meteredLeft, meteredRight);

    (globalThis as { __focusMusicDebug?: unknown }).__focusMusicDebug = {
      mode: this.mode,
      isRunning: this.isRunning,
      contextState: this.context?.state ?? "unknown",
      currentTime: this.context?.currentTime ?? 0,
      meter: this.meter
    };
  }
}
