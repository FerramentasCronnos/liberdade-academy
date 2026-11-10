import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presellLinks } from './presell-link';

test('uma presell (formato antigo) e várias por tipo de tráfego (env nova)', () => {
  process.env.BANK_OFFERS_PRESELL_LINKS = JSON.stringify({ sodapeak: 'https://a', 'ayuno-plan': 'https://old' });
  process.env.BANK_OFFERS_PRESELL_LINKS_2 = JSON.stringify({ mva: { DR: 'https://dr', X1: 'https://x1' }, 'ayuno-plan': { DR: 'https://new' } });
  assert.deepEqual(presellLinks('sodapeak'), [{ label: '', url: 'https://a' }]);
  assert.deepEqual(presellLinks('mva'), [{ label: 'DR', url: 'https://dr' }, { label: 'X1', url: 'https://x1' }]);
  assert.deepEqual(presellLinks('ayuno-plan'), [{ label: 'DR', url: 'https://new' }]);
  assert.deepEqual(presellLinks('nada'), []);
});

test('env inválida não derruba a página', () => {
  process.env.BANK_OFFERS_PRESELL_LINKS = '{quebrado';
  process.env.BANK_OFFERS_PRESELL_LINKS_2 = '';
  assert.deepEqual(presellLinks('sodapeak'), []);
});
