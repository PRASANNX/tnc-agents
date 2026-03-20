import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getSystemPrompt } from '@/lib/system-prompt';
import { getSheetData } from '@/lib/sheets';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { message, agent, history } = await req.json();
    
    let crmData: any[] = [];
    try {
      crmData = await getSheetData();
    } catch {}
    
    const systemPrompt = getSystemPrompt(agent, crmData);
    
    let fullPrompt = systemPrompt + "\n\n=== CONVERSATION ===\n";
    
    for (const msg of history) {
      fullPrompt += `\n${msg.role === 'user' ? 'Prasann' : 'Agent'}: ${msg.content}`;
    }
    
    fullPrompt += `\n\nPrasann: ${message}\n\nAgent:`;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();
    
    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { response: '⚠️ Error: ' + error.message },
      { status: 500 }
    );
  }
}
