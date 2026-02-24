import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({ label, onPress, disabled = false, variant = 'primary' }: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
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
  altLabel: {
  },
  dangerLabel: {
    color: '#ffffff',
  },
});
