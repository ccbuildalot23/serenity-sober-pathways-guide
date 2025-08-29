import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'react-native-paper';
import {useTheme} from '@contexts/ThemeContext';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, {backgroundColor: colors.surface}]}>
        <Icon name={icon} size={64} color={colors.outline} />
      </View>
      
      <Text style={[styles.title, {color: colors.text.primary}]}>
        {title}
      </Text>
      
      <Text style={[styles.message, {color: colors.text.secondary}]}>
        {message}
      </Text>
      
      {actionText && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={[styles.actionButton, {backgroundColor: colors.primary}]}
          labelStyle={{color: colors.onPrimary}}
        >
          {actionText}
        </Button>
      )}
      
      {secondaryActionText && onSecondaryAction && (
        <Button
          mode="text"
          onPress={onSecondaryAction}
          style={styles.secondaryButton}
        >
          {secondaryActionText}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  secondaryButton: {
    paddingHorizontal: 16,
  },
});

export default EmptyState;