import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {subscribeToToasts, ToastMessage} from '@/utils/toast';
import {useThemeContext} from '@/theme';

const ENTER_OFFSET = -16;
const TOAST_MARGIN = 16;

const animationConfig = {
  enter: {
    opacity: {duration: 220},
  },
  exit: {
    opacity: {duration: 160},
  },
} as const;

export const ToastHost: React.FC = () => {
  const {theme} = useThemeContext();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(ENTER_OFFSET)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<ToastMessage[]>([]);
  const isShowingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isShowingRef.current = false;
      setCurrent(null);
      return;
    }

    const next = queueRef.current.shift();
    if (!next) {
      isShowingRef.current = false;
      setCurrent(null);
      return;
    }

    isShowingRef.current = true;
    setCurrent(next);
  }, []);

  const hideToast = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: animationConfig.exit.opacity.duration,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        translateY.setValue(ENTER_OFFSET);
        showNext();
      }
    });
  }, [opacity, showNext, translateY]);

  useEffect(() => {
    return subscribeToToasts(toast => {
      queueRef.current.push(toast);
      if (!isShowingRef.current) {
        showNext();
      }
    });
  }, [showNext]);

  useEffect(() => {
    if (!current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    opacity.stopAnimation();
    translateY.stopAnimation();
    opacity.setValue(0);
    translateY.setValue(ENTER_OFFSET);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: animationConfig.enter.opacity.duration,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 180,
        friction: 18,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      hideToast();
    }, current.duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [current, hideToast, opacity, translateY]);

  const accentColor = useMemo(() => {
    const {
      roles: {
        status: {info, success, error},
      },
    } = theme;

    if (!current) {
      return info;
    }

    switch (current.type) {
      case 'success':
        return success;
      case 'error':
        return error;
      default:
        return info;
    }
  }, [current, theme]);

  const cardColor = theme.roles.card.background;
  const primaryText = theme.roles.text.primary;
  const secondaryText = theme.roles.text.secondary;

  return (
    <View pointerEvents="none" style={[styles.wrapper, {top: insets.top + TOAST_MARGIN}]}> 
      {current ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              opacity,
              transform: [{translateY}],
              backgroundColor: cardColor,
              shadowColor: '#000',
            },
          ]}>
          <View style={[styles.accent, {backgroundColor: accentColor}]} />
          <View style={styles.content}>
            <Text style={[styles.message, {color: primaryText}]}>{current.message}</Text>
            {current.subtitle ? <Text style={[styles.subtitle, {color: secondaryText}]}>{current.subtitle}</Text> : null}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: TOAST_MARGIN,
    right: TOAST_MARGIN,
    zIndex: 1000,
    elevation: 0,
    alignItems: 'center',
  },
  toast: {
    alignSelf: 'stretch',
    maxWidth: 480,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
});
