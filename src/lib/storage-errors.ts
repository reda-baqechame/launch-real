/** User-facing message for IndexedDB / quota failures. */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export function formatStorageError(err: unknown): StorageError {
  if (err instanceof StorageError) return err;

  const name =
    err instanceof DOMException ? err.name
    : err instanceof Error ? err.name
    : "";

  const message = err instanceof Error ? err.message : String(err);

  if (
    name === "QuotaExceededError" ||
    /quota|storage full|disk full/i.test(message)
  ) {
    return new StorageError(
      "Browser storage is full. Try a smaller recording or clear old LaunchReel projects.",
      err,
    );
  }

  if (name === "InvalidStateError" || /indexeddb|idb/i.test(message)) {
    return new StorageError(
      "Could not save media locally. Check browser storage permissions and try again.",
      err,
    );
  }

  return new StorageError("Could not save media locally.", err);
}

export function storageErrorMessage(err: unknown): string {
  return formatStorageError(err).message;
}
