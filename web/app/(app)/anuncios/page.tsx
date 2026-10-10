import { redirect } from 'next/navigation';

/** O Baúl de Anuncios saiu do menu em 2026-10-10; o Bank Offers o substitui. */
export default function AdsPage() {
  redirect('/bank-offers');
}
