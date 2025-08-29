import React from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {useTheme} from '@contexts/ThemeContext';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'large',
  color,
  overlay = true,
}) => {
  const {colors} = useTheme();

  const spinnerColor = color || colors.primary;

  if (!overlay) {
    return (
      <View style={styles.inline}>
        <ActivityIndicator size={size} color={spinnerColor} />
        {message && (
          <Text style={[styles.message, {color: colors.text.secondary}]}>
            {message}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.overlay, {backgroundColor: colors.background}]}>
      <View style={styles.container}>
        <ActivityIndicator size={size} color={spinnerColor} />
        {message && (
          <Text style={[styles.message, {color: colors.text.secondary}]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    alignItems: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoadingSpinner;