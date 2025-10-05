declare module '@react-native-community/netinfo' {
  export type NetInfoState = {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    [key: string]: unknown;
  };

  export type NetInfoSubscription = () => void;
  export type NetInfoChangeHandler = (state: NetInfoState) => void;

  export function addEventListener(handler: NetInfoChangeHandler): NetInfoSubscription;

  const NetInfo: {
    addEventListener: typeof addEventListener;
  };

  export default NetInfo;
}
