import { StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  body: string;
}

export function PlaceholderCard({ title, body }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
