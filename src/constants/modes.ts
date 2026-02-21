export type FocusMode = "focus" | "relax" | "sleep";

export type ModeConfig = {
  id: FocusMode;
  title: string;
  subtitle: string;
  beatHz: number;
  carrierHz: number;
  droneRootHz: number;
  droneIntervals: number[];
  pulseBpm: number;
  warmth: number;
  energy: number;
};

export const MODE_CONFIGS: Record<FocusMode, ModeConfig> = {
  focus: {
    id: "focus",
    title: "Focus",
    subtitle: "Alpha waves with subtle forward drive",
    beatHz: 10,
    carrierHz: 180,
    droneRootHz: 110,
    droneIntervals: [1, 1.5, 2, 2.5],
    pulseBpm: 72,
    warmth: 0.45,
    energy: 0.7
  },
  relax: {
    id: "relax",
    title: "Relax",
    subtitle: "Theta rhythms and warm slow movement",
    beatHz: 6,
    carrierHz: 150,
    droneRootHz: 98,
    droneIntervals: [1, 1.333, 1.667, 2],
    pulseBpm: 52,
    warmth: 0.7,
    energy: 0.4
  },
  sleep: {
    id: "sleep",
    title: "Sleep",
    subtitle: "Delta pulses and near-still evolution",
    beatHz: 3,
    carrierHz: 120,
    droneRootHz: 82,
    droneIntervals: [1, 1.25, 1.5, 2],
    pulseBpm: 36,
    warmth: 0.85,
    energy: 0.2
  }
};

export const MODE_ORDER: FocusMode[] = ["focus", "relax", "sleep"];
