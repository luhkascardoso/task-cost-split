# 08 · Roadmap

## Fase 0: Fundação ✅ (feita)

- [x] Projeto Expo SDK 58 + TypeScript strict + Expo Router (typed routes)
- [x] Tokens do Figma (`src/theme`) e componentes base (`src/components/ui`)
- [x] Domínio: dinheiro, divisão, status, resumo (testado)
- [x] Camada de dados desacoplada: contrato `DataSource` + implementação **mock** local (testada, 17 testes no total)
- [x] Hooks React Query para todas as features
- [x] Todas as rotas do Figma criadas e ligadas aos dados
- [x] typecheck, lint e bundle iOS (`expo export`) ok

## Fase 1: Rodar de ponta a ponta 🔜

- [ ] Atualizar o Node para ≥ 22.13
- [ ] Testar os fluxos de [03](03-telas-e-navegacao.md#fluxos-principais) em iOS e Android
- [ ] Revisão **pixel-perfect** tela a tela contra o Figma (`get_design_context` por node)
- [ ] Exportar o **logo SVG** do Figma (node `5108:760`) para `ui/LogoMark.tsx` e trocar o placeholder em `ui/Logo.tsx`
- [ ] Gerar ícone do app e splash a partir do logo

## Backend próprio ⏸️ (aguardando decisão)

Nada de backend foi feito por enquanto. Quando for a hora:

- [ ] Definir stack do backend (linguagem, framework, banco, hospedagem)
- [ ] Implementar o contrato de [04 · Camada de dados](04-camada-de-dados.md) (auth + recursos)
- [ ] Criar o adaptador `src/data/http/` com tokens em `expo-secure-store`
- [ ] Rodar os cenários de teste do mock contra o adaptador HTTP

## Fase 2: Polimento de UX

- [ ] Date picker nativo no formulário de atividade (`@react-native-community/datetimepicker`). Hoje a data é digitada como `dd/mm/aa`.
- [ ] Seletor de participantes melhor: lista de sugestões ao focar, "Você" no topo, chip de "criar '<nome>'"
- [ ] Logout. Ainda não há botão no Figma: definir lugar (menu no logo? tela de perfil?). A função `signOut()` já existe.
- [ ] Feedback de erro padronizado (toast) e estados de erro nas listas, com retry
- [ ] Skeletons no lugar do `ActivityIndicator`
- [ ] Haptics ao marcar Pago (`expo-haptics`)
- [ ] Teclado: `KeyboardAvoidingView` / `react-native-keyboard-controller` nos sheets
- [ ] Acessibilidade: labels nos botões só de ícone (já parcialmente feito), contraste do `textMuted`

## Fase 3: Robustez

- [ ] Testes de componentes, hooks, telas e rotas com RNTL v14 + `test-renderer` 1.3 (compatível com React 19.3). Guia e backlog em [09 · Testes](09-testes.md).
- [x] Testes E2E (Maestro) dos fluxos principais — estrutura e YAMLs em `.maestro/`; validar no simulador ([10 · E2E com Maestro](10-e2e-maestro.md)).
- [ ] Quando houver backend: totais e contagens calculados no servidor (o contrato `DataSource` já devolve os dados agregados)
- [ ] Confirmação de e-mail e recuperação de senha
- [ ] Sentry / monitoramento de erros
- [ ] CI (GitHub Actions): typecheck + lint + test em PR; EAS Build em tags

## Ideias / decisões em aberto

- **Pagador:** registrar quem pagou a conta (`expenses.paid_by`) e calcular "quem deve a quem" com algoritmo de quitação mínima.
- **Divisão desigual:** por valor, porcentagem ou pesos (o domínio já isola isso em `split.ts`).
- **Status ao editar valor:** voltar cotas pagas para pendente quando o valor da cota muda?
- **Atividades compartilhadas** entre usuários reais (exige backend; o contrato precisaria de membros/convites).
- **Offline-first:** persistir o cache do React Query (`@tanstack/query-async-storage-persister`).
