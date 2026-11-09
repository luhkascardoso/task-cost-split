# 05 · Regras de negócio

Tudo aqui está em `src/domain/` e coberto por `src/domain/__tests__/domain.test.ts`.
**Mudou uma regra? Mude o teste primeiro.**

## Dinheiro (`money.ts`)

- Todo valor é um **inteiro em centavos** (`type Cents = number`), no banco e no app.
- Converta para reais só na exibição: `formatBRL(450000)` → `"R$ 4.500,00"`.
- Input de valor: máscara "centavos primeiro" (`maskBRLInput`). Digitar `1`, `2`, `3` mostra `0,01` → `0,12` → `1,23`.
- Moeda única: BRL.

## Divisão (`split.ts`)

**Divisão igual** entre os participantes selecionados.

```
splitEvenly(10000, [A, B, C])  →  A: 3334 · B: 3333 · C: 3333
```

- `base = floor(total / n)`. O **resto** é distribuído 1 centavo por vez aos primeiros participantes, na ordem em que foram adicionados.
- A soma das cotas é **sempre exatamente** igual ao total. O banco também valida isso na RPC.
- Participantes duplicados são ignorados. Pelo menos 1 participante é obrigatório.
- O card mostra `R$ X / pessoa` usando a cota base (`perPersonAmount`).

### Edição de despesa (`buildShares`)

Ao editar o valor ou a lista de participantes, as cotas são **recalculadas**, mas o **status de quem continua** na despesa é preservado. Quem entra começa como `pending`.

> ⚠️ Se alguém já pagou R$ 50 e o valor da cota muda para R$ 40, o status continua "Pago". Avaliar no futuro: voltar para pendente quando o valor mudar (veja o roadmap).

## Status (`status.ts`)

Cada cota tem `pending` ou `paid`. O status da **despesa** é derivado:

| Cotas | Status | Badge |
|---|---|---|
| nenhuma paga (ou sem cotas) | `pending` | 🔴 Pendente |
| algumas pagas | `partial` | 🟡 Parcial |
| todas pagas | `paid` | 🟢 Pago |

### Rótulos

`expenseStatusLabel` (Pendente/Parcial/Pago) e `shareStatusLabel` (Pendente/Pago) ficam em `status.ts`. Os componentes de UI (`StatusBadge`, `StatusSelect`) leem os textos daí, sem duplicar strings.

## Validação de entrada (`validation.ts`)

Regras que valem para qualquer fonte de dados (mock e o futuro backend). As funções devolvem a mensagem para a UI ou `null`; quem chama decide como sinalizar (o mock lança `DataError`).

| Função | Regra | Mensagem |
|---|---|---|
| `getExpenseInputError` | título não vazio | Informe um título |
| | valor inteiro > 0 (centavos) | Informe um valor |
| | pelo menos 1 participante | Adicione pelo menos um participante |
| `getParticipantNameError` | nome não vazio | Informe o nome do participante |

A checagem de que os participantes pertencem ao usuário é de persistência e fica na implementação de dados.

## Participante "eu"

- Cada usuário tem **um** participante com `is_self = true`, criado no cadastro com o nome informado.
- Nos seletores ele aparece como **"Você"**.
- **Não** aparece na aba Participantes e **não** entra na contagem de "Participantes" do Resumo.

## Resumo (`summary.ts`)

| Bloco | Cálculo |
|---|---|
| **Minhas contas → Pago** | soma das cotas do participante "eu" com status `paid`, mais quantas despesas são |
| **Minhas contas → Pendente** | o mesmo, para `pending` |
| **Total de despesas** | soma de todas as despesas de todas as atividades |
| **Atividades / Despesas / Participantes** | contagens (participantes sem contar o "eu") |

> Interpretação adotada: "Minhas contas" = **a minha parte** nas despesas. O modelo **não registra quem pagou a conta** (pagador), só se cada um quitou a sua parte. Veja "Pagador" no roadmap se quiser evoluir para "quem deve a quem".

## Aba Participantes

Lista os participantes (exceto "eu") que estão em **pelo menos uma** atividade, com "Em N atividades". Quem foi criado e depois removido de todas as despesas some da lista, mas continua no banco.

## Dinheiro e duplicidade

Operações que gravam valores (criar/editar/excluir despesa, marcar cota como paga, criar/excluir atividade) seguem regras próprias, porque uma repetição vira dinheiro errado.

1. **Nunca repetir escrita automaticamente.** Mutations têm `retry: false` (padrão do `QueryClient` em `src/lib/query-client.ts`). Nova tentativa só quando o **usuário** pede.
2. **Bloquear o segundo toque.** O botão que dispara a operação fica desabilitado enquanto ela está em andamento (`loading={mutation.isPending}` no `Button` já bloqueia o toque).
3. **O usuário nunca fica em dúvida se concluiu.** Sucesso fecha o sheet ou atualiza a tela; falha mostra mensagem. Update otimista (status Pago/Pendente) que falha volta ao estado anterior **e** avisa.
4. **Leitura pode repetir, escrita não.** Só falhas transitórias (`network`, `timeout`, `server`) de leitura são repetidas, até 2 vezes. Erro de negócio (`invalid`, `conflict`, `not_found`, `unauthorized`) nunca, porque repetir não muda o resultado.
5. **Quando houver backend: idempotência.** Cada criação envia um identificador gerado no app (ex.: UUID). O backend ignora um segundo pedido com o mesmo id e devolve o resultado do primeiro. Isso cobre o caso em que a operação foi gravada mas a resposta se perdeu (rede caiu) e o usuário tenta de novo.
6. **Totais são sempre recalculados a partir das cotas** (ver [Resumo](#resumo-summaryts)), nunca somados de forma incremental no cliente.
