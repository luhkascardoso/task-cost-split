// Monta o comentário da triagem e cria/atualiza um único comentário na issue.
// Entradas (env): OUT (structured_output do agente), CTX_DIR (issues.json, labels.json, repro.json),
//   REPO, ISSUE_NUMBER, RUN_URL, GITHUB_TOKEN, DRY_RUN=1 (só imprime o markdown).
// Não muda status, prioridade nem labels: só comenta. Quem decide é uma pessoa.
import { readFileSync, appendFileSync } from 'node:fs';

const MARKER = '<!-- task-cost-split:triage -->';
const env = process.env;

const readJson = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strings = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

const TYPES = { bug: '🐞 Bug', feature: '✨ Feature', chore: '🧹 Chore', docs: '📝 Docs', pergunta: '❓ Pergunta' };
const PRIORITIES = { urgente: '🔴 Urgente', alta: '🟠 Alta', media: '🟡 Média', baixa: '🔵 Baixa' };
const REPRO = {
  reproduzido: '✅ **Reproduzido:** o teste descreve o comportamento correto e falhou, como o bug relata.',
  nao_reproduzido: '❔ **Não reproduzido:** o teste passou. O bug pode depender de algo que o teste não cobre (tela, dispositivo, dados).',
  erro: '⚠️ **O teste não rodou** (erro de compilação ou de ambiente). Veja a saída abaixo.',
};

const ctx = env.CTX_DIR || '.triage-ctx';
const issues = readJson(`${ctx}/issues.json`) || [];
const labels = new Set((readJson(`${ctx}/labels.json`) || []).map((l) => l.name));
const repro = readJson(`${ctx}/repro.json`) || { status: 'nao_tentado' };
const issueNumber = Number(env.ISSUE_NUMBER);

// Fora do contrato = triagem inválida (o comentário diz isso e o job falha).
function validate(raw) {
  if (!raw || typeof raw !== 'object') return { error: 'O agente não devolveu um resultado.' };
  if (!TYPES[raw.type]) return { error: 'Tipo inválido na saída do agente.' };
  if (!PRIORITIES[raw.priority]) return { error: 'Prioridade inválida na saída do agente.' };
  const byNumber = new Map(issues.map((i) => [i.number, i]));
  return {
    triage: {
      summary: str(raw.summary),
      type: raw.type,
      priority: raw.priority,
      priorityReason: str(raw.priority_reason),
      missing: strings(raw.missing),
      labels: [...new Set(strings(raw.labels))].slice(0, 5),
      // Só duplicadas que existem de verdade na lista entregue ao agente (nunca a própria issue).
      duplicates: (Array.isArray(raw.duplicates) ? raw.duplicates : [])
        .filter((d) => d && Number.isInteger(d.number) && d.number !== issueNumber && byNumber.has(d.number))
        .slice(0, 5)
        .map((d) => ({ ...byNumber.get(d.number), reason: str(d.reason) })),
      reproductionNotes: str(raw.reproduction_notes),
      ready: raw.ready_for_agent === true,
    },
  };
}

// Texto do agente (e da issue, que ele leu) é dado não confiável:
// sem menções, sem HTML, sem links/imagens e sem #123 virando referência.
const ZW = '​';
const neutralize = (text) => String(text ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/`/g, '\\`')
  .replace(/@/g, `@${ZW}`)
  .replace(/#/g, `#${ZW}`)
  .replace(/:\/\//g, `:${ZW}//`).replace(/www\./gi, (m) => `${m.slice(0, 3)}${ZW}.`)
  .replace(/\[/g, '\\[').replace(/\]/g, '\\]');
const inline = (text) => neutralize(text).replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ').trim();
const label = (name) => `\`${name.replace(/`/g, "'")}\`${labels.has(name) ? '' : ' (nova)'}`;
// Bloco de código: nada de markdown é interpretado dentro; só não pode fechar a cerca.
const fenced = (text, lang = '') => ['~~~~' + lang, String(text ?? '').replace(/~{3,}/g, (m) => m.split('').join(ZW)), '~~~~'].join('\n');

function render(triage, invalidReason) {
  const footer = `<sub>Sugestão do agente de triagem · [ver execução](${env.RUN_URL}) · status, prioridade e labels não foram alterados: quem decide é uma pessoa.</sub>`;
  if (!triage) {
    return [MARKER, '## 🧭 Triagem — não concluída', '',
      `${inline(invalidReason)} Rode de novo em Actions → Triagem de issues → Run workflow, com o número desta issue.`,
      '', footer].join('\n');
  }

  const out = [MARKER, '## 🧭 Triagem', ''];
  if (triage.summary) out.push(`> ${inline(triage.summary)}`, '');
  out.push('| | Sugestão |', '|---|---|',
    `| Tipo | ${TYPES[triage.type]} |`,
    `| Prioridade | ${PRIORITIES[triage.priority]}${triage.priorityReason ? ` — ${inline(triage.priorityReason)}` : ''} |`,
    `| Labels | ${triage.labels.length ? triage.labels.map(label).join(', ') : '—'} |`,
    `| Pronta para \`agente\` | ${triage.ready ? 'Sim' : 'Não, veja o que falta'} |`, '');

  out.push('### O que falta na descrição', '');
  out.push(...(triage.missing.length
    ? triage.missing.map((m) => `- ${inline(m)}`)
    : ['Nada: objetivo e critérios de aceite estão claros.']), '');

  out.push('### Possíveis duplicadas', '');
  out.push(...(triage.duplicates.length
    // O número vem da lista do repositório (validado acima), então o link é nosso, não do agente.
    ? triage.duplicates.map((d) => `- #${d.number} ${inline(d.title)} (${d.state === 'OPEN' ? 'aberta' : 'fechada'})${d.reason ? ` — ${inline(d.reason)}` : ''}`)
    : ['Nenhuma encontrada.']), '');

  if (triage.type === 'bug' || repro.status !== 'nao_tentado') {
    out.push('### Reprodução', '');
    if (REPRO[repro.status]) {
      out.push(REPRO[repro.status], '');
      if (triage.reproductionNotes) out.push(inline(triage.reproductionNotes), '');
      out.push(`<details><summary>Teste e saída</summary>`, '',
        `Arquivo gerado na execução (não commitado): \`${String(repro.file).replace(/`/g, "'")}\``, '',
        fenced(repro.code, 'ts'), '', 'Saída do Jest:', '', fenced(repro.output), '', '</details>', '');
    } else {
      out.push(`— **Sem teste de reprodução.** ${inline(triage.reproductionNotes) || 'O agente não escreveu um teste.'}`, '');
    }
  }

  out.push(footer);
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
    const comments = await gh(`${base}/${issueNumber}/comments?per_page=100&page=${page}`);
    // Só o comentário do próprio bot: outra pessoa pode colar o marcador num comentário dela.
    const mine = comments.find((c) => c.user?.type === 'Bot' && c.user?.login === 'github-actions[bot]' && c.body?.includes(MARKER));
    if (mine) return gh(`${base}/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) }).then(() => 'atualizado');
    if (comments.length < 100) break;
  }
  await gh(`${base}/${issueNumber}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  return 'criado';
}

const { triage, error } = validate(parse(env.OUT || ''));
const body = render(triage, error);
if (env.DRY_RUN === '1') {
  console.log(body);
} else {
  console.log(`Comentário da triagem ${await upsert(body)} na issue #${issueNumber}.`);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${body}\n`);
}
if (!triage) {
  console.error(`::error::${error}`);
  process.exitCode = 1;
}
