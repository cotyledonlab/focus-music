import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { GenerativeMusicEngine } from "../audio/musicEngine";
import { cloneSongForFavorite, createSongPreset, sanitizeSongPreset, type SongPreset } from "../audio/song";
import type { IGenerativeMusicEngine } from "../audio/types";
import { MODE_CONFIGS, type FocusMode } from "../constants/modes";

const FAVORITES_STORAGE_KEY = "@focus-music/favorite-songs-v1";

type PlayerContextValue = {
  mode: FocusMode;
  isPlaying: boolean;
  isBusy: boolean;
  volume: number;
  timerSeconds: number | null;
  remainingSeconds: number | null;
  error: string | null;
  modeConfig: (typeof MODE_CONFIGS)[FocusMode];
  currentSong: SongPreset;
  favoriteSongs: SongPreset[];
  isFavoriteCurrentSong: boolean;
  selectMode: (mode: FocusMode) => Promise<void>;
  togglePlayback: () => Promise<void>;
  setVolume: (value: number) => Promise<void>;
  setTimerMinutes: (minutes: number | null) => void;
  generateSong: (mode?: FocusMode) => Promise<void>;
  toggleFavoriteSong: () => void;
  loadSong: (song: SongPreset) => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export const PlayerProvider = ({ children }: PropsWithChildren) => {
  const engineRef = useRef<IGenerativeMusicEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new GenerativeMusicEngine();
  }

  const [mode, setMode] = useState<FocusMode>("focus");
  const [currentSong, setCurrentSong] = useState<SongPreset>(() => createSongPreset("focus"));
  const [favoriteSongs, setFavoriteSongs] = useState<SongPreset[]>([]);
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

      const activeMode = currentSong.mode;
      if (activeMode !== mode) {
        setMode(activeMode);
      }

      await engineRef.current.start({ mode: activeMode, volume, song: currentSong });
      setIsPlaying(true);

      if (timerSeconds && timerSeconds > 0) {
        setRemainingSeconds((current) => (current && current > 0 ? current : timerSeconds));
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to control audio playback.");
    } finally {
      setIsBusy(false);
    }
  }, [currentSong, isBusy, isPlaying, mode, timerSeconds, volume]);

  const loadSong = useCallback(
    async (song: SongPreset) => {
      const normalized = cloneSongForFavorite(song, favoriteSongs.some((saved) => saved.id === song.id));
      setCurrentSong(normalized);
      setMode(normalized.mode);

      if (!engineRef.current || !isPlaying) {
        return;
      }

      try {
        await engineRef.current.setMode(normalized.mode);
        await engineRef.current.setSong(normalized);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load song.");
      }
    },
    [favoriteSongs, isPlaying]
  );

  const generateSong = useCallback(
    async (targetMode?: FocusMode) => {
      const nextMode = targetMode ?? mode;
      const nextSong = createSongPreset(nextMode);

      setCurrentSong(nextSong);
      setMode(nextMode);

      if (!engineRef.current || !isPlaying) {
        return;
      }

      try {
        await engineRef.current.setMode(nextMode);
        await engineRef.current.setSong(nextSong);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to generate new song.");
      }
    },
    [isPlaying, mode]
  );

  const selectMode = useCallback(
    async (nextMode: FocusMode) => {
      const nextSong = currentSong.mode === nextMode ? currentSong : createSongPreset(nextMode);
      setMode(nextMode);
      setCurrentSong(nextSong);

      if (!engineRef.current || !isPlaying) {
        return;
      }

      try {
        await engineRef.current.setMode(nextMode);
        await engineRef.current.setSong(nextSong);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to update mode.");
      }
    },
    [currentSong, isPlaying]
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

  const isFavoriteCurrentSong = favoriteSongs.some((song) => song.id === currentSong.id);

  const toggleFavoriteSong = useCallback(() => {
    const nextFavorite = !isFavoriteCurrentSong;

    setFavoriteSongs((current) => {
      if (!nextFavorite) {
        return current.filter((song) => song.id !== currentSong.id);
      }

      const favorite = cloneSongForFavorite(currentSong, true);
      return [favorite, ...current].slice(0, 24);
    });

    setCurrentSong((song) => cloneSongForFavorite(song, nextFavorite));
  }, [currentSong, isFavoriteCurrentSong]);

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

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as unknown[];
        const favorites = parsed
          .map((entry) => sanitizeSongPreset(typeof entry === "object" && entry != null ? (entry as Partial<SongPreset>) : {}))
          .filter((song): song is SongPreset => Boolean(song))
          .map((song) => cloneSongForFavorite(song, true));

        setFavoriteSongs(favorites);
      } catch {
        // Ignore failed persistence reads.
      }
    })();
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteSongs));
  }, [favoriteSongs]);

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
      currentSong,
      favoriteSongs,
      isFavoriteCurrentSong,
      selectMode,
      togglePlayback,
      setVolume,
      setTimerMinutes,
      generateSong,
      toggleFavoriteSong,
      loadSong
    }),
    [
      currentSong,
      error,
      favoriteSongs,
      generateSong,
      isBusy,
      isFavoriteCurrentSong,
      isPlaying,
      loadSong,
      mode,
      modeConfig,
      remainingSeconds,
      selectMode,
      setTimerMinutes,
      setVolume,
      timerSeconds,
      toggleFavoriteSong,
      togglePlayback,
      volume
    ]
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
