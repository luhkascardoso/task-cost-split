import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Calendar, Trash2 } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { Alert, View } from 'react-native';

import { FormInput } from '@/components/form/FormInput';
import { Button, Sheet, Text } from '@/components/ui';
import type { Activity } from '@/domain';
import { formatShortDate } from '@/lib/date';
import { errorMessage } from '@/lib/error-message';
import { spacing } from '@/theme';
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
    let id: string;
    try {
      id = await save.mutateAsync(values);
    } catch {
      return; // fica no sheet; a mensagem aparece via save.error
    }
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
          try {
            await remove.mutateAsync(activity!.id);
          } catch (error) {
            Alert.alert('Não foi possível excluir', errorMessage(error));
            return;
          }
          router.dismissTo('/activities');
        },
      },
    ]);

  return (
    <Sheet onClose={() => router.back()}>
      <Sheet.Header>
        <Sheet.Title>{isEdit ? 'Editar atividade' : 'Nova atividade'}</Sheet.Title>
        <Sheet.Close />
      </Sheet.Header>

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

      {save.error && <Text variant="textXs" tone="danger">{errorMessage(save.error)}</Text>}

      {isEdit ? (
        <Sheet.Footer>
          <Button
            icon={Trash2}
            variant="danger"
            accessibilityLabel="Excluir atividade"
            testID="activity-form-delete"
            onPress={onDelete}
            loading={remove.isPending}
          />
          <Button label="Salvar" onPress={() => onSubmit()} loading={save.isPending} />
        </Sheet.Footer>
      ) : (
        <Button label="Salvar" block onPress={() => onSubmit()} loading={save.isPending} />
      )}
    </Sheet>
  );
}
