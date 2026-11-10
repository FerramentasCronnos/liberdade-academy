import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, featuredForDay, shuffleForDay } from './daily-order';

const offers = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

test('dia no fuso de São Paulo', () => {
  // 02:00 UTC do dia 11 ainda é dia 10 em São Paulo
  assert.equal(dayKey(new Date('2026-11-11T02:00:00Z')), '2026-11-10');
});

test('2 Bank Offers do dia, em rodízio, todos passam pelo topo', () => {
  const seen = new Set<string>();
  for (let d = 10; d < 15; d++) {
    const picks = featuredForDay(offers, `2026-11-${d}`);
    assert.equal(picks.length, 2);
    assert.notEqual(picks[0], picks[1]);
    picks.forEach((p) => seen.add(p));
  }
  assert.equal(seen.size, offers.length);
  assert.notDeepEqual(featuredForDay(offers, '2026-11-10'), featuredForDay(offers, '2026-11-11'));
});

test('poucos Bank Offers: fixa os que tem', () => {
  assert.deepEqual(featuredForDay([{ id: 'x' }], '2026-11-10'), ['x']);
});

test('embaralhado estável no dia e diferente entre dias', () => {
  const list = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}` }));
  const today = shuffleForDay(list, '2026-11-10').map((p) => p.id);
  assert.deepEqual(shuffleForDay(list, '2026-11-10').map((p) => p.id), today);
  assert.notDeepEqual(shuffleForDay(list, '2026-11-11').map((p) => p.id), today);
  assert.equal(new Set(today).size, list.length);
});
