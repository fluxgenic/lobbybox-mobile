declare module 'expo-camera' {
  import type React from 'react';
  import type {ViewProps} from 'react-native';

  export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

  export type PermissionResponse = {
    granted: boolean;
    canAskAgain: boolean;
    expires: PermissionStatus;
    status: PermissionStatus;
  };

  export type CameraViewHandle = {
    takePictureAsync: (options?: {
      quality?: number;
      skipProcessing?: boolean;
    }) => Promise<{
      uri: string;
      width?: number;
      height?: number;
    }>;
  };

  export type CameraViewRef = CameraViewHandle;

  export const CameraView: React.ForwardRefExoticComponent<
    ViewProps & {facing?: 'front' | 'back'} & React.RefAttributes<CameraViewHandle>
  >;
  export function useCameraPermissions(): [PermissionResponse | null, () => Promise<PermissionResponse>];
}
