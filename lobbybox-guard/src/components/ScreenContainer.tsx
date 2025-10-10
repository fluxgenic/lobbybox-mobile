import React from 'react';
import {StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';
import {useThemeContext} from '@/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

export const ScreenContainer: React.FC<Props> = ({children, style, edges}) => {
  const {theme} = useThemeContext();

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.roles.background.default}, style]}
      edges={edges ?? ['top', 'right', 'bottom', 'left']}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
});
