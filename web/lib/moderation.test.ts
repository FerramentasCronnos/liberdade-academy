/**
 * Testes da triagem da comunidade: lista de termos, leitura da resposta da IA
 * e falha aberta. Rodar com `npm test` (node:test via tsx, sem dependências).
 * A chamada HTTP é sempre simulada: nada sai para o OpenRouter.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  classifyWithAI,
  describeReviewReason,
  needsReview,
  parseModerationVerdict,
  screenForReview,
} from './moderation';

/** fetch falso que devolve `content` como resposta do modelo e guarda as chamadas. */
function fakeFetch(content: string, init: { status?: number } = {}) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const impl = (async (url: string, req: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(req.body)) });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: init.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

/** fetch que nunca responde, só obedece ao AbortSignal (simula timeout). */
const hangingFetch = ((_url: string, req: RequestInit) =>
  new Promise((_resolve, reject) => {
    req.signal?.addEventListener('abort', () => reject(req.signal?.reason ?? new Error('aborted')));
  })) as unknown as typeof fetch;

describe('needsReview (lista de termos)', () => {
  it('mantém os termos antigos de reembolso', () => {
    assert.equal(needsReview('Quiero el REEMBOLSO ya').term, 'reembolso');
    assert.equal(needsReview('esto es una estafa').term, 'estafa');
  });

  it('pega as frases novas de falar mal da comunidade, sem acento e em maiúsculas', () => {
    for (const [text, term] of [
      ['Esto no sirve para nada', 'no sirve para nada'],
      ['NO FUNCIONA NADA de lo que enseñan', 'no funciona nada'],
      ['es una perdida de tiempo', 'pérdida de tiempo'],
      ['Es una pérdida de tiempo', 'pérdida de tiempo'],
      ['Hace 3 días que nadie responde', 'nadie responde'],
      ['nadie contesta en soporte', 'nadie contesta'],
      ['Me arrepiento de haber comprado', 'me arrepiento de haber comprado'],
      ['No lo compren!!', 'no lo compren'],
      ['chicos no compren esto', 'no compren'],
      ['todo esto es humo', 'es humo'],
      ['son unos vende humo', 'vende humo'],
      ['esto es una piramide', 'pirámide'],
      ['el curso es una basura', 'es una basura'],
    ] as const) {
      const result = needsReview(text);
      assert.equal(result.flagged, true, text);
      assert.equal(result.term, term, text);
    }
  });

  it('não segura dúvidas técnicas comuns nem depoimentos', () => {
    for (const text of [
      'El enlace de Amazon no funciona, ¿qué hago?',
      'el cupón no sirve en Shopee?',
      'Vendí 10 botes de basura esta semana 🎉',
      'Me pueden pasar el esquema de la campaña?',
      'Me arrepiento de no haber empezado antes, ¡primera venta!',
      'No me funciona el link del presell',
    ]) {
      assert.equal(needsReview(text).flagged, false, text);
    }
  });

  it('não casa pedaço de palavra', () => {
    assert.equal(needsReview('basurero automático').flagged, false);
  });
});

describe('parseModerationVerdict', () => {
  it('lê JSON puro', () => {
    assert.deepEqual(parseModerationVerdict('{"flag": true, "reason": "critica el soporte"}'), { flag: true, reason: 'critica el soporte' });
    assert.deepEqual(parseModerationVerdict('{"flag": false, "reason": "duda técnica"}'), { flag: false, reason: 'duda técnica' });
  });

  it('tolera cerca de código e texto em volta', () => {
    assert.deepEqual(parseModerationVerdict('```json\n{"flag": true, "reason": "sarcasmo"}\n```'), { flag: true, reason: 'sarcasmo' });
    assert.deepEqual(parseModerationVerdict('Claro: {"flag":false,"reason":""} listo'), { flag: false, reason: '' });
  });

  it('devolve null para formato inválido', () => {
    assert.equal(parseModerationVerdict(''), null);
    assert.equal(parseModerationVerdict('SI'), null);
    assert.equal(parseModerationVerdict('{"flag": "true", "reason": "x"}'), null);
    assert.equal(parseModerationVerdict('{"flag": tru'), null);
  });

  it('motivo ausente vira string vazia e motivo longo é cortado', () => {
    assert.deepEqual(parseModerationVerdict('{"flag": true}'), { flag: true, reason: '' });
    assert.equal(parseModerationVerdict(`{"flag": true, "reason": "${'a'.repeat(300)}"}`)!.reason.length, 120);
  });
});

describe('screenForReview (lista + IA)', () => {
  const saved = { ...process.env };
  const silence = console.error;
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    delete process.env.MODERATION_AI;
    delete process.env.OPENROUTER_MODERATION_MODEL;
    console.error = () => undefined; // os caminhos de erro logam de propósito
  });
  afterEach(() => {
    process.env = { ...saved };
    console.error = silence;
  });

  it('termo da lista vai direto para revisão, sem chamar a IA', async () => {
    const { impl, calls } = fakeFetch('{"flag": false, "reason": "x"}');
    const result = await screenForReview('quiero mi reembolso', { fetchImpl: impl });
    assert.deepEqual(result, { flagged: true, term: 'reembolso', source: 'keyword' });
    assert.equal(calls.length, 0);
  });

  it('IA marca: motivo vira "IA: ..."', async () => {
    const { impl, calls } = fakeFetch('{"flag": true, "reason": "critica el soporte"}');
    const result = await screenForReview('Qué gran ayuda la del soporte 🙃', { fetchImpl: impl, context: 'Mi duda' });
    assert.deepEqual(result, { flagged: true, term: 'IA: critica el soporte', source: 'ai' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(calls[0].body.model, 'anthropic/claude-haiku-5.5');
    assert.equal('temperature' in calls[0].body, false);
    const messages = calls[0].body.messages as Array<{ role: string; content: string }>;
    assert.match(messages[1].content, /Mi duda/);
  });

  it('IA marca sem motivo: usa um motivo padrão', async () => {
    const { impl } = fakeFetch('{"flag": true, "reason": ""}');
    const result = await screenForReview('texto ambiguo cualquiera', { fetchImpl: impl });
    assert.deepEqual(result, { flagged: true, term: 'IA: habla mal de la comunidad', source: 'ai' });
  });

  it('IA não marca: publica', async () => {
    const { impl } = fakeFetch('{"flag": false, "reason": "duda técnica"}');
    assert.deepEqual(await screenForReview('¿Cómo genero el enlace de Amazon?', { fetchImpl: impl }), { flagged: false });
  });

  it('respeita OPENROUTER_MODERATION_MODEL', async () => {
    process.env.OPENROUTER_MODERATION_MODEL = 'outro/modelo';
    const { impl, calls } = fakeFetch('{"flag": false, "reason": ""}');
    await screenForReview('una duda normal sobre tráfico', { fetchImpl: impl });
    assert.equal(calls[0].body.model, 'outro/modelo');
  });

  it('falha aberta: HTTP 500', async () => {
    const { impl } = fakeFetch('{"flag": true, "reason": "x"}', { status: 500 });
    assert.deepEqual(await screenForReview('nadie me ayuda acá', { fetchImpl: impl }), { flagged: false });
  });

  it('falha aberta: resposta fora do formato', async () => {
    const { impl } = fakeFetch('SI');
    assert.deepEqual(await screenForReview('texto cualquiera largo', { fetchImpl: impl }), { flagged: false });
  });

  it('falha aberta: fetch lança erro de rede', async () => {
    const impl = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    assert.deepEqual(await screenForReview('texto cualquiera largo', { fetchImpl: impl }), { flagged: false });
  });

  it('falha aberta: timeout', async () => {
    const started = Date.now();
    assert.deepEqual(await screenForReview('texto cualquiera largo', { fetchImpl: hangingFetch, timeoutMs: 50 }), { flagged: false });
    assert.ok(Date.now() - started < 2000);
  });

  it('timeout não salva termo da lista: termo sempre vai para revisão', async () => {
    const result = await screenForReview('esto es una estafa', { fetchImpl: hangingFetch, timeoutMs: 50 });
    assert.equal(result.flagged, true);
  });

  it('sem chave ou com MODERATION_AI=0: não chama a IA', async () => {
    const { impl, calls } = fakeFetch('{"flag": true, "reason": "x"}');
    delete process.env.OPENROUTER_API_KEY;
    assert.deepEqual(await screenForReview('texto cualquiera largo', { fetchImpl: impl }), { flagged: false });
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.MODERATION_AI = '0';
    assert.deepEqual(await screenForReview('texto cualquiera largo', { fetchImpl: impl }), { flagged: false });
    assert.equal(calls.length, 0);
  });

  it('texto curto demais (ou só anexo) não chama a IA', async () => {
    const { impl, calls } = fakeFetch('{"flag": true, "reason": "x"}');
    assert.deepEqual(await screenForReview('', { fetchImpl: impl }), { flagged: false });
    assert.deepEqual(await screenForReview('👍', { fetchImpl: impl }), { flagged: false });
    assert.equal(calls.length, 0);
  });

  it('classifyWithAI devolve null em erro', async () => {
    const { impl } = fakeFetch('', { status: 429 });
    assert.equal(await classifyWithAI('hola', { fetchImpl: impl }), null);
  });
});

describe('describeReviewReason', () => {
  it('formata termo, motivo da IA e retenção manual', () => {
    assert.equal(describeReviewReason('reembolso'), 'menciona “reembolso”');
    assert.equal(describeReviewReason('IA: critica el soporte'), 'IA: critica el soporte');
    assert.equal(describeReviewReason('retenida por el equipo'), 'retenida por el equipo');
  });
});
