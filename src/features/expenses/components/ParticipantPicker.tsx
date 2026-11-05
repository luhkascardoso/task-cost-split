import { Trash2, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Input, Text } from '@/components/ui';
import { useCreateParticipant, useParticipants } from '@/features/participants/api';
import { useParticipantNames } from '@/features/participants/hooks';
import { colors, radii, sizes, spacing } from '@/theme';

const MAX_SUGGESTIONS = 4;

/**
 * Seletor de participantes da despesa (controlado).
 * Digite para filtrar os existentes; Enter escolhe a 1ª sugestão ou cria um novo.
 */
export function ParticipantPicker({
  value,
  onChange,
  error,
  testID,
}: {
  value: readonly string[];
  onChange: (ids: string[]) => void;
  error?: string;
  testID?: string;
}) {
  const { query, setQuery, suggestions, names, select, submitQuery } = useParticipantSearch(value, (id) =>
    onChange([...value, id]),
  );
  const remove = (id: string) => onChange(value.filter((p) => p !== id));

  return (
    <>
      <Input
        icon={Users}
        placeholder="Participantes"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={submitQuery}
        returnKeyType="done"
        submitBehavior="submit"
        error={error}
        testID={testID}
      />
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((p) => (
            <Pressable key={p.id} onPress={() => select(p.id)} style={styles.suggestion}>
              <Text variant="textSm">{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {value.map((id) => {
        const name = names.get(id) ?? '…';
        return (
          <View key={id} style={styles.person}>
            <Avatar name={name} />
            <Text variant="labelMd" style={{ flex: 1 }}>{name}</Text>
            <Pressable onPress={() => remove(id)} hitSlop={8} accessibilityLabel={`Remover ${name}`}>
              <Trash2 size={sizes.iconSm} color={colors.danger} />
            </Pressable>
          </View>
        );
      })}
    </>
  );
}

/** Busca, sugestões e criação de participante a partir do texto digitado. */
function useParticipantSearch(selectedIds: readonly string[], add: (id: string) => void) {
  const participants = useParticipants();
  const names = useParticipantNames();
  const createParticipant = useCreateParticipant();
  const [query, setQuery] = useState('');

  const select = (id: string) => {
    add(id);
    setQuery('');
  };

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (participants.data ?? [])
      .filter((p) => !selectedIds.includes(p.id))
      .map((p) => ({ id: p.id, name: names.get(p.id) ?? p.name }))
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, participants.data, selectedIds, names]);

  const submitQuery = async () => {
    const name = query.trim();
    if (!name) return;
    const existing = suggestions[0];
    if (existing) return select(existing.id);
    const created = await createParticipant.mutateAsync(name);
    select(created.id);
  };

  return { query, setQuery, suggestions, names, select, submitQuery };
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxs },
  suggestions: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md },
  suggestion: { padding: spacing.sm },
});
