import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'compact' | 'default' | 'large';
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'default',
}: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        size === 'compact' ? styles.compactButton : null,
        size === 'large' ? styles.largeButton : null,
        { backgroundColor: colors.accent, borderColor: colors.accent },
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        variant === 'secondary'
          ? { backgroundColor: colors.surfaceAlt, borderColor: colors.border }
          : null,
        variant === 'danger' ? { backgroundColor: colors.danger, borderColor: colors.danger } : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'compact' ? styles.compactLabel : null,
          size === 'large' ? styles.largeLabel : null,
          { color: colors.accentText },
          variant === 'secondary' ? styles.altLabel : null,
          variant === 'danger' ? styles.dangerLabel : null,
          variant === 'secondary' ? { color: colors.text } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  compactButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  largeButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  secondary: {
  },
  danger: {
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: '700',
    fontSize: 14,
  },
  compactLabel: {
    fontSize: 12,
  },
  largeLabel: {
    fontSize: 16,
  },
  altLabel: {
  },
  dangerLabel: {
    color: '#ffffff',
  },
});
