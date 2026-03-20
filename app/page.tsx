'use client';
import { useState, useRef, useEffect } from 'react';

type AgentId = 'leadgen' | 'sales' | 'insights';
interface Msg { id: string; role: 'user' | 'assistant'; text: string; time: string; }
interface Prospect { Name?: string; Company?: string; Status?: string; Priority?: string; [key: string]: any; }

const leadGenPrompts = [
  "Find 25 real estate agents in Indore with 5+ active listings. Who would benefit from TNC? Give me: name, company, why they fit, contact info, priority.",
  "Research architects like Navnirman Architect in Indore. Find 10 similar boutique architecture firms doing premium residential work. Why would they benefit from TNC's platform?",
  "Find boutique property developers in Scheme 78, Vijay Nagar, and Sapna Sangeeta. What projects are they working on? Why would they care about a curated platform?",
  "Identify 15 premium real estate brokers in Indore (5+ properties, quality-focused). Analyze their positioning. Which ones would be best fit for TNC?",
  "Find designers and interior architects in Indore working on premium residential projects. How would TNC's credit system help them? Give me 12 prospects.",
  "Research high-end property investors in Indore (₹1Cr+ portfolio). Would they benefit from a curated platform? Find 8 prospects.",
  "Find real estate consultants and advisors in Indore who focus on premium properties. How would TNC help them? Give me top 10.",
  "Identify boutique construction companies in Indore building premium residential. Would they partner with TNC? Find 15 prospects.",
  "What Instagram accounts in Indore focus on interior design, architecture, real estate? Could we partner with influencers/accounts for TNC? Give me 10 prospects.",
  "Research real estate education/coaching businesses in Indore. Would they recommend TNC to their students? Find 8 prospects.",
  "Find property management companies handling premium properties in Indore. Would they refer clients to TNC? Give me 12 prospects.",
  "Identify NGOs or community organizations in premium neighborhoods (Scheme 78, Vijay Nagar). Could we partner for community events on TNC? Find 10 prospects.",
  "Research developers outside Indore (Bhopal, Ujjain) doing premium residential. Should we expand TNC to them? Give me 15 prospects.",
  "Find commercial real estate professionals in Indore who also do residential. Could they bring projects to TNC? Find 8 prospects.",
  "What real estate tech startups or platforms exist in Indore? Could we partner with them? Give me 10 prospects."
];

const salesPrompts = [
  "I found these 5 prospects: 1. [Prospect A] - Developer 2. [Prospect B] - Broker 3. [Prospect C] - Architect 4. [Prospect D] - Designer 5. [Prospect E] - Consultant. Write personalized Instagram DMs for each. 3-4 sentences, conversational, no hype. Sign off as Prasann.",
  "I have a list of 10 Scheme 78 developers. Analyze each one (pain points, fit with TNC). Write short Instagram DM for top 3 priority prospects. Make them feel special, not generic.",
  "These 8 architects are my target. Analyze why each would benefit from designer credit on TNC. Write DMs highlighting that specific benefit. Personalize based on their portfolio style.",
  "I found 12 premium brokers in Indore. Group them by: volume-focused vs quality-focused. Write DMs for quality-focused ones (our audience). Emphasize visibility to serious buyers.",
  "Prospect said: 'Why should I trust a new platform?' How do I respond in a DM? Write a follow-up that addresses skepticism without over-promising.",
  "Prospect replied: 'I'm already on 99acres and MagicBricks. What's different?' Write a DM response that positions TNC uniquely. Be confident but honest.",
  "No reply from these 3 prospects after 3 days: [Prospect A], [Prospect B], [Prospect C]. Write follow-up DMs. Different angle - focus on what they're missing.",
  "Prospect asked: 'How many buyers do you have?' Write a DM response that's honest about being early. Reframe early-stage as opportunity.",
  "These 5 prospects showed interest but didn't reply to next message. Write nurture DMs that add value (not sales). Share a TNC insight that helps them.",
  "I want to feature one of our early supporters on Instagram. Write a DM asking [Prospect Name] for an interview. Make it feel like an honor, not a ask.",
  "Design a DM sequence (3 messages over 2 weeks) for cold outreach. Message 1: Intro (awareness) Message 2: Value add (consideration) Message 3: CTA (decision) For architects.",
  "These 6 prospects are warm (replied once, then went quiet). Write re-engagement DMs. Show progress: mention how many properties we've listed, community growth, etc.",
  "Create a DM template I can customize for different prospect types: Developers, Brokers, Architects, Designers, Investors. Highlight different TNC benefits. 3-4 sentences each.",
  "I want to do a 'founding member' event/call with top 5 prospects. Write DMs inviting them. Make it sound exclusive and valuable.",
  "What's our competitive advantage vs 99acres, MagicBricks, Square Yards? Write a DM response I can use when prospects ask. 3-4 sentences, confident but not arrogant."
];

const insightsPrompts = [
  'Pipeline status report', 
  "What's our conversion rate?", 
  'Which channels work best?', 
  'Are we on track for goals?'
];

const agents: Record<AgentId, { name: string; icon: string; title: string; desc: string; prompts: string[] }> = {
  leadgen: { 
    name: 'Lead Gen', icon: '✦', title: 'Head of Lead Generation', desc: 'Finds qualified real estate professionals in Indore', 
    prompts: leadGenPrompts 
  },
  sales: { 
    name: 'Sales', icon: '✧', title: 'Head of Partnerships & Revenue', desc: 'Qualifies prospects & writes personalized Instagram DMs', 
    prompts: salesPrompts 
  },
  insights: { 
    name: 'Insights', icon: '⟡', title: 'Strategic Advisor', desc: 'Analyzes funnel patterns & gives strategic advice', 
    prompts: insightsPrompts 
  },
};

export default function AgentDashboard() {
  const [active, setActive] = useState<AgentId>('leadgen');
  const [chats, setChats] = useState<Record<AgentId, Msg[]>>({ leadgen: [], sales: [], insights: [] });
  const [promptIndices, setPromptIndices] = useState<Record<AgentId, number>>({ leadgen: 0, sales: 0, insights: 0 });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [crm, setCrm] = useState<Prospect[]>([]);
  const [showCrm, setShowCrm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const a = agents[active];
  const msgs = chats[active];
  const currentPrompts = a.prompts;
  const currentIndex = promptIndices[active];
  const visiblePrompts = currentPrompts.slice(currentIndex, currentIndex + 4);
  const hasMorePrompts = currentPrompts.length > 4;

  const BORDER_COLOR = '#EAE1D9';
  const PRIMARY_COLOR = '#556A3E';

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { inputRef.current?.focus(); }, [active]);
  
  const fetchCrm = async () => { try { const r = await fetch('/api/sheets'); const d = await r.json(); setCrm(d.rows || []); } catch { } };
  useEffect(() => { fetchCrm(); }, []);
  
  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { id: 'u-' + Date.now(), role: 'user', text: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChats(p => ({ ...p, [active]: [...p[active], userMsg] }));
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, agent: active, history: chats[active].map(m => ({ role: m.role, content: m.text })) }) });
      const d = await r.json();
      const botMsg: Msg = { id: 'a-' + Date.now(), role: 'assistant', text: d.response || d.error || 'No response received.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setChats(p => ({ ...p, [active]: [...p[active], botMsg] }));
      fetchCrm();
    } catch { 
      const errMsg: Msg = { id: 'e-' + Date.now(), role: 'assistant', text: 'Connection failed. Make sure the server is running.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }; 
      setChats(p => ({ ...p, [active]: [...p[active], errMsg] })); 
    } finally { setLoading(false); }
  };
  
  const copyText = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  const clearChat = () => { setChats(p => ({ ...p, [active]: [] })); };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .prompt-btn {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #e8e8e3;
          background: #FFFFFF;
          color: #2D2D2D;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
          text-align: left;
          flex: 1 1 calc(50% - 16px);
          min-width: 250px;
          line-height: +1.4;
        }
        .prompt-btn:hover { background: #efefea; }
        .prompt-btn:active { transform: scale(0.98); }
        .refresh-btn {
          padding: 6px 14px;
          border-radius: 20px;
          background: #F6F8F3;
          border: 1px solid #556A3E30;
          color: #556A3E;
          font-size: 11px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .refresh-btn:hover { background: #556A3E10; border-color: #556A3E; }
        * { box-sizing: border-box; }
      `}} />
      <div style={{ display: 'flex', height: '100vh', background: '#FCFAF8', color: '#2D2D2D', fontFamily: 'var(--font-montserrat), sans-serif' }}>
        
        {/* LEFT SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width: 280, borderRight: `1px solid ${BORDER_COLOR}`, display: 'flex', flexDirection: 'column', background: '#FFFFFF', flexShrink: 0 }}>
            <div style={{ padding: '32px 24px', borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 32, color: PRIMARY_COLOR, lineHeight: 1 }}>TNC</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>Agent System</div>
            </div>
            <div style={{ padding: '16px', flex: 1 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', letterSpacing: 2, padding: '12px 8px 8px', fontWeight: 500 }}>The Team</div>
              {(Object.entries(agents) as [AgentId, typeof agents.leadgen][]).map(([id, ag]) => {
                const isActive = active === id;
                return (
                  <button 
                    key={id} onClick={() => setActive(id)} 
                    style={{ 
                      width: '100%', padding: '14px 16px', margin: '4px 0', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, 
                      background: isActive ? '#F6F8F3' : 'transparent', 
                      borderLeft: `3px solid ${isActive ? PRIMARY_COLOR : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}>
                    <span style={{ fontSize: 18, color: isActive ? PRIMARY_COLOR : '#AAA' }}>{ag.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 18, color: isActive ? '#2D2D2D' : '#666', fontStyle: isActive ? 'italic' : 'normal' }}>{ag.name}</div>
                      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{ag.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ padding: '16px', borderTop: `1px solid ${BORDER_COLOR}` }}>
              <button onClick={() => { setShowCrm(!showCrm); if (!showCrm) fetchCrm(); }} style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1px solid ${BORDER_COLOR}`, background: showCrm ? '#F6F8F3' : '#FFFFFF', color: '#444', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.2s ease' }}>
                {showCrm ? 'Close CRM' : `View CRM (${crm.length})`}
              </button>
            </div>
          </div>
        )}

        {/* MAIN CHAT AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FCFAF8' }}>
          <div style={{ padding: '20px 32px', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20, padding: 0 }}>☰</button>
              <span style={{ fontSize: 24, color: PRIMARY_COLOR }}>{a.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 24, color: '#2D2D2D', fontStyle: 'italic' }}>{a.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{a.desc}</div>
              </div>
            </div>
            {msgs.length > 0 && (
              <button onClick={clearChat} style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${BORDER_COLOR}`, background: '#FFFFFF', color: '#666', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s ease' }}>Clear chat</button>
            )}
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            {msgs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', gap: 24 }}>
                <div style={{ fontSize: 64, color: PRIMARY_COLOR, opacity: 0.2 }}>{a.icon}</div>
                <div style={{ textAlign: 'center', maxWidth: 460 }}>
                  <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 32, color: '#2D2D2D', marginBottom: 12 }}>Speak with {a.name}</div>
                  <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{a.desc}. Try a suggestion below to begin.</div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {msgs.map(m => (
                  <div key={m.id} style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6, margin: '0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>{m.role === 'user' ? 'Prasann' : a.name} <span style={{ opacity: 0.5, margin: '0 4px' }}>|</span> {m.time}</div>
                    <div style={{ 
                      position: 'relative', maxWidth: '85%', padding: '16px 20px', 
                      borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
                      background: m.role === 'user' ? PRIMARY_COLOR : '#FFFFFF', 
                      border: m.role === 'user' ? `1px solid ${PRIMARY_COLOR}` : `1px solid ${BORDER_COLOR}`, 
                      fontSize: 14, lineHeight: 1.7, color: m.role === 'user' ? '#FFFFFF' : '#333', 
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                    }}>
                      {m.text}
                      {m.role === 'assistant' && (
                        <button onClick={() => copyText(m.text, m.id)} title="Copy response" style={{ position: 'absolute', top: 12, right: 12, padding: '4px 8px', borderRadius: 4, border: `1px solid ${BORDER_COLOR}`, background: '#FCFAF8', color: PRIMARY_COLOR, fontSize: 10, cursor: 'pointer' }}>
                          {copied === m.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', color: PRIMARY_COLOR, fontSize: 13, fontStyle: 'italic' }}><span>{a.icon}</span> {a.name} is typing...</div>}
                <div ref={endRef} />
              </div>
            )}
          </div>
          
          <div style={{ padding: '24px 32px', background: '#FFFFFF', borderTop: `1px solid ${BORDER_COLOR}` }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              
              {/* SUGGESTION CARDS */}
              {msgs.length === 0 && (
                <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>💡 Quick Suggestions</div>
                    {hasMorePrompts && (
                      <button 
                        className="refresh-btn"
                        onClick={() => {
                          setPromptIndices(prev => ({
                            ...prev,
                            [active]: prev[active] + 4 >= currentPrompts.length ? 0 : prev[active] + 4
                          }));
                        }}
                      >⟳ Refresh</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {visiblePrompts.map((p, i) => (
                      <button key={i} className="prompt-btn" onClick={() => setInput(p)}>
                        {p.length > 80 ? p.substring(0, 77) + '...' : p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <textarea 
                  ref={inputRef} value={input} onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} 
                  placeholder={`Message ${a.name}...`} rows={1} 
                  style={{ flex: 1, padding: '14px 20px', borderRadius: 12, border: `1px solid ${BORDER_COLOR}`, background: '#FCFAF8', color: '#2D2D2D', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', maxHeight: 150, lineHeight: 1.5, transition: 'border-color 0.2s ease' }} 
                />
                <button 
                  onClick={() => send(input)} disabled={loading || !input.trim()} 
                  style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: PRIMARY_COLOR, color: '#FFFFFF', fontSize: 14, fontWeight: 500, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                  {loading ? '...' : 'Send'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 12, letterSpacing: 0.5 }}>Shift+Enter for new line <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span> Enter to send</div>
            </div>
          </div>
        </div>

        {/* RIGHT CRM SIDEBAR */}
        {showCrm && (
          <div style={{ width: 320, borderLeft: `1px solid ${BORDER_COLOR}`, background: '#FCFAF8', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 22, color: '#2D2D2D' }}>CRM Directory</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{crm.length} Prospects Found</div>
              </div>
              <button onClick={fetchCrm} style={{ padding: '6px 10px', borderRadius: 4, border: `1px solid ${BORDER_COLOR}`, background: '#FCFAF8', color: PRIMARY_COLOR, fontSize: 12, cursor: 'pointer' }}>Sync</button>
            </div>
            <div style={{ padding: '16px' }}>
              {crm.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888', fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 40, marginBottom: 16, color: BORDER_COLOR }}>📭</div>
                  No prospects connected yet.
                </div>
              ) : crm.map((p, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: 8, border: `1px solid ${BORDER_COLOR}`, marginBottom: 12, background: '#FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.015)' }}>
                  <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 18, color: '#2D2D2D', marginBottom: 4 }}>{p.Name || 'Unknown Prospect'}</div>
                  {p.Company && <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>{p.Company}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {p.Status && <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 10px', borderRadius: 20, background: '#F6F8F3', color: PRIMARY_COLOR, border: `1px solid ${PRIMARY_COLOR}30` }}>{p.Status}</span>}
                    {p.Priority && <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 10px', borderRadius: 20, background: p.Priority === 'HIGH' ? PRIMARY_COLOR : '#F5F5F5', color: p.Priority === 'HIGH' ? '#FFF' : '#666', border: 'none' }}>{p.Priority} Protocol</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
