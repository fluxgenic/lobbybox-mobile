import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useThemeContext} from '@/theme';

export const SplashScreen: React.FC = () => {
  const {theme} = useThemeContext();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Animated.View style={[styles.logoContainer, {opacity, transform: [{scale}]}]}>
        <Text style={[styles.logoText, {color: theme.colors.primary}]}>LobbyBox</Text>
        <Text style={[styles.subtitle, {color: theme.colors.muted}]}>Parcel Guard</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});
