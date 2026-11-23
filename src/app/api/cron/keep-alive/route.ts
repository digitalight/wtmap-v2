import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Never cache: every call must actually reach the database.
export const dynamic = 'force-dynamic';

// Called daily by Vercel Cron (see vercel.json) to stop Supabase pausing the
// project for inactivity. Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { count, error } = await supabase
    .from('water_towers')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('keep-alive: database ping failed', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, towers: count, at: new Date().toISOString() });
}
