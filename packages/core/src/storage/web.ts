import { StorageProvider } from "./index";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("habit-media", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("media")) {
        request.result.createObjectStore("media");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class WebStorageProvider implements StorageProvider {
  async saveMedia(dataUrl: string, kind: "photo" | "audio", ext: string): Promise<string> {
    const id = crypto.randomUUID();
    const relPath = `${kind}/${id}.${ext}`;
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media", "readwrite");
      const store = tx.objectStore("media");
      const request = store.put(dataUrl, relPath);
      
      request.onsuccess = () => resolve(relPath);
      request.onerror = () => reject(request.error);
    });
  }

  async getMediaUrl(relPath: string): Promise<string> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media", "readonly");
      const store = tx.objectStore("media");
      const request = store.get(relPath);
      
      request.onsuccess = () => {
        if (request.result) resolve(request.result);
        else resolve("");
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMedia(relPath: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media", "readwrite");
      const store = tx.objectStore("media");
      const request = store.delete(relPath);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
