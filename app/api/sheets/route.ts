import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
export async function GET() { try { const r = await getSheetData(); return NextResponse.json({ rows: r }); } catch (e: any) { return NextResponse.json({ rows: [], error: e.message }, { status: 500 }); } }
