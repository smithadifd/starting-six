import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { getSyncCounts } from '@/lib/db/queries';

export async function GET() {
  const checks = { database: false, synced: false };
  try {
    const db = getDb();
    const result = db.get<{ ok: number }>(sql`SELECT 1 as ok`);
    checks.database = result?.ok === 1;

    const counts = getSyncCounts();
    checks.synced = counts.pokemon > 0;

    const healthy = checks.database;
    return NextResponse.json(
      { status: healthy ? 'healthy' : 'degraded', checks },
      { status: healthy ? 200 : 503 }
    );
  } catch {
    return NextResponse.json({ status: 'unhealthy', checks }, { status: 503 });
  }
}