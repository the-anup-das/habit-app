export interface StorageProvider {
  /**
   * Saves media to storage.
   * @param uri Local file URI or base64 string
   * @param kind "photo" or "audio"
   * @param ext File extension
   * @returns A relative path that can be stored in the DB (e.g., `photos/uuid.jpg`)
   */
  saveMedia(uri: string, kind: "photo" | "audio", ext: string): Promise<string>;

  /**
   * Gets a loadable URI for the given relative path.
   * For web base64, this might just return the base64 string or a blob URL.
   * For native, this returns a `file://` URI.
   */
  getMediaUrl(relPath: string): Promise<string>;

  /**
   * Deletes the media file.
   */
  deleteMedia(relPath: string): Promise<void>;
}
