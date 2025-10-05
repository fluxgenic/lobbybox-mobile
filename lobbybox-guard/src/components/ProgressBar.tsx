import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useThemeContext} from '@/theme';

type Props = {
  progress: number;
};

export const ProgressBar: React.FC<Props> = ({progress}) => {
  const {theme} = useThemeContext();
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.track, {backgroundColor: theme.roles.divider.color}]}>
      <View
        style={[styles.fill, {width: `${clamped * 100}%`, backgroundColor: theme.roles.button.primary.background}]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
