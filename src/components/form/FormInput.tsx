import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { Input, type InputProps } from '@/components/ui';

/** Liga um <Input> ao react-hook-form, exibindo o erro de validação do zod. */
export function FormInput<T extends FieldValues>({
  control,
  name,
  ...inputProps
}: { control: Control<T>; name: Path<T> } & Omit<InputProps, 'value' | 'onChangeText'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          {...inputProps}
        />
      )}
    />
  );
}
