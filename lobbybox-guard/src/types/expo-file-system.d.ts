declare module 'expo-file-system/legacy' {
  export enum FileSystemUploadType {
    BINARY_CONTENT = 'binary',
  }

  export type UploadProgressData = {
    totalBytesSent: number;
    totalBytesExpectedToSend: number;
  };

  export type UploadOptions = {
    httpMethod?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    uploadType?: FileSystemUploadType;
  };

  export type UploadTask = {
    uploadAsync: () => Promise<{status: number}>;
  };

  export function createUploadTask(
    url: string,
    fileUri: string,
    options: UploadOptions,
    callback?: (data: UploadProgressData) => void,
  ): UploadTask;

  export function getInfoAsync(
    fileUri: string,
  ): Promise<{
    exists: boolean;
    size?: number;
  }>;
}
