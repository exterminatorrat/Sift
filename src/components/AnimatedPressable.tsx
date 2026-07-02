import React, { useRef } from "react";
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle
} from "react-native";

type AnimatedPressableProps = Omit<PressableProps, "style"> & {
  children: React.ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  scaleTo = 0.96,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.timing(scale, {
      duration: toValue < 1 ? 85 : 145,
      easing: Easing.out(Easing.cubic),
      toValue,
      useNativeDriver: true
    }).start();
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      animate(scaleTo);
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animate(1);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
