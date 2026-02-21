import { Audio, InterruptionModeAndroid, InterruptionModeIOS, type AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";

import { MODE_CONFIGS, type FocusMode } from "../constants/modes";

import { buildSongComposition, midiToHz } from "./composition";
import { getInstrumentationProfile, getMixProfile, getNativeDrumKitProfile, getNativeTimbreProfile } from "./profiles";
import { createSongPreset, type SongPreset } from "./song";
import type { EngineStartOptions, IGenerativeMusicEngine } from "./types";
import { encodeStereoWavBase64 } from "./wav";

const SAMPLE_RATE = 22050;
const SEGMENT_SECONDS = 18;
const CROSSFADE_SECONDS = 4;

type PreparedSound = {
  sound: Audio.Sound;
  uri: string;
};

const TWO_PI = Math.PI * 2;

const fract = (value: number) => value - Math.floor(value);

const saw = (frequency: number, time: number, phase = 0) => 2 * fract(frequency * time + phase / TWO_PI) - 1;

const noise = (sampleIndex: number, seed: number) => {
  const value = Math.sin((sampleIndex + seed * 73.17) * 12.9898) * 43758.5453123;
  return (value - Math.floor(value)) * 2 - 1;
};

export class GenerativeMusicEngine implements IGenerativeMusicEngine {
  private mode: FocusMode = "focus";
  private volume = 0.6;
  private song: SongPreset = createSongPreset("focus", 101_001);
  private active: PreparedSound | null = null;
  private warming: PreparedSound | null = null;
  private regenTimer: ReturnType<typeof setTimeout> | null = null;
  private seedCounter = 0;
  private crossfading = false;
  private running = false;

  async start({ mode, volume, song }: EngineStartOptions) {
    this.mode = mode;
    this.volume = volume;
    this.song = song;

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

    await Promise.all([this.unloadPreparedSound(this.active), this.unloadPreparedSound(this.warming)]);

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

  async setSong(song: SongPreset) {
    this.song = song;

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
    const song = this.song;
    const segmentSeed = song.seed + this.seedCounter * 9973;
    this.seedCounter += 1;

    const timbre = getNativeTimbreProfile(song.timbre);
    const drums = getNativeDrumKitProfile(song.drumKit);
    const instrumentation = getInstrumentationProfile(song);
    const mixProfile = getMixProfile(song);
    const composition = buildSongComposition(this.mode, song, this.seedCounter, cfg.pulseBpm);

    const totalSamples = Math.floor(SAMPLE_RATE * SEGMENT_SECONDS);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);

    const phase = [0.37, 1.18, 2.29];
    const rootHz = midiToHz(song.rootMidi);
    const chordRate = (cfg.pulseBpm / 60) * song.tempoScale / 8;
    const padRate = (cfg.pulseBpm / 60) * song.tempoScale / 4;

    const masterHighpassHz = 95 + song.subTrim * 110;
    const dt = 1 / SAMPLE_RATE;
    const rc = 1 / (TWO_PI * masterHighpassHz);
    const hpAlpha = rc / (rc + dt);

    let prevInputL = 0;
    let prevInputR = 0;
    let prevOutputL = 0;
    let prevOutputR = 0;
    const spaceDelayA = Math.max(1, Math.floor(SAMPLE_RATE * (0.17 + mixProfile.reverbBedSend * 0.24)));
    const spaceDelayB = Math.max(1, Math.floor(SAMPLE_RATE * (0.28 + mixProfile.reverbRiffSend * 0.2)));
    const echoDelay = Math.max(1, Math.floor(SAMPLE_RATE * (0.19 + mixProfile.echoSend * 0.25)));
    const spaceBufferL1 = new Float32Array(spaceDelayA);
    const spaceBufferR1 = new Float32Array(spaceDelayA);
    const spaceBufferL2 = new Float32Array(spaceDelayB);
    const spaceBufferR2 = new Float32Array(spaceDelayB);
    const echoBufferL = new Float32Array(echoDelay);
    const echoBufferR = new Float32Array(echoDelay);
    let spaceIdx1 = 0;
    let spaceIdx2 = 0;
    let echoIdx = 0;
    const compAttack = Math.exp(-1 / (SAMPLE_RATE * 0.01));
    const compRelease = Math.exp(-1 / (SAMPLE_RATE * 0.18));
    let compEnv = 0;
    let compGain = 1;

    for (let i = 0; i < totalSamples; i += 1) {
      const t = i / SAMPLE_RATE;

      const leftBeat = Math.sin(TWO_PI * (cfg.carrierHz - cfg.beatHz / 2) * t + phase[0]);
      const rightBeat = Math.sin(TWO_PI * (cfg.carrierHz + cfg.beatHz / 2) * t + phase[0]);

      const chordIndex = Math.floor(t * chordRate) % composition.chordRatioSeq.length;
      const harmonicRatio = composition.chordRatioSeq[chordIndex] ?? 1;

      const padStep = Math.floor(t * padRate) % 16;

      let droneL = 0;
      let droneR = 0;
      for (let voice = 0; voice < instrumentation.padVoices; voice += 1) {
        const ratio = composition.padRatioSeqs[voice]?.[padStep] ?? 1;
        const drift = 0.004 * Math.sin(TWO_PI * (0.011 + voice * 0.004) * t + phase[(voice + 1) % 3]);
        const freq = rootHz * ratio * (1 + drift);

        const sine = Math.sin(TWO_PI * freq * t + phase[voice]);
        const sawPart = saw(freq, t, phase[voice]);
        const pulsePart = Math.sign(Math.sin(TWO_PI * (freq * 0.5) * t + phase[(voice + 2) % 3]));
        const osc = sine * (1 - timbre.sawMix - timbre.pulseMix) + sawPart * timbre.sawMix + pulsePart * timbre.pulseMix;

        const gain = 0.1 + cfg.warmth * 0.025 - voice * 0.012;
        const pan = voice === 0 ? -0.2 : voice === 1 ? 0 : 0.2;

        droneL += osc * gain * (1 - pan);
        droneR += osc * gain * (1 + pan);
      }

      const bassStep = Math.floor((t * composition.pulseRate) / 2) % composition.bassRatioSeq.length;
      const bassFreq = rootHz * (composition.bassRatioSeq[bassStep] ?? 0.5) * harmonicRatio;
      const bassRaw =
        instrumentation.bassModel === "sub"
          ? Math.sin(TWO_PI * bassFreq * t + phase[1])
          : instrumentation.bassModel === "pluck"
            ? saw(bassFreq, t, phase[1]) * 0.62 + Math.sin(TWO_PI * bassFreq * 2 * t + phase[2]) * 0.38
            : saw(bassFreq, t, phase[1]);
      const bass = bassRaw * (0.045 + song.drumDensity * 0.03);

      const pulseStepFloat = t * composition.pulseRate;
      const pulseStep = Math.floor(pulseStepFloat) % composition.pulseGateSeq.length;
      const pulsePhase = fract(pulseStepFloat);
      const pulseGate = composition.pulseGateSeq[pulseStep] ?? 0;
      const pulseAccent = composition.pulseAccentSeq[pulseStep] ?? 0.6;
      const pulseEnv = pulseGate ? Math.exp(-8.8 * pulsePhase) : 0;
      const pulseFreq = rootHz * (composition.pulseRatioSeq[pulseStep] ?? 0.25);
      const pulseRaw =
        instrumentation.pulseModel === "noise"
          ? noise(i, segmentSeed + 7009)
          : instrumentation.pulseModel === "fm"
            ? Math.sin(TWO_PI * (pulseFreq + pulseFreq * 0.32 * Math.sin(TWO_PI * pulseFreq * 0.5 * t + phase[1])) * t + phase[2])
            : Math.sin(TWO_PI * pulseFreq * t + phase[2]) * 0.72 + saw(pulseFreq * 2.01, t, phase[0]) * 0.28;
      const pulse = pulseRaw * pulseEnv * pulseAccent * (0.052 + cfg.energy * 0.03);

      const drumStepFloat = t * composition.drumRate;
      const drumStep = Math.floor(drumStepFloat) % 16;
      const drumPhase = fract(drumStepFloat);

      const kickGate = composition.kickSeq[drumStep] ?? 0;
      const kickEnv = kickGate ? Math.exp(-drumPhase / drums.kickDecay) : 0;
      const kickFreq = 36 + 130 * kickEnv;
      const kickNoise = noise(i, segmentSeed + 1001) * drums.kickClick;
      const kick = (Math.sin(TWO_PI * kickFreq * t) + kickNoise) * kickEnv * (0.23 + song.drumDensity * 0.24);

      const snareGate = composition.snareSeq[drumStep] ?? 0;
      const snareEnv = snareGate ? Math.exp(-drumPhase / 0.11) : 0;
      const snareBody = Math.sin(TWO_PI * (180 + cfg.energy * 30) * t) * 0.38;
      const snareNoise = noise(i, segmentSeed + 2003) * drums.snareNoise;
      const snare = (snareBody + snareNoise * 0.62) * snareEnv * (0.09 + song.drumDensity * 0.1);

      const hatGate = composition.hatSeq[drumStep] ?? 0;
      const hatEnv = hatGate ? Math.exp(-drumPhase / 0.035) : 0;
      const hat = noise(i, segmentSeed + 3001) * drums.hatNoise * hatEnv * (0.042 + song.drumDensity * 0.05);

      const openHatGate = composition.openHatSeq[drumStep] ?? 0;
      const openHatEnv = openHatGate ? Math.exp(-drumPhase / 0.12) : 0;
      const openHat =
        (instrumentation.openHatOn ? 1 : 0) * noise(i, segmentSeed + 3007) * drums.hatNoise * openHatEnv * (0.03 + song.drumDensity * 0.04);

      const clapGate = composition.clapSeq[drumStep] ?? 0;
      const clapEnv = clapGate ? Math.exp(-drumPhase / 0.09) : 0;
      const clap = (instrumentation.clapOn ? 1 : 0) * noise(i, segmentSeed + 4013) * clapEnv * (0.03 + song.drumDensity * 0.03);

      const rimGate = composition.rimSeq[drumStep] ?? 0;
      const rimEnv = rimGate ? Math.exp(-drumPhase / 0.04) : 0;
      const rim = (instrumentation.rimOn ? 1 : 0) * Math.sin(TWO_PI * (940 + cfg.energy * 260) * t) * rimEnv * (0.014 + song.drumDensity * 0.02);

      const riffStepFloat = t * composition.riffRate;
      const riffStep = Math.floor(riffStepFloat) % composition.riffGateSeq.length;
      const riffPhase = fract(riffStepFloat);
      const riffGate = composition.riffGateSeq[riffStep] ?? 0;
      const riffAccent = composition.riffAccentSeq[riffStep] ?? 0.6;
      const riffEnv = riffGate ? Math.exp(-5.2 * riffPhase) : 0;
      const riffRatio = composition.riffRatioSeq[riffStep] ?? 1;
      const riffFreq = rootHz * song.riffRegister * riffRatio * (1 + song.swing * 0.06 * Math.sin(TWO_PI * 0.17 * t));
      const riffRaw =
        instrumentation.riffModel === "square"
          ? Math.sign(Math.sin(TWO_PI * riffFreq * t + phase[1])) * 0.72 + Math.sin(TWO_PI * riffFreq * 2 * t + phase[2]) * 0.28
          : instrumentation.riffModel === "sine"
            ? Math.sin(TWO_PI * riffFreq * t + phase[1]) * 0.78 + saw(riffFreq * 0.5, t, phase[2]) * 0.22
            : saw(riffFreq, t, phase[1]) * 0.68 + Math.sin(TWO_PI * riffFreq * 2.01 * t + phase[2]) * 0.32;
      const riff =
        (instrumentation.riffEnabled ? 1 : 0) * riffRaw * riffEnv * riffAccent * (0.04 + song.hookDensity * 0.08);

      const air = noise(i, segmentSeed + 5009) * timbre.airGain * instrumentation.airLevel * (0.006 + song.brightness * 0.012);
      const shimmer =
        Math.sin(TWO_PI * (rootHz * 4.02 + song.brightness * 240) * t + phase[0]) * timbre.shimmerGain * instrumentation.shimmerLevel * 0.004;

      const drumBus = (kick + snare + hat + openHat + clap + rim) * (0.9 + drums.drive);
      const duck = 1 - kickEnv * (0.13 + song.drumDensity * 0.1);
      const bedLeft = (droneL + bass + pulse + riff + air + shimmer) * duck * instrumentation.bedLevel;
      const bedRight = (droneR + bass + pulse + riff + air + shimmer) * duck * instrumentation.bedLevel;
      const drumLeft = drumBus * (0.55 + song.drumDensity * 0.35) * 0.95 * instrumentation.drumLevel;
      const drumRight = drumBus * (0.55 + song.drumDensity * 0.35) * 1.05 * instrumentation.drumLevel;

      const spaceTapL1 = spaceBufferL1[spaceIdx1];
      const spaceTapR1 = spaceBufferR1[spaceIdx1];
      const spaceInL1 = bedLeft * mixProfile.reverbBedSend + drumLeft * mixProfile.reverbDrumSend + riff * mixProfile.reverbRiffSend;
      const spaceInR1 = bedRight * mixProfile.reverbBedSend + drumRight * mixProfile.reverbDrumSend + riff * mixProfile.reverbRiffSend;
      spaceBufferL1[spaceIdx1] = spaceInL1 + spaceTapL1 * 0.48 + spaceTapR1 * 0.14;
      spaceBufferR1[spaceIdx1] = spaceInR1 + spaceTapR1 * 0.48 + spaceTapL1 * 0.14;
      spaceIdx1 = (spaceIdx1 + 1) % spaceBufferL1.length;

      const spaceTapL2 = spaceBufferL2[spaceIdx2];
      const spaceTapR2 = spaceBufferR2[spaceIdx2];
      spaceBufferL2[spaceIdx2] = spaceTapL1 + spaceTapL2 * 0.4;
      spaceBufferR2[spaceIdx2] = spaceTapR1 + spaceTapR2 * 0.4;
      spaceIdx2 = (spaceIdx2 + 1) % spaceBufferL2.length;

      const spaceOutL = (spaceTapL1 * 0.56 + spaceTapL2 * 0.44) * (0.35 + mixProfile.reverbBedSend * 0.6);
      const spaceOutR = (spaceTapR1 * 0.56 + spaceTapR2 * 0.44) * (0.35 + mixProfile.reverbBedSend * 0.6);

      const echoTapL = echoBufferL[echoIdx];
      const echoTapR = echoBufferR[echoIdx];
      const echoInL = (bedLeft + riff * 0.55) * mixProfile.echoSend + echoTapL * mixProfile.echoFeedback + echoTapR * 0.08;
      const echoInR = (bedRight + riff * 0.55) * mixProfile.echoSend + echoTapR * mixProfile.echoFeedback + echoTapL * 0.08;
      echoBufferL[echoIdx] = echoInL;
      echoBufferR[echoIdx] = echoInR;
      echoIdx = (echoIdx + 1) % echoBufferL.length;
      const echoOutL = echoTapL * 0.55;
      const echoOutR = echoTapR * 0.55;

      const preLeft = leftBeat * instrumentation.carrierLevel + bedLeft + drumLeft + spaceOutL + echoOutL;
      const preRight = rightBeat * instrumentation.carrierLevel + bedRight + drumRight + spaceOutR + echoOutR;

      const detector = Math.max(Math.abs(preLeft), Math.abs(preRight));
      if (detector > compEnv) {
        compEnv = compAttack * compEnv + (1 - compAttack) * detector;
      } else {
        compEnv = compRelease * compEnv + (1 - compRelease) * detector;
      }

      let targetGain = 1;
      if (compEnv > mixProfile.compThreshold) {
        const over = compEnv / mixProfile.compThreshold;
        targetGain = Math.pow(over, 1 / mixProfile.compRatio - 1);
      }
      compGain += (targetGain - compGain) * 0.08;
      const glueGain = (1 - mixProfile.glueAmount) + mixProfile.glueAmount * compGain;

      const gluedL = preLeft * glueGain;
      const gluedR = preRight * glueGain;
      const mid = (gluedL + gluedR) * 0.5;
      const side = (gluedL - gluedR) * 0.5 * mixProfile.stereoWidth;
      const widenedL = mid + side;
      const widenedR = mid - side;

      const saturatedL = Math.tanh(widenedL * mixProfile.masterDrive * (0.84 + timbre.droneDrive + timbre.riffDrive));
      const saturatedR = Math.tanh(widenedR * mixProfile.masterDrive * (0.84 + timbre.droneDrive + timbre.riffDrive));

      const hpL = hpAlpha * (prevOutputL + saturatedL - prevInputL);
      const hpR = hpAlpha * (prevOutputR + saturatedR - prevInputR);

      prevInputL = saturatedL;
      prevInputR = saturatedR;
      prevOutputL = hpL;
      prevOutputR = hpR;

      left[i] = hpL;
      right[i] = hpR;
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
