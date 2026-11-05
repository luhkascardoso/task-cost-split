import { StyleSheet, View } from 'react-native';

import { initials } from '@/lib/date';
import { colors, sizes, typography } from '@/theme';
import { Text } from './Text';

type Size = 'sm' | 'md' | 'lg';
const dimension: Record<Size, number> = { sm: sizes.avatarSm, md: sizes.avatarMd, lg: sizes.avatarLg };

export function Avatar({ name, size = 'md' }: { name: string; size?: Size }) {
  const d = dimension[size];
  return (
    <View style={[styles.avatar, { width: d, height: d, borderRadius: d / 2 }]}>
      <Text style={[size === 'sm' ? typography.textXs : typography.labelSm, { fontSize: d * 0.36 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

/** Avatares sobrepostos (cabeçalho da atividade, card da despesa). */
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
  avatar: {
    backgroundColor: colors.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  group: { flexDirection: 'row' },
});
