import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({ label, onPress, disabled = false, variant = 'primary' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'secondary' ? styles.altLabel : null,
          variant === 'danger' ? styles.dangerLabel : null,
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
    backgroundColor: '#0f766e',
    borderWidth: 1,
    borderColor: '#0f766e',
  },
  secondary: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  danger: {
    backgroundColor: '#b91c1c',
    borderColor: '#b91c1c',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  altLabel: {
    color: '#111827',
  },
  dangerLabel: {
    color: '#ffffff',
  },
});
