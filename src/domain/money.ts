import type { Cents } from './types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** 450000 → "R$ 4.500,00" */
export function formatBRL(cents: Cents): string {
  // Intl usa NBSP entre "R$" e o número; normalizamos para espaço comum.
  return brl.format(cents / 100).replace(/ /g, ' ');
}

/**
 * Converte o texto digitado num input monetário em centavos.
 * Aceita "1.234,56", "1234,5", "1234" e "R$ 12,00". Retorna null se inválido.
 */
export function parseBRL(input: string): Cents | null {
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/**
 * Máscara "centavos primeiro" para inputs: cada dígito empurra da direita.
 * "1" → "0,01", "123" → "1,23", "123456" → "1.234,56"
 */
export function maskBRLInput(raw: string): { text: string; cents: Cents } {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
  const cents = digits ? Number(digits) : 0;
  const text = formatBRL(cents).replace(/^R\$\s?/, '');
  return { text, cents };
}
