import { NextResponse } from 'next/server';
import { DomainError, registerPageClick } from '@/lib/mutations';

/**
 * Clique no botão da presell.
 *
 * Precisa ser Route Handler (e não Server Action) porque a página pública é
 * consumida por visitantes anônimos e o retorno é o link do grupo.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, string | undefined>;

  try {
    const result = await registerPageClick(
      slug,
      body,
      request.headers.get('user-agent') ?? '',
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error inesperado.' }, { status: 500 });
  }
}
