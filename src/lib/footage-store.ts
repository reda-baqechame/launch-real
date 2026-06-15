/** IndexedDB storage for video blobs and renders — bytes never touch localStorage. */

import { formatStorageError } from "./storage-errors";

const DB_NAME = "launchreel-footage";
const DB_VERSION = 1;
const BLOBS = "blobs";
const RENDERS = "renders";

interface BlobRecord {
  key: string;
  projectId: string;
  kind: "footage" | "render" | "screenshot" | "narration";
  blob: Blob;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOBS)) {
        const store = db.createObjectStore(BLOBS, { keyPath: "key" });
        store.createIndex("projectId", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains(RENDERS)) {
        const store = db.createObjectStore(RENDERS, { keyPath: "key" });
        store.createIndex("projectId", "projectId", { unique: false });
      }
    };
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error);
      }),
  );
}

export function footageKey(projectId: string): string {
  return `footage:${projectId}`;
}

export function socialClipKey(projectId: string, clipId: string): string {
  return `social:${projectId}:${clipId}`;
}

export function variantRenderKey(projectId: string, variant: "a" | "b"): string {
  return `render:${projectId}:variant-${variant}`;
}

export function renderKey(projectId: string, aspect: string): string {
  return `render:${projectId}:${aspect}`;
}

export function narrationKey(projectId: string): string {
  return `narration:${projectId}`;
}

export async function saveBlob(
  key: string,
  projectId: string,
  blob: Blob,
  kind: BlobRecord["kind"] = "footage",
): Promise<void> {
  const store = kind === "render" ? RENDERS : BLOBS;
  try {
    await tx(store, "readwrite", (s) =>
      s.put({ key, projectId, kind, blob, createdAt: new Date().toISOString() }),
    );
  } catch (err) {
    throw formatStorageError(err);
  }
}

export async function getBlob(key: string, kind: BlobRecord["kind"] = "footage"): Promise<Blob | null> {
  const store = kind === "render" ? RENDERS : BLOBS;
  const rec = await tx<BlobRecord | undefined>(store, "readonly", (s) => s.get(key));
  return rec?.blob ?? null;
}

export async function getBlobUrl(key: string, kind: BlobRecord["kind"] = "footage"): Promise<string | null> {
  const blob = await getBlob(key, kind);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteProjectFootage(projectId: string): Promise<void> {
  const db = await openDb();
  await Promise.all(
    [BLOBS, RENDERS].map(
      (storeName) =>
        new Promise<void>((resolve, reject) => {
          const t = db.transaction(storeName, "readwrite");
          const idx = t.objectStore(storeName).index("projectId");
          const req = idx.openCursor(IDBKeyRange.only(projectId));
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        }),
    ),
  );
  db.close();
}

export async function saveRender(projectId: string, aspect: string, blob: Blob): Promise<string> {
  const key = renderKey(projectId, aspect);
  await saveBlob(key, projectId, blob, "render");
  return key;
}

export async function listProjectBlobs(
  projectId: string,
): Promise<{ key: string; kind: BlobRecord["kind"]; blob: Blob }[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const results: { key: string; kind: BlobRecord["kind"]; blob: Blob }[] = [];

    const collect = (storeName: string) =>
      new Promise<void>((res, rej) => {
        const t = db.transaction(storeName, "readonly");
        const idx = t.objectStore(storeName).index("projectId");
        const req = idx.openCursor(IDBKeyRange.only(projectId));
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const rec = cursor.value as BlobRecord;
            results.push({ key: rec.key, kind: rec.kind, blob: rec.blob });
            cursor.continue();
          }
        };
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error);
      });

    void Promise.all([collect(BLOBS), collect(RENDERS)])
      .then(() => {
        db.close();
        resolve(results);
      })
      .catch(reject);
  });
}

export async function getRenders(projectId: string): Promise<{ aspect: string; blobKey: string; blob: Blob }[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const results: { aspect: string; blobKey: string; blob: Blob }[] = [];
    const t = db.transaction(RENDERS, "readonly");
    const idx = t.objectStore(RENDERS).index("projectId");
    const req = idx.openCursor(IDBKeyRange.only(projectId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const rec = cursor.value as BlobRecord;
        const aspect = rec.key.split(":").pop() ?? "16:9";
        results.push({ aspect, blobKey: rec.key, blob: rec.blob });
        cursor.continue();
      }
    };
    t.oncomplete = () => {
      db.close();
      resolve(results);
    };
    t.onerror = () => reject(t.error);
  });
}
