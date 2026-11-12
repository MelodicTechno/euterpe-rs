import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioTrack } from '../state/types';

export interface AudioPlayer {
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
}

const AUDIO_ERROR_MESSAGE =
  '音频无法播放，请确认文件是有效的 mp3 或 wav。';

function mimeTypeFor(name: string): string {
  return name.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
}

export function useAudioPlayer(
  track: AudioTrack | null,
  onError?: (message: string) => void,
): AudioPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    let frame = 0;
    const update = () => setCurrentTimeMs(Math.round(audio.currentTime * 1000));
    const stopLoop = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const tick = () => {
      update();
      frame = requestAnimationFrame(tick);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      stopLoop();
      frame = requestAnimationFrame(tick);
    };
    const handlePause = () => {
      setIsPlaying(false);
      stopLoop();
      update();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      stopLoop();
      update();
      const end = Number.isFinite(audio.duration) ? audio.duration : audio.currentTime;
      setCurrentTimeMs(Math.round(end * 1000));
    };
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDurationMs(Math.round(audio.duration * 1000));
      }
    };
    const handleError = () => {
      setIsPlaying(false);
      stopLoop();
      onErrorRef.current?.(AUDIO_ERROR_MESSAGE);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      stopLoop();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setCurrentTimeMs(0);
    setIsPlaying(false);
    setDurationMs(track?.durationMs && track.durationMs > 0 ? track.durationMs : 0);

    if (!track) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    const copy = new Uint8Array(track.bytes.byteLength);
    copy.set(track.bytes);
    const blob = new Blob([copy], { type: mimeTypeFor(track.name) });
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.load();

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
    };
  }, [track?.id]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      return;
    }
    if (
      audio.ended ||
      (Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        audio.currentTime >= audio.duration - 0.05)
    ) {
      audio.currentTime = 0;
    }
    void audio.play().catch((error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      onErrorRef.current?.(AUDIO_ERROR_MESSAGE);
    });
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      return;
    }
    const maxSeconds = Number.isFinite(audio.duration) ? audio.duration : null;
    const seconds = Math.max(0, ms / 1000);
    const clamped =
      maxSeconds === null ? seconds : Math.min(seconds, Math.max(0, maxSeconds));
    audio.currentTime = clamped;
    setCurrentTimeMs(Math.round(clamped * 1000));
  }, []);

  return {
    isPlaying,
    currentTimeMs,
    durationMs,
    play,
    pause,
    toggle,
    seek,
  };
}
