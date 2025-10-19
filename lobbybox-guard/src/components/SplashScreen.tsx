import React, {useEffect, useRef} from 'react';
import {Animated, Image, StyleSheet, Text, View} from 'react-native';

export const SplashScreen: React.FC = () => {
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
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, {opacity, transform: [{scale}]}]}>
        <Image
          source={require('../../assets/app-icon.png')}
          accessibilityLabel="LobbyBox app icon"
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>LobbyBox</Text>
        <Text style={styles.subtitle}>Parcel Guard</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFD522',
  },
  logoContainer: {
    alignItems: 'center',
  },
   logoImage: {
    width: 160,
    height: 160,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 24,
    color: '#000000',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    opacity: 0.8,
  },
});
