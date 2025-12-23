import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Skeleton = ({ rows = 3, avatar = false, style }) => {
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const items = Array.from({ length: rows });

  return (
    <View style={[styles.container, style]}>
      {items.map((_, i) => (
        <View key={i} style={styles.row}>
          {avatar && <View style={styles.avatar} />}
          <View style={styles.content}>
            <View style={styles.lineShort} />
            <View style={styles.lineLong} />
            <Animated.View
              style={[
                styles.shimmer,
                { transform: [{ translateX }] },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  row: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  lineShort: {
    height: 14,
    width: '50%',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  lineLong: {
    height: 12,
    width: '85%',
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
  },
  shimmer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    opacity: 0.6,
  },
});

export default Skeleton;
