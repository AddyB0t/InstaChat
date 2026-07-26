import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FEEDBACK_EVENT,
  FeedbackPayload,
} from '../services/feedback';

const SHORT_DURATION_MS = 2200;
const LONG_DURATION_MS = 3600;

export default function FeedbackToast() {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [payload, setPayload] = useState<FeedbackPayload | null>(null);

  useEffect(() => {
    const hide = () => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => setPayload(null));
    };

    const subscription = DeviceEventEmitter.addListener(
      FEEDBACK_EVENT,
      (nextPayload: FeedbackPayload) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        setPayload(nextPayload);
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            damping: 18,
            stiffness: 180,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
        ]).start();

        timerRef.current = setTimeout(
          hide,
          nextPayload.duration === 'long' ? LONG_DURATION_MS : SHORT_DURATION_MS
        );
      }
    );

    return () => {
      subscription.remove();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [opacity, translateY]);

  if (!payload) {
    return null;
  }

  const isError = payload.tone === 'error';

  return (
    <View pointerEvents="none" style={[styles.wrapper, { paddingTop: insets.top + 10 }]}>
      <Animated.View
        style={[
          styles.toast,
          isError && styles.errorToast,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.message} numberOfLines={2}>
          {payload.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    maxWidth: '88%',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#171717',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  errorToast: {
    backgroundColor: '#7F1D1D',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
