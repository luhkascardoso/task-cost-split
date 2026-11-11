// Plano e contrato de verificação do agente (docs/13-ia-no-desenvolvimento.md#plano-e-contrato-de-verificação).
//
//   node agent-plan.mjs state    → decide o modo da execução a partir da issue
//     Entradas: REPO, ISSUE_NUMBER, EVENT_LABEL (label que disparou), LABELS (JSON com as labels
//     da issue), PLAN_FILE (onde gravar o plano aprovado), GITHUB_TOKEN.
//     Saídas ($GITHUB_OUTPUT): mode (avaliar | com_plano | nada), forced, plan_url.
//   node agent-plan.mjs publish  → publica o plano que o agente devolveu e tira a aprovação antiga
//     Entradas: OUT (structured_output), REPO, ISSUE_NUMBER, RUN_URL, GITHUB_TOKEN, DRY_RUN=1.
//     Saída ($GITHUB_OUTPUT): plan_url. Plano fora do contrato → exit 1.
//
// O plano fica no próprio comentário (JSON em base64 num comentário HTML). Só vale o comentário
// do github-actions[bot]: ninguém consegue "aprovar" um plano escrito por outra pessoa.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parse, str, strings, inline, codeSpan, github } from './lib/issue-comment.mjs';

export const MARKER = '<!-- task-cost-split:plan -->';
export const APPROVED = 'plano-aprovado';
export const FORCE = 'plano';
const env = process.env;
const issue = Number(env.ISSUE_NUMBER);
const output = (key, value) => {
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
  else console.log(`${key}=${value}`);
};

const KINDS = { teste: '🧪 Teste', comando: '⌨️ Comando', print: '🖼️ Print', revisao: '👀 Revisão' };

// Normaliza e valida o plano. Sem passos ou sem critérios, não há o que aprovar.
export function validatePlan(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'O agente não devolveu um plano.' };
  const criteria = (Array.isArray(raw.criterios) ? raw.criterios : [])
    .filter((c) => c && str(c.criterio))
    .map((c) => ({ criterio: str(c.criterio), evidencia: str(c.evidencia), tipo: KINDS[c.tipo] ? c.tipo : '' }));
  const plan = {
    resumo: str(raw.resumo),
    passos: strings(raw.passos),
    arquivos: strings(raw.arquivos),
    criterios: criteria,
    riscos: strings(raw.riscos),
  };
  if (!plan.passos.length) return { error: 'O plano não tem passos.' };
  if (!plan.criterios.length) return { error: 'O plano não liga nenhum critério de aceite a uma evidência.' };
  const missing = plan.criterios.find((c) => !c.evidencia || !c.tipo);
  if (missing) return { error: `O critério "${missing.criterio.slice(0, 80)}" está sem evidência ou sem tipo.` };
  return { plan };
}

export function renderPlan(plan, runUrl) {
  const json = Buffer.from(JSON.stringify(plan), 'utf8').toString('base64');
  const out = [MARKER, '## 🗺️ Plano do agente — aguardando aprovação', ''];
  if (plan.resumo) out.push(`> ${inline(plan.resumo)}`, '');
  out.push('### Passos', '', ...plan.passos.map((p, i) => `${i + 1}. ${inline(p)}`), '');
  if (plan.arquivos.length) out.push('### Arquivos afetados', '', plan.arquivos.map(codeSpan).join(', '), '');
  out.push('### Contrato de verificação', '',
    'Cada critério de aceite e a evidência que vai provar que ele foi cumprido. O PR traz esta tabela preenchida.', '',
    '| # | Critério de aceite | Evidência | Tipo |', '|---|---|---|---|',
    ...plan.criterios.map((c, i) => `| ${i + 1} | ${inline(c.criterio)} | ${inline(c.evidencia)} | ${KINDS[c.tipo]} |`), '');
  if (plan.riscos.length) out.push('### Riscos e dúvidas', '', ...plan.riscos.map((r) => `- ${inline(r)}`), '');
  out.push('---', '',
    `**Para aprovar:** aplique a label \`${APPROVED}\` (no Linear ou aqui). O agente implementa seguindo este plano.  `,
    '**Para mudar:** comente o que mudar, remova e aplique de novo a label `agente`. O agente lê os comentários e refaz o plano.', '',
    `<sub>[Ver execução](${runUrl}) · publicar um plano novo remove a aprovação anterior.</sub>`,
    `<!-- plan-json:${json} -->`);
  return out.join('\n');
}

// Último plano publicado pelo bot nesta issue, ou null.
export function findPlan(comments) {
  const mine = comments.filter((c) => c.user?.type === 'Bot' && c.user?.login === 'github-actions[bot]' && c.body?.includes(MARKER));
  const last = mine.at(-1);
  const encoded = last?.body.match(/<!-- plan-json:([A-Za-z0-9+/=]+) -->/)?.[1];
  if (!encoded) return null;
  const { plan } = validatePlan(parse(Buffer.from(encoded, 'base64').toString('utf8')));
  return plan ? { plan, url: last.html_url } : null;
}

async function listComments(api) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/repos/${env.REPO}/issues/${issue}/comments?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

// Decisão pura (testada): o que esta execução do agente faz.
export function decide({ labels, eventLabel, found }) {
  const set = new Set(labels);
  const forced = set.has(FORCE);
  if (found && set.has(APPROVED)) return { mode: 'com_plano', forced };
  // Aprovação sem plano publicado (ou plano ilegível): nada a implementar.
  if (eventLabel === APPROVED) return { mode: 'nada', forced };
  return { mode: 'avaliar', forced };
}

async function state() {
  const labels = (parse(env.LABELS || '[]') || []).map((l) => (typeof l === 'string' ? l : l?.name));
  const found = findPlan(await listComments(github(env).api));
  const { mode, forced } = decide({ labels, eventLabel: env.EVENT_LABEL, found });
  output('forced', String(forced));
  output('mode', mode);
  if (mode === 'com_plano') {
    mkdirSync(dirname(env.PLAN_FILE), { recursive: true });
    writeFileSync(env.PLAN_FILE, `${JSON.stringify(found.plan, null, 2)}\n`);
    output('plan_url', found.url);
    console.log(`Plano aprovado: ${found.url}`);
  } else if (mode === 'nada') {
    console.log(`::notice::Label ${APPROVED} aplicada, mas a issue #${issue} não tem plano publicado pelo agente.`);
  } else {
    console.log(found ? 'Há plano, mas sem aprovação: o agente reavalia e pode refazer o plano.' : 'Sem plano: o agente avalia o tamanho da tarefa.');
  }
}

async function publish() {
  const { plan, error } = validatePlan(parse(env.OUT || '')?.plano);
  if (!plan) {
    console.error(`::error::${error}`);
    process.exitCode = 1;
    return;
  }
  const body = renderPlan(plan, env.RUN_URL);
  if (env.DRY_RUN === '1') {
    console.log(body);
    return;
  }
  const gh = github(env);
  // Primeiro tira a aprovação antiga, depois publica: nunca existe plano novo já "aprovado".
  if (await gh.removeLabel(issue, APPROVED)) console.log(`Label ${APPROVED} removida (aprovação do plano anterior).`);
  const { action, url } = await gh.upsertComment(issue, MARKER, body);
  output('plan_url', url);
  console.log(`Plano ${action}: ${url}`);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${body}\n`);
}

const command = process.argv[2];
if (command === 'state') await state();
else if (command === 'publish') await publish();
else if (command) {
  console.error('Uso: node agent-plan.mjs state|publish');
  process.exitCode = 2;
}
