import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
  rightSlot?: ReactNode;
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  rightSlot,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'auto'}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.text,
            },
            multiline && styles.multiline,
            rightSlot ? styles.inputWithSlot : null,
          ]}
        />
        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputWithSlot: {
    flex: 0,
    width: '55%',
  },
  multiline: {
    minHeight: 96,
    paddingVertical: 10,
  },
});
