import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Surface, Avatar } from 'react-native-paper';

const TypingIndicator = ({ user, theme }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = animateDot(dot1, 0);
    const animation2 = animateDot(dot2, 200);
    const animation3 = animateDot(dot3, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Avatar.Text
        size={32}
        label={user.username.charAt(0).toUpperCase()}
        style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
      />
      
      <Surface style={[
        styles.bubble,
        { backgroundColor: theme.colors.surface, elevation: 2 }
      ]}>
        <View style={styles.dotsContainer}>
          <Animated.View style={[
            styles.dot,
            { 
              backgroundColor: theme.colors.onSurfaceVariant,
              opacity: dot1,
              transform: [{ scale: dot1 }]
            }
          ]} />
          <Animated.View style={[
            styles.dot,
            { 
              backgroundColor: theme.colors.onSurfaceVariant,
              opacity: dot2,
              transform: [{ scale: dot2 }]
            }
          ]} />
          <Animated.View style={[
            styles.dot,
            { 
              backgroundColor: theme.colors.onSurfaceVariant,
              opacity: dot3,
              transform: [{ scale: dot3 }]
            }
          ]} />
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  avatar: {
    marginRight: 8,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    minHeight: 40,
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});

export default TypingIndicator;
