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
| Plano (tarefa grande) | Propor passos, arquivos e a evidência de cada critério | Aprovar ou pedir mudança antes do código ([Plano e contrato](#plano-e-contrato-de-verificação)) |
| Implementação | Escrever o código seguindo `AGENTS.md` e os docs | Ler cada arquivo alterado; rodar o app nos fluxos afetados |
| Testes | Gerar os testes e os dados | Conferir se os dados são realistas e se há casos de erro e de borda |
| Review | Apontar desvios das regras com severidade | Julgar cada achado: confirmar, rejeitar ou registrar o falso positivo |
| Merge | — | Decidir. Check verde não é aprovação |

## Plano e contrato de verificação

Em tarefa grande, o erro mais caro é o de **intenção**: o agente entende o pedido de outro jeito e escreve muito código certo para a coisa errada. Por isso, antes de codar, ele publica um **plano** e um **contrato de verificação**: cada critério de aceite ligado à evidência que vai provar que ele foi cumprido. Uma pessoa aprova o plano; só então o código começa. Corrigir um plano custa um comentário; corrigir um PR custa um PR.

### Quando usar

Plano obrigatório quando a tarefa atende a **qualquer** um destes pontos:

| Sinal | Exemplo |
|---|---|
| Muda regra de dinheiro, divisão ou status (`src/domain`) | Dividir por peso; pagador e saldo |
| Muda o contrato `DataSource`, o backend ou o banco | Nova operação no contrato, rota ou tabela nova |
| Cria tela, rota ou fluxo com mais de uma tela | Aba Participantes; editar despesa |
| Deve tocar mais de 3 arquivos de produção (fora testes e docs) | Refatoração de uma feature |
| A issue tem a label `plano` | Qualquer tarefa em que você quer ver o plano antes |

Fora disso a tarefa é **pequena** e vai direto para o código: um arquivo, uma regra, ajuste visual, texto, token (como o LUH-5). Na dúvida, o agente faz o plano.

### Fluxo (agente na nuvem)

1. A label `agente` aciona o agente ([14 · Passo 2](14-board-linear-e-agentes.md#passo-2--agente-na-nuvem)).
2. Tarefa grande: o agente **não commita nada**. Ele publica o plano num comentário da issue (que a sincronização leva ao card do Linear) e para:
   - passos em ordem;
   - arquivos que vai criar ou alterar;
   - a tabela **critério de aceite → evidência → tipo**;
   - riscos e dúvidas para você decidir.
3. Você lê o plano e decide:
   - **Aprovar:** aplique a label `plano-aprovado` (no Linear ou no GitHub). Só vale de quem pode acionar o agente (`AGENT_ALLOWED_SENDERS`).
   - **Pedir mudança:** comente o que mudar, remova e aplique de novo a label `agente`. O agente lê os comentários e refaz o plano. Publicar um plano novo **remove** a aprovação anterior.
4. Com `plano-aprovado`, o agente implementa seguindo o plano. O PR traz `Plano aprovado: <link>` e a seção **Contrato de verificação** preenchida, com a evidência entregue para cada critério.
5. O code review confere a tabela: critério sem evidência, evidência vaga ou teste que não existe **reprova** o check (alto).

### Evidência que vale

| Tipo | Vale | Não vale |
|---|---|---|
| Teste | Arquivo e nome do teste que falharia se o critério quebrasse | "Testes passando"; teste que não exercita o critério |
| Comando | Comando e resultado esperado (`npm run test -- split` → 6 casos verdes) | `npm run check` para um critério que não é sobre ele |
| Print | Imagem anexada ao PR mostrando a tela do critério | "Conferido no simulador" sem imagem |
| Revisão | Ponto que só uma pessoa julga (texto, decisão de produto), com quem e o quê | Usar para fugir de escrever o teste |

### Claude Code local

O mesmo vale no seu computador ("pega o LUH-20"): em tarefa grande, o agente mostra o plano no chat e, se você pedir, comenta no card do Linear. Ele só começa a codar depois do seu "aprovado". O PR leva a mesma seção de contrato.

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
- [ ] Cada critério de aceite tem evidência no contrato de verificação, e conferi as evidências (o teste existe e testa o critério).
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
