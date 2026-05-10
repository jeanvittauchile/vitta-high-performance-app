import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM = 'https://exercisedb.dev/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const search = request.nextUrl.search;
  const upstreamUrl = `${UPSTREAM}/${path.join('/')}${search}`;

  try {
    const res = await fetch(upstreamUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `ExerciseDB returned ${res.status}`, upstream: upstreamUrl, body: text.slice(0, 500) },
        { status: res.status }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Proxy fetch failed', detail: message, upstream: upstreamUrl },
      { status: 502 }
    );
  }
}
