declare module 'expo-image-manipulator' {
  export enum SaveFormat {
    JPEG = 'jpeg',
    PNG = 'png',
  }

  export type ResizeAction = {
    resize: {
      width: number;
      height: number;
    };
  };

  export type ManipulationActions = ResizeAction[];

  export type ManipulateOptions = {
    compress?: number;
    format?: SaveFormat;
  };

  export function manipulateAsync(
    uri: string,
    actions: ManipulationActions,
    options?: ManipulateOptions,
  ): Promise<{
    uri: string;
    width?: number;
    height?: number;
  }>;
}
