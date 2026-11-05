import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Calendar, Trash2, X } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { FormInput } from '@/components/form/FormInput';
import { Button, Sheet, Text } from '@/components/ui';
import type { Activity } from '@/domain';
import { formatShortDate } from '@/lib/date';
import { colors, sizes, spacing } from '@/theme';
import { useDeleteActivity, useSaveActivity } from '../api';
import { activityFormSchema, type ActivityFormInput } from '../schemas';

/** Figma: "Nova atividade" (5108:2419) e "Editar atividade" (5109:1035). */
export function ActivityFormSheet({ activity }: { activity?: Activity }) {
  const isEdit = !!activity;
  const save = useSaveActivity(activity?.id);
  const remove = useDeleteActivity();

  const { control, handleSubmit } = useForm<ActivityFormInput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: activity?.title ?? '',
      date: activity ? formatShortDate(activity.date) : formatShortDate(new Date().toISOString()),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const id = await save.mutateAsync(values);
    if (isEdit) router.back();
    else router.replace({ pathname: '/activity/[activityId]', params: { activityId: id } });
  });

  const onDelete = () =>
    Alert.alert('Excluir atividade', 'Todas as despesas desta atividade serão excluídas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync(activity!.id);
          router.dismissTo('/activities');
        },
      },
    ]);

  return (
    <Sheet>
      <View style={styles.header}>
        <Text variant="labelMd">{isEdit ? 'Editar atividade' : 'Nova atividade'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Fechar">
          <X size={sizes.iconSm} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ gap: spacing.xs }}>
        <FormInput
          control={control}
          name="title"
          placeholder="Título"
          autoFocus={!isEdit}
          testID="activity-form-title"
        />
        {/* TODO(roadmap): trocar por date picker nativo (@react-native-community/datetimepicker) */}
        <FormInput
          control={control}
          name="date"
          icon={Calendar}
          placeholder="Data (dd/mm/aa)"
          keyboardType="numbers-and-punctuation"
          testID="activity-form-date"
        />
      </View>

      {save.error && <Text variant="textXs" tone="danger">{save.error.message}</Text>}

      {isEdit ? (
        <View style={styles.actions}>
          <Button
            icon={Trash2}
            variant="danger"
            accessibilityLabel="Excluir atividade"
            testID="activity-form-delete"
            onPress={onDelete}
            loading={remove.isPending}
          />
          <Button label="Salvar" onPress={() => onSubmit()} loading={save.isPending} />
        </View>
      ) : (
        <Button label="Salvar" block onPress={() => onSubmit()} loading={save.isPending} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
});
