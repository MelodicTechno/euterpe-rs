import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAudioPlayer } from './useAudioPlayer';
import { makeAudio } from '../test/factories';
import type { AudioTrack } from '../state/types';

class FakeAudio extends EventTarget {
  src = '';
  preload = '';
  loop = false;
  currentTime = 0;
  duration = 60;
  ended = false;
  paused = true;
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  });
  pause = vi.fn(() => {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  });
  load = vi.fn();
  removeAttribute = vi.fn((name: string) => {
    if (name === 'src') {
      this.src = '';
    }
  });
}

let audio: FakeAudio;
let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
  audio = new FakeAudio();
  vi.stubGlobal(
    'Audio',
    vi.fn(function FakeAudioConstructor() {
      return audio;
    }),
  );
  createObjectURL = vi.fn(() => `blob:mock-${createObjectURL.mock.calls.length}`);
  revokeObjectURL = vi.fn();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

function track(id = 'audio-1'): AudioTrack {
  return makeAudio({ id, durationMs: 0 });
}

describe('useAudioPlayer', () => {
  it('loads a blob url, applies metadata duration and revokes on replacement', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: AudioTrack | null }) => useAudioPlayer(value),
      { initialProps: { value: track() } },
    );

    await waitFor(() => expect(audio.src).toBe('blob:mock-1'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(audio.loop).toBe(false);

    audio.duration = 65.432;
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'));
    });
    expect(result.current.durationMs).toBe(65_432);

    rerender({ value: track('audio-2') });

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
  });

  it('plays, pauses, seeks with clamping and reports ended state', async () => {
    const { result } = renderHook(() => useAudioPlayer(track()));
    await waitFor(() => expect(audio.src).toBe('blob:mock-1'));

    await act(async () => {
      result.current.play();
    });
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.seek(70_000);
    });
    expect(audio.currentTime).toBe(60);
    expect(result.current.currentTimeMs).toBe(60_000);

    audio.ended = true;
    audio.currentTime = 60;
    act(() => {
      audio.dispatchEvent(new Event('ended'));
    });
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTimeMs).toBe(60_000);

    audio.paused = false;
    audio.ended = false;
    await act(async () => {
      result.current.play();
    });
    expect(audio.currentTime).toBe(0);
  });

  it('resets the player when the track is removed', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: AudioTrack | null }) => useAudioPlayer(value),
      { initialProps: { value: track() as AudioTrack | null } },
    );
    await waitFor(() => expect(audio.src).toBe('blob:mock-1'));

    rerender({ value: null });

    await waitFor(() => expect(result.current.durationMs).toBe(0));
    expect(audio.src).toBe('');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
  });

  it('reports playback errors through the callback', async () => {
    const onError = vi.fn();
    renderHook(() => useAudioPlayer(track(), onError));
    await waitFor(() => expect(audio.src).toBe('blob:mock-1'));

    act(() => {
      audio.dispatchEvent(new Event('error'));
    });

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('音频无法播放'),
    );
  });
});
