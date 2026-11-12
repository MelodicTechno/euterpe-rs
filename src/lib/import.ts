export type FileKind = 'audio' | 'lyrics' | 'project' | 'unsupported';

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav']);

export function getFileName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function classifyFile(path: string): FileKind {
  const extension = getFileExtension(path);
  if (AUDIO_EXTENSIONS.has(extension)) {
    return 'audio';
  }
  if (extension === 'txt') {
    return 'lyrics';
  }
  if (extension === 'eusrt') {
    return 'project';
  }
  return 'unsupported';
}

export function deriveSrtName(audioName: string): string {
  const name = getFileName(audioName);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base || 'lyrics'}.srt`;
}
