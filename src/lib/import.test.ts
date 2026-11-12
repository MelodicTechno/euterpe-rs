import { describe, expect, it } from 'vitest';
import {
  classifyFile,
  deriveSrtName,
  getFileExtension,
  getFileName,
} from './import';

describe('file helpers', () => {
  it('reads Windows and POSIX file names', () => {
    expect(getFileName('C:\\music\\歌曲.mp3')).toBe('歌曲.mp3');
    expect(getFileName('/home/user/song.wav')).toBe('song.wav');
    expect(getFileExtension('C:\\music\\SONG.WAV')).toBe('wav');
  });

  it('classifies supported files', () => {
    expect(classifyFile('C:\\a\\song.mp3')).toBe('audio');
    expect(classifyFile('C:\\a\\song.WAV')).toBe('audio');
    expect(classifyFile('C:\\a\\lyrics.txt')).toBe('lyrics');
    expect(classifyFile('C:\\a\\project.eusrt')).toBe('project');
    expect(classifyFile('C:\\a\\PROJECT.EUSRT')).toBe('project');
    expect(classifyFile('C:\\a\\cover.png')).toBe('unsupported');
    expect(classifyFile('C:\\a\\README')).toBe('unsupported');
  });

  it('derives the default SRT file name', () => {
    expect(deriveSrtName('song.mp3')).toBe('song.srt');
    expect(deriveSrtName('C:\\music\\我的 歌.wav')).toBe('我的 歌.srt');
    expect(deriveSrtName('no-extension')).toBe('no-extension.srt');
    expect(deriveSrtName('.mp3')).toBe('.mp3.srt');
  });
});
