import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { GenerativeMusicEngine } from "../audio/musicEngine";
import type { IGenerativeMusicEngine } from "../audio/types";
import { MODE_CONFIGS, type FocusMode } from "../constants/modes";

type PlayerContextValue = {
  mode: FocusMode;
  isPlaying: boolean;
  isBusy: boolean;
  volume: number;
  timerSeconds: number | null;
  remainingSeconds: number | null;
  error: string | null;
  modeConfig: (typeof MODE_CONFIGS)[FocusMode];
  selectMode: (mode: FocusMode) => Promise<void>;
  togglePlayback: () => Promise<void>;
  setVolume: (value: number) => Promise<void>;
  setTimerMinutes: (minutes: number | null) => void;
};

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const engineRef = useRef<IGenerativeMusicEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new GenerativeMusicEngine();
  }

  const [mode, setMode] = useState<FocusMode>("focus");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.62);

  const [timerSeconds, setTimerSeconds] = useState<number | null>(45 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const stopPlayback = useCallback(async () => {
    if (!engineRef.current) {
      return;
    }

    await engineRef.current.stop();
    setIsPlaying(false);
  }, []);

  const togglePlayback = useCallback(async () => {
    if (!engineRef.current || isBusy) {
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      if (isPlaying) {
        await engineRef.current.stop();
        setIsPlaying(false);
        return;
      }

      await engineRef.current.start({ mode, volume });
      setIsPlaying(true);

      if (timerSeconds && timerSeconds > 0) {
        setRemainingSeconds((current) => (current && current > 0 ? current : timerSeconds));
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to control audio playback.");
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, isPlaying, mode, timerSeconds, volume]);

  const selectMode = useCallback(
    async (nextMode: FocusMode) => {
      if (!engineRef.current || mode === nextMode) {
        setMode(nextMode);
        return;
      }

      setMode(nextMode);

      if (!isPlaying) {
        return;
      }

      try {
        await engineRef.current.setMode(nextMode);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to update mode.");
      }
    },
    [isPlaying, mode]
  );

  const setVolume = useCallback(
    async (nextVolume: number) => {
      const normalized = clamp(nextVolume);
      setVolumeState(normalized);

      if (!engineRef.current || !isPlaying) {
        return;
      }

      try {
        await engineRef.current.setVolume(normalized);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to set volume.");
      }
    },
    [isPlaying]
  );

  const setTimerMinutes = useCallback((minutes: number | null) => {
    if (!minutes || minutes <= 0) {
      setTimerSeconds(null);
      setRemainingSeconds(null);
      return;
    }

    const totalSeconds = Math.round(minutes * 60);
    setTimerSeconds(totalSeconds);
    setRemainingSeconds(totalSeconds);
  }, []);

  useEffect(() => {
    if (!isPlaying || remainingSeconds == null) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current == null) {
          return current;
        }

        if (current <= 1) {
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, remainingSeconds]);

  useEffect(() => {
    if (remainingSeconds !== 0) {
      return;
    }

    void (async () => {
      await stopPlayback();
      if (timerSeconds && timerSeconds > 0) {
        setRemainingSeconds(timerSeconds);
      }
    })();
  }, [remainingSeconds, stopPlayback, timerSeconds]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        void engineRef.current.dispose();
      }
    };
  }, []);

  const modeConfig = MODE_CONFIGS[mode];

  const value = useMemo<PlayerContextValue>(
    () => ({
      mode,
      isPlaying,
      isBusy,
      volume,
      timerSeconds,
      remainingSeconds,
      error,
      modeConfig,
      selectMode,
      togglePlayback,
      setVolume,
      setTimerMinutes
    }),
    [error, isBusy, isPlaying, mode, modeConfig, remainingSeconds, selectMode, setTimerMinutes, setVolume, timerSeconds, togglePlayback, volume]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }

  return context;
};
