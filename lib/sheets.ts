import { google } from 'googleapis';
const SID = '1FgGtBqS7xoUU5KO4Xyio091MFcAlqyw8nKQy4omNoe0', SN = 'Sheet1';
async function getAuth() { return new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!), scopes: ['https://www.googleapis.com/auth/spreadsheets'] }); }
export async function getSheetData(): Promise<Record<string, string>[]> { try { const s = google.sheets({ version: 'v4', auth: await getAuth() }), r = await s.spreadsheets.values.get({ spreadsheetId: SID, range: SN + '!A:Z' }), rows = r.data.values || []; if (rows.length <= 1) return []; const h = rows[0]; return rows.slice(1).map(row => { const o: Record<string, string> = {}; h.forEach((hh: string, i: number) => { o[hh] = row[i] || ''; }); return o; }); } catch { return []; } }
export async function addProspect(p: Record<string, string>) {}
