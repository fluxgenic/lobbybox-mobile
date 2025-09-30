import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useThemeContext} from '@/theme';

export const LoadingView: React.FC = () => {
  const {theme} = useThemeContext();
  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}> 
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
