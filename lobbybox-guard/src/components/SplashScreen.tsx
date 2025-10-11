import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

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
        <View style={styles.logoBadge}>
          <View style={styles.logoBadgeInner}>
            <View style={styles.logoFlap} />
            <View style={styles.logoFlapReverse} />
          </View>
          <View style={styles.logoWheels}>
            <View style={styles.wheel} />
            <View style={styles.wheel} />
          </View>
        </View>
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
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  logoBadgeInner: {
    width: 76,
    height: 64,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#FFD522',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoFlap: {
    position: 'absolute',
    width: '110%',
    height: 4,
    backgroundColor: '#FFD522',
    transform: [{rotate: '35deg'}],
  },
  logoFlapReverse: {
    position: 'absolute',
    width: '110%',
    height: 4,
    backgroundColor: '#FFD522',
    transform: [{rotate: '-35deg'}],
  },
  logoWheels: {
    position: 'absolute',
    bottom: 20,
    width: '52%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wheel: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD522',
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
