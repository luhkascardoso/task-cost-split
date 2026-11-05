import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Trash2, Users, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormInput } from '@/components/form/FormInput';
import { Avatar, Button, Input, Sheet, Text } from '@/components/ui';
import { maskBRLInput, type Expense } from '@/domain';
import { useCreateParticipant, useParticipants } from '@/features/participants/api';
import { colors, radii, sizes, spacing } from '@/theme';
import { useSaveExpense } from '../api';
import { expenseFormSchema, type ExpenseFormInput } from '../schemas';

/**
 * Figma: "Nova despesa" (5136:1026). Também usado para editar.
 * Participantes: digite para filtrar os existentes; Enter cria um novo.
 */
export function ExpenseFormSheet({ activityId, expense }: { activityId: string; expense?: Expense }) {
  const save = useSaveExpense(activityId, expense);
  const participants = useParticipants();
  const createParticipant = useCreateParticipant();
  const [query, setQuery] = useState('');

  const { control, handleSubmit, setValue, formState } = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: expense?.title ?? '',
      amount: expense?.amount ?? 0,
      participantIds: expense?.shares.map((s) => s.participantId) ?? [],
    },
  });
  const selectedIds = useWatch({ control, name: 'participantIds' });

  const byId = useMemo(
    () => new Map((participants.data ?? []).map((p) => [p.id, p.isSelf ? 'Você' : p.name])),
    [participants.data],
  );
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (participants.data ?? [])
      .filter((p) => !selectedIds.includes(p.id) && (p.isSelf ? 'você' : p.name.toLowerCase()).includes(q))
      .slice(0, 4);
  }, [query, participants.data, selectedIds]);

  const add = (id: string) => {
    setValue('participantIds', [...selectedIds, id], { shouldValidate: true });
    setQuery('');
  };
  const removeId = (id: string) =>
    setValue('participantIds', selectedIds.filter((p) => p !== id), { shouldValidate: true });

  const onSubmitQuery = async () => {
    const name = query.trim();
    if (!name) return;
    const existing = suggestions[0];
    if (existing) return add(existing.id);
    const created = await createParticipant.mutateAsync(name);
    add(created.id);
  };

  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync(values);
    router.back();
  });

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Sheet>
        <View style={styles.header}>
          <Text variant="labelMd">{expense ? 'Editar despesa' : 'Nova despesa'}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Fechar">
            <X size={sizes.iconSm} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ gap: spacing.xs }}>
          <FormInput
            control={control}
            name="title"
            placeholder="Título"
            autoFocus={!expense}
            testID="expense-form-title"
          />
          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <Input
                prefix="R$"
                placeholder="0,00"
                keyboardType="number-pad"
                value={field.value ? maskBRLInput(String(field.value)).text : ''}
                onChangeText={(t) => field.onChange(maskBRLInput(t).cents)}
                error={fieldState.error?.message}
                testID="expense-form-amount"
              />
            )}
          />
          <Input
            icon={Users}
            placeholder="Participantes"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSubmitQuery}
            returnKeyType="done"
            submitBehavior="submit"
            error={formState.errors.participantIds?.message}
            testID="expense-form-participants"
          />
          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((p) => (
                <Pressable key={p.id} onPress={() => add(p.id)} style={styles.suggestion}>
                  <Text variant="textSm">{p.isSelf ? 'Você' : p.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {selectedIds.map((id) => {
            const name = byId.get(id) ?? '…';
            return (
              <View key={id} style={styles.person}>
                <Avatar name={name} />
                <Text variant="labelMd" style={{ flex: 1 }}>{name}</Text>
                <Pressable onPress={() => removeId(id)} hitSlop={8} accessibilityLabel={`Remover ${name}`}>
                  <Trash2 size={sizes.iconSm} color={colors.danger} />
                </Pressable>
              </View>
            );
          })}
        </View>

        {save.error && <Text variant="textXs" tone="danger">{save.error.message}</Text>}
        <Button label="Salvar" block onPress={() => onSubmit()} loading={save.isPending} />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxs },
  suggestions: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md },
  suggestion: { padding: spacing.sm },
});
