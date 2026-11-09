import { StyleSheet, View } from 'react-native';

import { Avatar } from '../atoms/Avatar';

/** Molécula: avatares sobrepostos (cabeçalho da atividade, card da despesa). */
export function AvatarGroup({ names, max = 6 }: { names: string[]; max?: number }) {
  return (
    <View style={styles.group}>
      {names.slice(0, max).map((name, i) => (
        <View key={`${name}-${i}`} style={{ marginLeft: i === 0 ? 0 : -6 }}>
          <Avatar name={name} size="sm" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row' },
});
