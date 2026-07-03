/**
 * Audio blob storage: OPFS files referenced by the DB (TDD §5.1 — blobs in
 * the filesystem, DB stores references). In-memory fallback mirrors the
 * DB worker's fallback so dev-over-http still works end to end.
 */

const memoryStore = new Map<string, Blob>();

async function audioDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle('audio', { create: true });
  } catch {
    return null;
  }
}

export async function saveAudioBlob(ref: string, blob: Blob): Promise<void> {
  const dir = await audioDir();
  if (!dir) {
    memoryStore.set(ref, blob);
    return;
  }
  const file = await dir.getFileHandle(ref, { create: true });
  const writable = await file.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function loadAudioBlob(ref: string): Promise<Blob | null> {
  const dir = await audioDir();
  if (!dir) return memoryStore.get(ref) ?? null;
  try {
    const file = await dir.getFileHandle(ref);
    return await file.getFile();
  } catch {
    return memoryStore.get(ref) ?? null;
  }
}

export async function deleteAudioBlob(ref: string): Promise<void> {
  memoryStore.delete(ref);
  const dir = await audioDir();
  if (!dir) return;
  try {
    await dir.removeEntry(ref);
  } catch {
    // already gone — fine
  }
}
