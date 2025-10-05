import React from 'react';
import {StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useThemeContext} from '@/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const ScreenContainer: React.FC<Props> = ({children, style}) => {
  const {theme} = useThemeContext();

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.roles.background.default}, style]}
      edges={['top', 'right', 'bottom', 'left']}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
