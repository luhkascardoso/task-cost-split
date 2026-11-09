import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Asterisk, CircleUser, Mail } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { FormInput } from '@/components/form/FormInput';
import { Button, Text } from '@/components/ui';
import { useSignUp } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { signUpSchema, type SignUpInput } from '@/features/auth/schemas';
import { errorMessage } from '@/lib/error-message';
import { spacing } from '@/theme';

/** Figma: Acesso / Cadastro (5137:1254) */
export default function SignUpScreen() {
  const signUp = useSignUp();
  const { control, handleSubmit } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  return (
    <AuthLayout
      title="Crie sua conta"
      footerText="Já tem cadastro?"
      footerAction="Entrar na conta"
      onFooterPress={() => router.replace('/sign-in')}
    >
      <View style={{ gap: spacing.sm }}>
        <FormInput
          control={control}
          name="name"
          icon={CircleUser}
          placeholder="Nome"
          autoComplete="name"
          testID="sign-up-name"
        />
        <FormInput
          control={control}
          name="email"
          icon={Mail}
          placeholder="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          testID="sign-up-email"
        />
        <FormInput
          control={control}
          name="password"
          icon={Asterisk}
          placeholder="Senha"
          secureTextEntry
          // Evita overlay "Senha Forte" no simulador (quebra Maestro inputText).
          textContentType="none"
          autoComplete="off"
          testID="sign-up-password"
        />
        {signUp.error && (
          <Text variant="textXs" tone="danger">
            {errorMessage(signUp.error)}
          </Text>
        )}
      </View>
      <Button
        label="Cadastrar"
        block
        loading={signUp.isPending}
        testID="sign-up-submit"
        onPress={() => handleSubmit((v) => signUp.mutate(v))()}
      />
    </AuthLayout>
  );
}
