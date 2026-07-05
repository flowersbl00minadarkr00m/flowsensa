import type { FlowExport, PrimitiveRegistry, WorkEventCollection } from "./types";

const DATABASE_NAME = "flowsensa-local-v1";
const STORE_NAME = "workspace";
const WORKSPACE_KEY = "active";

export interface StoredWorkspace {
  events: WorkEventCollection;
  primitives: PrimitiveRegistry;
  exportState: FlowExport;
  updatedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkspace(workspace: StoredWorkspace): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(workspace, WORKSPACE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function loadWorkspace(): Promise<StoredWorkspace | undefined> {
  const database = await openDatabase();
  const result = await new Promise<StoredWorkspace | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY);
    request.onsuccess = () => resolve(request.result as StoredWorkspace | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

export async function clearWorkspace(): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(WORKSPACE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
