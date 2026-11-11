# ADR 0005 · Autenticação própria com JWT curto e refresh rotativo

- **Status:** aceito
- **Data:** 2026-11-10
- **Card:** LUH-17

## Contexto

O contrato do app já tem `signUp`, `signIn`, `signOut` e `getSession`, e o cadastro precisa criar o participante "eu" na mesma operação. O app guarda tokens no `expo-secure-store`.

## Decisão

Auth no próprio backend: token de acesso JWT HS256 de 15 min, refresh token aleatório de 30 dias guardado só como hash, rotação a cada uso com detecção de reuso por família, senhas com argon2id. Detalhes em [04 · Sessão](../04-autenticacao-e-seguranca.md#sessão).

## Consequências

- Cadastro e criação do "eu" na mesma transação, sem webhook nem sincronização entre sistemas.
- Sem dependência de provedor de identidade: o banco pode mudar sem migrar contas.
- Somos responsáveis por fazer certo: rate limit, mensagens únicas, rotação e reuso precisam de teste. Recuperação de senha e confirmação de e-mail ficam para depois (exigem envio de e-mail).

## Alternativas

- **Supabase Auth:** pronto, com recuperação de senha e login social; mas o "eu" teria de ser criado por trigger ou webhook, e o app ficaria acoplado ao SDK do Supabase.
- **Sessão opaca no banco (sem JWT):** revogação imediata, mas uma consulta ao banco por requisição; com acesso de 15 min o JWT dá o mesmo controle prático.
- **JWT longo sem refresh:** mais simples, mas token roubado vale por dias e não há como revogar.
