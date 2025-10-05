import {useEffect, useState} from 'react';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';

type NetworkStatus = {
  isOffline: boolean;
  netInfo: NetInfoState | null;
};

const getIsOffline = (state: NetInfoState | null) => {
  if (!state) {
    return false;
  }
  if (state.isConnected === false) {
    return true;
  }
  if (state.isInternetReachable === false) {
    return true;
  }
  return false;
};

export const useNetworkStatus = (): NetworkStatus => {
  const [netInfo, setNetInfo] = useState<NetInfoState | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(nextState => {
      setNetInfo(nextState);
    });
    return unsubscribe;
  }, []);

  return {
    isOffline: getIsOffline(netInfo),
    netInfo,
  };
};
