import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Asterisk, Mail } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { FormInput } from '@/components/form/FormInput';
import { Button, Text } from '@/components/ui';
import { useSignIn } from '@/features/auth/api';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { signInSchema, type SignInInput } from '@/features/auth/schemas';
import { spacing } from '@/theme';

/** Figma: Acesso / Login (5135:879) */
export default function SignInScreen() {
  const signIn = useSignIn();
  const { control, handleSubmit } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <AuthLayout
      title="Entre no app"
      footerText="Ainda não tem cadastro?"
      footerAction="Criar conta"
      onFooterPress={() => router.replace('/sign-up')}
    >
      <View style={{ gap: spacing.sm }}>
        <FormInput
          control={control}
          name="email"
          icon={Mail}
          placeholder="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          testID="sign-in-email"
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
          testID="sign-in-password"
        />
        {signIn.error && (
          <Text variant="textXs" tone="danger">
            {signIn.error.message}
          </Text>
        )}
      </View>
      {/* Ao logar, o Stack.Protected do root layout troca para o grupo (app) automaticamente. */}
      <Button
        label="Entrar"
        block
        loading={signIn.isPending}
        testID="sign-in-submit"
        onPress={() => handleSubmit((v) => signIn.mutate(v))()}
      />
    </AuthLayout>
  );
}
