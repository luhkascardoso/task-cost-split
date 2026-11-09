import { X } from 'lucide-react-native';
import { createContext, use, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, sizes, spacing } from '@/theme';
import { Text } from '../atoms/Text';

/**
 * Template COMPOUND dos form sheets (docs/12-atomic-design-e-compound.md).
 * O pai guarda `onClose` num Context; `Sheet.Close` lê de lá. Assim cada sheet
 * monta só as partes que usa, na ordem que o Figma pede.
 *
 *   <Sheet onClose={() => router.back()}>
 *     <Sheet.Header>
 *       <Sheet.Title>Nova despesa</Sheet.Title>
 *       <Sheet.Close />
 *     </Sheet.Header>
 *     …campos…
 *     <Sheet.Footer>…botões…</Sheet.Footer>
 *   </Sheet>
 *
 * Lembrete: é uma rota `formSheet` com `fitToContents`. Não use `flex: 1` aqui.
 */

interface SheetState {
  onClose?: () => void;
}

const SheetContext = createContext<SheetState | null>(null);

function useSheet() {
  const ctx = use(SheetContext);
  if (!ctx) throw new Error('Partes do <Sheet> (Sheet.Header, Sheet.Close…) precisam estar dentro de <Sheet>.');
  return ctx;
}

function SheetRoot({ onClose, children }: { onClose?: () => void; children: React.ReactNode }) {
  const state = useMemo(() => ({ onClose }), [onClose]);
  return (
    <SheetContext value={state}>
      <View style={styles.sheet}>{children}</View>
    </SheetContext>
  );
}

/**
 * Linha do topo: título (ou bloco de título) à esquerda, ações à direita.
 * `align="start"` quando o título tem mais de uma linha (ex.: título + valor).
 */
function Header({ align = 'center', children }: { align?: 'center' | 'start'; children: React.ReactNode }) {
  useSheet();
  return <View style={[styles.header, align === 'start' && styles.headerStart]}>{children}</View>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <Text variant="labelMd">{children}</Text>;
}

/** Botão X. Usa o `onClose` do <Sheet>. */
function Close() {
  const { onClose } = useSheet();
  if (!onClose) throw new Error('<Sheet.Close> exige a prop onClose no <Sheet>.');
  return (
    <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
      <X size={sizes.iconSm} color={colors.textSecondary} />
    </Pressable>
  );
}

/** Linha de ações no rodapé (ex.: lixeira à esquerda, Salvar/Editar à direita). */
function Footer({ children }: { children: React.ReactNode }) {
  useSheet();
  return <View style={styles.footer}>{children}</View>;
}

export const Sheet = Object.assign(SheetRoot, { Header, Title, Close, Footer });

const styles = StyleSheet.create({
  sheet: { padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerStart: { alignItems: 'flex-start' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
