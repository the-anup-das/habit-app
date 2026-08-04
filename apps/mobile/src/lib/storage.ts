import { StorageProvider } from "./index";
import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";

export class NativeStorageProvider implements StorageProvider {
  async saveMedia(uri: string, kind: "photo" | "audio", ext: string): Promise<string> {
    const id = Crypto.randomUUID();
    const relPath = `${kind}/${id}.${ext}`;
    
    const targetDir = `${FileSystem.documentDirectory}${kind}/`;
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }
    
    const dest = `${FileSystem.documentDirectory}${relPath}`;
    
    // Move the file (since picker usually gives a temp file)
    await FileSystem.moveAsync({
      from: uri,
      to: dest,
    });
    
    return relPath;
  }

  async getMediaUrl(relPath: string): Promise<string> {
    return `${FileSystem.documentDirectory}${relPath}`;
  }

  async deleteMedia(relPath: string): Promise<void> {
    const dest = `${FileSystem.documentDirectory}${relPath}`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      await FileSystem.deleteAsync(dest);
    }
  }
}
