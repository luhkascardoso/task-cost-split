// Utilidades dos comentários que os workflows publicam em issues (triagem, plano do agente).
// Texto vindo de modelo ou de issue é dado NÃO confiável: tudo passa por neutralize/inline.
import { readFileSync } from 'node:fs';

export const readJson = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
export const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };
export const str = (v) => (typeof v === 'string' ? v.trim() : '');
export const strings = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

const ZW = '​';
// Sem menções, HTML, links/imagens, #123 virando referência, nem | quebrando tabela.
export const neutralize = (text) => String(text ?? '')
  .replace(/\\/g, '\\\\')                        // primeiro: \ não pode anular os escapes abaixo
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/`/g, '\\`')
  .replace(/@/g, `@${ZW}`)
  .replace(/#/g, `#${ZW}`)
  .replace(/:\/\//g, `:${ZW}//`).replace(/www\./gi, (m) => `${m.slice(0, 3)}${ZW}.`)
  .replace(/\[/g, '\\[').replace(/\]/g, '\\]')
  .replace(/\|/g, '\\|');
// Uma linha (célula de tabela, item de lista).
export const inline = (text) => neutralize(text).replace(/\r?\n+/g, ' ').trim();
// Code span com texto não confiável: sem ` nem \ que o fechem ou escapem.
export const codeSpan = (text) => `\`${String(text ?? '').replace(/[`\\\r\n]/g, "'")}\``;
// Bloco de código: nada de markdown é interpretado dentro; só não pode fechar a cerca.
export const fenced = (text, lang = '') =>
  ['~~~~' + lang, String(text ?? '').replace(/~{3,}/g, (m) => m.split('').join(ZW)), '~~~~'].join('\n');

export function github(env) {
  const api = async (path, init = {}) => {
    const res = await fetch(`${env.GITHUB_API_URL || 'https://api.github.com'}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    });
    if (!res.ok) throw Object.assign(new Error(`${init.method || 'GET'} ${path}: ${res.status} ${await res.text()}`), { status: res.status });
    return res.status === 204 ? null : res.json();
  };

  // Cria ou atualiza o ÚNICO comentário do bot com este marcador. Só o do próprio bot conta:
  // qualquer pessoa pode colar o marcador num comentário dela.
  async function upsertComment(issue, marker, body) {
    const base = `/repos/${env.REPO}/issues`;
    for (let page = 1; ; page++) {
      const comments = await api(`${base}/${issue}/comments?per_page=100&page=${page}`);
      const mine = comments.find((c) => c.user?.type === 'Bot' && c.user?.login === 'github-actions[bot]' && c.body?.includes(marker));
      if (mine) {
        const updated = await api(`${base}/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
        return { action: 'atualizado', url: updated.html_url };
      }
      if (comments.length < 100) break;
    }
    const created = await api(`${base}/${issue}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
    return { action: 'criado', url: created.html_url };
  }

  async function removeLabel(issue, name) {
    try {
      await api(`/repos/${env.REPO}/issues/${issue}/labels/${encodeURIComponent(name)}`, { method: 'DELETE' });
      return true;
    } catch (e) {
      if (e.status === 404) return false; // não estava aplicada
      throw e;
    }
  }

  return { api, upsertComment, removeLabel };
}
