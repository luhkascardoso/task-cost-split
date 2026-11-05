import { Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { Button } from './Button';

/** Botão flutuante "+ Criar" / "+ Nova" no canto inferior direito das listas. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <Button label={label} icon={Plus} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', right: 0, bottom: spacing.lg },
});
