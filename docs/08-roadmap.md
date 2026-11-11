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

## Backend próprio (Node.js) 🔜

Desenho em [15 · Backend](15-backend.md): Node + Fastify + Prisma em `server/`, Postgres no Supabase, participante híbrido.

- [x] Definir stack, banco, hospedagem e modelo de participantes ([15](15-backend.md#decisões))
- [x] Fase 0 · Arquitetura: docs em `docs/backend/`, ADRs, skills `backend-endpoint` e `backend-migration`, regras de backend no code review
- [ ] Fase 1 · Fundação: `server/`, Fastify, erros, `/health`, OpenAPI, Prisma, isolamento do app, job no CI
- [ ] Fase 2 · Auth: cadastro com participante "eu", login, refresh rotativo, saída
- [ ] Fase 3 · Recursos: atividades, despesas, status, participantes, resumo, idempotência
- [ ] Fase 4 · Adaptador `src/data/http/` com tokens em `expo-secure-store` + suíte de contrato contra o servidor
- [ ] Fase 5 · Deploy: Supabase (schema `app` + RLS), Render, pipeline com migrations antes do código, variáveis no EAS
- [ ] Fase 6 (v2) · Vínculo de participantes a contas e atividades compartilhadas
- [ ] Fase 7 (v2) · Pagador e saldo ("quem deve a quem")

## Fase 2: Polimento de UX

- [ ] Date picker nativo no formulário de atividade (`@react-native-community/datetimepicker`). Hoje a data é digitada como `dd/mm/aa`.
- [ ] Seletor de participantes melhor: lista de sugestões ao focar, "Você" no topo, chip de "criar '<nome>'"
- [ ] Logout. Ainda não há botão no Figma: definir lugar (menu no logo? tela de perfil?). A função `signOut()` já existe.
- [ ] Feedback de erro padronizado (toast) e estados de erro nas listas, com retry. A base está pronta: `DataError` com códigos, `errorMessage` e falhas de escrita já visíveis nos sheets ([04 · Erros](04-camada-de-dados.md#erros)). Falta o toast e o estado de erro nas listas
- [ ] Skeletons no lugar do `ActivityIndicator`
- [ ] Haptics ao marcar Pago (`expo-haptics`)
- [ ] Teclado: `KeyboardAvoidingView` / `react-native-keyboard-controller` nos sheets
- [x] Acessibilidade ([checklist em 12](12-atomic-design-e-compound.md#acessibilidade)): `textMuted` passou de #585860 (2,79:1 / 2,65:1) para #7e7e86 (4,88:1 sobre `background`, 4,64:1 sobre `surface`) — LUH-5
- [ ] Levar o tom `#7e7e86` (`gray350`) para o Figma, que ainda usa o gray-400 nos textos apagados

## Fase 3: Robustez

- [ ] Testes de componentes, hooks, telas e rotas com RNTL v14 + `test-renderer` 1.3 (compatível com React 19.3). Guia e backlog em [09 · Testes](09-testes.md).
- [x] Testes E2E (Maestro) dos fluxos principais — estrutura e YAMLs em `.maestro/`; validar no simulador ([10 · E2E com Maestro](10-e2e-maestro.md)).
- [ ] Quando houver backend: totais e contagens calculados no servidor (o contrato `DataSource` já devolve os dados agregados)
- [ ] Confirmação de e-mail e recuperação de senha
- [ ] Sentry / monitoramento de erros
- [x] CI (GitHub Actions): typecheck + lint + test com cobertura mínima em PR, code review com IA como check obrigatório e hook pre-push
- [x] Erros normalizados (`DataError` com códigos), retry só para falhas transitórias de leitura, mutations sem retry automático
- [x] Dependabot (`.github/dependabot.yml`) e CodeQL (`.github/workflows/codeql.yml`). Alertas, correções automáticas e secret scanning: rodar `./scripts/setup-repo-security.sh` uma vez
- [x] Templates de PR, bug e funcionalidade (`.github/`)
- [x] Board no Linear com agentes ([14](14-board-linear-e-agentes.md)): agente na nuvem por label e MCP do Linear no Claude Code. Falta a ativação única (app do Claude, `AGENT_ALLOWED_SENDERS`) e validar no primeiro uso
- [ ] EAS Build em tags `vX.Y.Z` e `CHANGELOG.md` quando houver publicação nas lojas

## Ideias / decisões em aberto

- **Pagador:** registrar quem pagou a conta (`expenses.paid_by`) e calcular "quem deve a quem" com algoritmo de quitação mínima. Planejado como fase 7 do backend.
- **Divisão desigual:** por valor, porcentagem ou pesos (o domínio já isola isso em `split.ts`).
- **Status ao editar valor:** voltar cotas pagas para pendente quando o valor da cota muda?
- **Atividades compartilhadas** entre usuários reais: planejado como fase 6 do backend (participante vinculado a uma conta, [15](backend/03-dados.md#participante-híbrido)).
- **Offline-first:** persistir o cache do React Query (`@tanstack/query-async-storage-persister`).
