# TaskCost Split

App mobile de **divisão de despesas** em grupo. Você cria uma **atividade** (ex.: "Férias de verão"), registra **despesas** e escolhe os **participantes** de cada uma. O valor é dividido igualmente e você marca quem já pagou.

- **Design:** [Figma, Divisão de despesas](https://www.figma.com/design/ZifecQcpSXnbAnjN3PlYZO/Divis%C3%A3o-de-despesas--Community---Copy-?node-id=3-809)
- **Stack:** Expo SDK 58 · React Native 0.88 · TypeScript · Expo Router · TanStack Query · Zustand · React Hook Form + Zod

> **Backend:** ainda não existe (será um backend próprio). Por enquanto o app roda com uma **fonte de dados mock local**: crie uma conta no próprio app e tudo fica salvo no aparelho.

## Começando rápido

```bash
nvm use                # Node >= 22.13 (veja .nvmrc)
npm install
cp .env.example .env.local   # EXPO_PUBLIC_DATA_SOURCE=mock
npm start
```

Passo a passo completo em [docs/07-setup.md](docs/07-setup.md).

## Scripts

| Comando | O que faz |
|---|---|
| `npm start` | Dev server (Expo) |
| `npm test` | Testes unitários (Jest: domínio + fonte de dados mock) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (config Expo) |

## Documentação

| Doc | Conteúdo |
|---|---|
| [01 · Arquitetura](docs/01-arquitetura.md) | Camadas, pastas, fluxo de dados, decisões técnicas |
| [02 · Design system](docs/02-design-system.md) | Tokens do Figma e mapa Figma → componentes |
| [03 · Telas e navegação](docs/03-telas-e-navegacao.md) | Mapa de rotas e nodes do Figma por tela |
| [04 · Camada de dados](docs/04-camada-de-dados.md) | Contrato `DataSource`, mock local e como plugar o backend |
| [05 · Regras de negócio](docs/05-regras-de-negocio.md) | Divisão, arredondamento, status, resumo |
| [06 · Convenções](docs/06-convencoes.md) | Padrões de código e receitas ("como adicionar uma tela") |
| [07 · Setup](docs/07-setup.md) | Ambiente, execução, builds |
| [08 · Roadmap](docs/08-roadmap.md) | O que está pronto e o que falta |
| [11 · SOLID](docs/11-solid.md) | Princípios SOLID aplicados às camadas, checklist de feature nova e de PR |
| [12 · Atomic Design e Compound](docs/12-atomic-design-e-compound.md) | Níveis dos componentes, padrão compound, receita e checklist de componentes |
