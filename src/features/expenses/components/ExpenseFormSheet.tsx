import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, View } from 'react-native';

import { FormInput } from '@/components/form/FormInput';
import { Button, Input, Sheet, Text } from '@/components/ui';
import { maskBRLInput, type Expense } from '@/domain';
import { spacing } from '@/theme';
import { useSaveExpense } from '../api';
import { expenseFormSchema, type ExpenseFormInput } from '../schemas';
import { ParticipantPicker } from './ParticipantPicker';

/**
 * Figma: "Nova despesa" (5136:1026). Também usado para editar.
 * A seleção de participantes fica em `ParticipantPicker`.
 */
export function ExpenseFormSheet({ activityId, expense }: { activityId: string; expense?: Expense }) {
  const save = useSaveExpense(activityId, expense);
  const { control, handleSubmit, setValue, formState } = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: expense?.title ?? '',
      amount: expense?.amount ?? 0,
      participantIds: expense?.shares.map((s) => s.participantId) ?? [],
    },
  });
  const selectedIds = useWatch({ control, name: 'participantIds' });

  const setParticipantIds = (ids: string[]) =>
    setValue('participantIds', ids, { shouldValidate: true });

  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync(values);
    router.back();
  });

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Sheet onClose={() => router.back()}>
        <Sheet.Header>
          <Sheet.Title>{expense ? 'Editar despesa' : 'Nova despesa'}</Sheet.Title>
          <Sheet.Close />
        </Sheet.Header>

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
          <ParticipantPicker
            value={selectedIds}
            onChange={setParticipantIds}
            error={formState.errors.participantIds?.message}
            testID="expense-form-participants"
          />
        </View>

        {save.error && <Text variant="textXs" tone="danger">{save.error.message}</Text>}
        <Button label="Salvar" block onPress={() => onSubmit()} loading={save.isPending} />
      </Sheet>
    </ScrollView>
  );
}
