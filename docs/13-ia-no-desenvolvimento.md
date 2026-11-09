# 13 · IA no desenvolvimento

Agentes de IA escrevem código, testes e reviews neste projeto (Claude Code com hooks, o review automático em todo PR). **Quem responde pelo que vai para a `main` é a pessoa que faz o merge.** A IA acelera; ela não assina.

## O que cada gate garante (e o que não garante)

| Gate | Garante | Não garante |
|---|---|---|
| Hooks do Claude Code (`.claude/hooks/`) | O arquivo editado passa no lint e o projeto no typecheck; os testes ligados às mudanças passam antes de o agente encerrar | Que a lógica está certa |
| `pre-push` (`.githooks/`) | Typecheck, lint e testes com cobertura antes de subir | Que os testes testam algo relevante |
| CI (`checks`) | O mesmo, num ambiente limpo, com cobertura mínima em `domain` e `data` | Comportamento no aparelho |
| Code review com IA (`review`) | Regras do projeto conferidas linha a linha, com severidade | Que a regra de negócio é a desejada; pode errar para os dois lados |

Os gates pegam o erro **mecânico**. O erro de **intenção** (a regra está errada, o teste mede a coisa errada) só a leitura humana pega.

## Quem faz o quê

| Etapa | A IA pode | A pessoa precisa |
|---|---|---|
| Especificação | Rascunhar a issue, critérios de aceite, casos de borda | Confirmar a regra de negócio. É a fonte da verdade, não o rascunho |
| Implementação | Escrever o código seguindo `AGENTS.md` e os docs | Ler cada arquivo alterado; rodar o app nos fluxos afetados |
| Testes | Gerar os testes e os dados | Conferir se os dados são realistas e se há casos de erro e de borda |
| Review | Apontar desvios das regras com severidade | Julgar cada achado: confirmar, rejeitar ou registrar o falso positivo |
| Merge | — | Decidir. Check verde não é aprovação |

## Cenários deste projeto

**1. Teste verde que não testa nada.** A IA gera um teste de `splitEvenly(10000, [A, B])`: passa, a cobertura sobe, mas a divisão é exata. O caso que importa (o resto de 1 centavo indo para o primeiro participante) nunca é exercitado. *O que fazer:* para regra de dinheiro, exija ao menos um caso com resto, um com 1 participante e um inválido.

**2. Regra de negócio silenciosamente errada.** Um agente "simplifica" a divisão com `Math.round(total / n)`. Compila, os testes gerados junto passam, e a soma das cotas deixa de bater com o total. *O que fazer:* confrontar com [05 · Regras de negócio](05-regras-de-negocio.md). Mudou regra em `src/domain`? O teste existente deve mudar junto, e por decisão sua.

**3. Review automatizado aceito sem leitura.** O check `review` aprova; ninguém lê o diff. *O que fazer:* o comentário do review é ponto de partida. Leia o diff mesmo com ✅.

**4. Review automatizado errado e insistente.** Aconteceu no PR #3: o revisor acusou a remoção de uma skill que o PR estava **adicionando**, porque olhou o workspace e não a lista de mudanças. *O que fazer:* conferir o achado no código (`git diff --name-status`) antes de "corrigir". Falso positivo recorrente vira ajuste no gate ou na skill, não gambiarra no código.

**5. API inventada ou desatualizada.** O Expo muda a cada SDK; um agente sugere uma API que não existe no SDK 58. *O que fazer:* `AGENTS.md` já manda consultar a doc versionada; desconfie de import novo de `expo-*` sem link para a doc da versão.

**6. Dado sensível em log.** Para depurar o login, a IA adiciona `console.log(input)` com e-mail e senha. *O que fazer:* nada de dado pessoal ou credencial em log, nem temporário ([01 · Princípios](01-arquitetura.md#princípios-de-engenharia)).

## Checklist antes de aprovar

**Código gerado por IA**
- [ ] Li e entendi cada arquivo alterado.
- [ ] A regra de negócio confere com [05](05-regras-de-negocio.md), não só "compila e passa".
- [ ] Erros seguem [04 · Erros](04-camada-de-dados.md#erros): `DataError`, escrita sem retry, falha visível na tela.
- [ ] Nenhum dado sensível em log, `queryKey` ou AsyncStorage.
- [ ] Rodei o app nos fluxos afetados (ou os E2E do Maestro).

**Testes gerados por IA**
- [ ] Os dados refletem casos reais (valores em centavos, restos, participante "eu").
- [ ] Há casos de erro e de borda, não só o caminho feliz.
- [ ] A cobertura vem de testes que falhariam se a regra quebrasse.

**Review gerado por IA**
- [ ] Li o comentário inteiro, não só o veredito.
- [ ] Conferi no código cada achado crítico e alto antes de corrigir.
- [ ] Falsos positivos foram registrados (ajuste na skill ou no gate), não contornados.

## Antipadrões

| Antipadrão | Risco | Em vez disso |
|---|---|---|
| "A IA gerou, deve estar certo" | Bug de lógica em produção | Ler e testar como código de qualquer pessoa |
| Merge porque o check ficou verde | Falsa sensação de qualidade | Check é condição necessária, não suficiente |
| Afrouxar um gate para o PR passar | O gate deixa de proteger os próximos PRs | Corrigir o código ou ajustar o gate num PR próprio, justificado |
| Delegar decisão de arquitetura ao agente | Dependência errada, camada violada | Decidir e registrar nos docs; o agente segue |
| Corrigir achado de review sem verificar | Código piora para satisfazer um falso positivo | Confirmar no diff antes |
