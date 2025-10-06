declare module '@react-navigation/bottom-tabs' {
  import type React from 'react';

  export type BottomTabNavigator = {
    Navigator: React.ComponentType<any>;
    Screen: React.ComponentType<any>;
  };

  export function createBottomTabNavigator<ParamList extends Record<string, object | undefined>>(): BottomTabNavigator;
}
