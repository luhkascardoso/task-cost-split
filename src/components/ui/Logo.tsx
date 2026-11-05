import { Zap } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme';
import { Text } from './Text';

/**
 * Logo "TaskCost Split".
 * TODO: substituir o ícone placeholder pelo SVG do logo exportado do Figma (node 5108:760)
 * em src/components/ui/LogoMark.tsx (react-native-svg).
 */
export function Logo({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <View style={[styles.row, lg && styles.column]}>
      <Zap size={lg ? 64 : 17} color={colors.brandLight} fill={colors.brand} />
      <Text style={{ fontSize: 18, lineHeight: 23, color: colors.brandLight }}>
        <Text style={{ fontFamily: fonts.heading, color: colors.brandLight }}>TaskCost</Text>{' '}
        <Text style={{ fontFamily: fonts.headingRegular, color: colors.brandLight }}>Split</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  column: { flexDirection: 'column' },
});
