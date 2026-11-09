// Monta o comentário do code review e cria/atualiza um único comentário no PR.
// Entradas (env): OUT (structured_output), REPO, PR_NUMBER, HEAD_SHA, RUN_URL,
//   EXEC_FILE (para o modelo), FILES_FILE (arquivos analisados), GITHUB_TOKEN,
//   DRY_RUN=1 (só imprime o markdown).
import { readFileSync, appendFileSync } from 'node:fs';

const MARKER = '<!-- task-cost-split:code-review -->';
const env = process.env;

const readJson = (text) => { try { return JSON.parse(text); } catch { return null; } };
const readFile = (path) => { try { return path ? readFileSync(path, 'utf8') : ''; } catch { return ''; } };

const review = readJson(env.OUT || '');
const files = readFile(env.FILES_FILE).split('\n').map((f) => f.trim()).filter(Boolean);
const model = (() => {
  const exec = readJson(readFile(env.EXEC_FILE));
  const init = Array.isArray(exec) && exec.find((m) => m.type === 'system' && m.subtype === 'init');
  return init?.model || 'Claude';
})();
const shortSha = (env.HEAD_SHA || '').slice(0, 7);

// Célula de tabela markdown: sem quebra de linha e com | escapado.
const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\r?\n+/g, '<br>').trim();
const lines = (f) => (!f.line_start ? '—' : f.line_end && f.line_end !== f.line_start ? `L${f.line_start}-L${f.line_end}` : `L${f.line_start}`);
const fileLink = (f) => {
  const name = f.file.split('/').pop();
  const anchor = f.line_start ? `#L${f.line_start}${f.line_end && f.line_end !== f.line_start ? `-L${f.line_end}` : ''}` : '';
  return `[${cell(name)}](https://github.com/${env.REPO}/blob/${env.HEAD_SHA}/${f.file}${anchor})`;
};

const SECTIONS = [
  { key: 'critico', title: '🚨 CRÍTICO' },
  { key: 'alto', title: '⚠️ ALTO' },
  { key: 'medio', title: '🟡 MÉDIO' },
  { key: 'baixo', title: '🔵 BAIXO' },
];

function table(findings) {
  if (!findings.length) return 'Nenhum problema encontrado.';
  const rows = findings.map((f, i) =>
    `| ${i + 1} | ${fileLink(f)} | ${lines(f)} | **${cell(f.title)}** — ${cell(f.problem)} | ${cell(f.criterion)} |`);
  return ['| # | Arquivo | Linha(s) | Problema | Critério |', '|---|---|---|---|---|', ...rows].join('\n');
}

function render() {
  const footer = `<sub>Atualizado a cada push · commit \`${shortSha}\` · [ver execução](${env.RUN_URL}) · o check obrigatório \`review\` segue esta decisão</sub>`;

  if (!review) {
    return [MARKER, '## ⚠️ Code Review — NÃO CONCLUÍDO', '',
      'O revisor não devolveu um resultado (credencial inválida, limite de uso ou erro na execução). ' +
      'O check `review` fica reprovado até uma nova execução concluir. Veja o passo **Motivo da falha do review** na execução.',
      '', footer].join('\n');
  }

  const findings = Array.isArray(review.findings) ? review.findings : [];
  const confirmed = findings.filter((f) => !f.possible_false_positive);
  const doubtful = findings.filter((f) => f.possible_false_positive);
  const by = (key) => confirmed.filter((f) => f.severity === key);
  const count = Object.fromEntries(SECTIONS.map((s) => [s.key, by(s.key).length]));
  const blocking = count.critico + count.alto;
  const approved = blocking === 0 && review.verdict !== 'request_changes';
  const status = approved ? 'APROVADO' : 'REPROVADO';

  const out = [MARKER, `## ${approved ? '✅' : '⛔'} Code Review — ${status}`, '', '### 🔍 Análise — Claude Code', '',
    `**Modelo:** ${model}  `, `**Commit:** \`${shortSha}\`  `, `**Arquivos analisados:** ${files.length}`, ''];

  if (files.length) {
    out.push('<details><summary>Ver arquivos</summary>', '', files.map((f) => `\`${f}\``).join(', '), '', '</details>', '');
  }
  if (review.summary) out.push(`> ${cell(review.summary).replace(/<br>/g, '\n> ')}`, '');

  for (const s of SECTIONS) {
    if (s.key === 'baixo' && !count.baixo) continue; // só mostra Baixo quando houver
    out.push('---', '', `### ${s.title} (${count[s.key]})`, '', table(by(s.key)), '');
  }
  out.push('---', '', `### ❔ POSSÍVEL FALSO POSITIVO (${doubtful.length})`, '',
    doubtful.length ? table(doubtful) : 'Nenhum possível falso positivo identificado.', '');

  const checklist = Array.isArray(review.checklist) ? review.checklist : [];
  if (checklist.length) {
    out.push('---', '', '### ✅ Checklist Executado', '',
      ...checklist.map((c) => `- [x] ${cell(c.item)} (${c.problems} ${c.problems === 1 ? 'problema' : 'problemas'})`), '');
  }

  const parts = [[count.critico, 'crítico'], [count.alto, 'alto'], [count.medio, 'médio'], [count.baixo, 'baixo']]
    .filter(([n]) => n).map(([n, w]) => `${n} ${w}${n > 1 ? 's' : ''}`);
  const reason = !confirmed.length
    ? 'Nenhum problema encontrado.'
    : approved
      ? `O PR possui ${parts.join(', ')} e nenhum problema alto ou crítico, atendendo aos critérios de aprovação.`
      : `O PR possui ${parts.join(', ')}. Problemas críticos e altos bloqueiam o merge.`;
  const action = !approved ? 'Corrigir os problemas críticos e altos e fazer push de novo.'
    : confirmed.length ? 'Correções recomendadas; não bloqueiam o merge.' : 'Nenhuma.';

  out.push('---', '', '### 📊 Decisão Final', '', `**Status:** ${status}  `, `**Motivo:** ${reason}  `, `**Ação necessária:** ${action}`);
  const steps = SECTIONS.flatMap((s) => by(s.key)).filter((f) => f.fix);
  if (steps.length) {
    out.push('', '**Próximos passos:**', '', ...steps.map((f, i) => `${i + 1}. ${cell(f.fix)} (\`${f.file}${f.line_start ? `:${f.line_start}` : ''}\`)`));
  }
  out.push('', footer);
  return out.join('\n');
}

async function gh(path, init = {}) {
  const res = await fetch(`${env.GITHUB_API_URL || 'https://api.github.com'}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function upsert(body) {
  const base = `/repos/${env.REPO}/issues`;
  for (let page = 1; ; page++) {
    const comments = await gh(`${base}/${env.PR_NUMBER}/comments?per_page=100&page=${page}`);
    const mine = comments.find((c) => c.body?.includes(MARKER));
    if (mine) return gh(`${base}/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) }).then(() => 'atualizado');
    if (comments.length < 100) break;
  }
  await gh(`${base}/${env.PR_NUMBER}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  return 'criado';
}

const body = render();
if (env.DRY_RUN === '1') {
  console.log(body);
} else if (env.MODE === 'push' || !env.PR_NUMBER) {
  // Push sem PR: não há onde comentar; o resultado vai para o resumo da execução.
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${body}\n`);
  console.log(body);
} else {
  const result = await upsert(body);
  console.log(`Comentário do review ${result} no PR #${env.PR_NUMBER}.`);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${body}\n`);
}
