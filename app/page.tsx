'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type AgentId = 'master' | 'leadgen' | 'sales' | 'insights' | 'marketing' | 'operations' | 'finance' | 'product';
interface Msg { id: string; role: 'user' | 'assistant'; text: string; time: string; }
interface Prospect { Name?: string; Company?: string; Status?: string; Priority?: string; [key: string]: any; }

const allAgentIds: AgentId[] = ['master', 'leadgen', 'sales', 'insights', 'marketing', 'operations', 'finance', 'product'];
const chatAgentIds: AgentId[] = ['leadgen', 'sales', 'insights', 'marketing', 'operations', 'finance', 'product'];

const masterPrompts = [
  "/brief today — Get a full executive briefing on all agent activity",
  "/trending — See what's working best right now across all agents",
  "/gap — Find bottlenecks in your conversion funnel",
  "/connect sales + marketing — See how these agents' insights overlap",
  "/expert How should I price the premium listing tier?",
  "/analyze onboarding across-team — Get all agents' perspective",
  "What should I focus on today? Give me my top 3 priorities.",
  "Are we on track for 50-80 onboardings? Show me the numbers.",
  "Which agent type is giving me the best ROI right now?",
  "What are the biggest risks to our 3-month plan?",
  "Show me a weekly scorecard — what metrics should I track?",
  "If I could only do ONE thing this week, what should it be?",
  "/connect leadgen + sales — Are we finding the right prospects?",
  "/connect operations + finance — When should I hire help?",
  "Give me a 30-60-90 day action plan with specific milestones."
];

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
  "I found these 5 prospects: 1. [Prospect A] - Developer 2. [Prospect B] - Broker 3. [Prospect C] - Architect 4. [Prospect D] - Designer 5. [Prospect E] - Consultant. Write personalized Instagram DMs for each.",
  "I have a list of 10 Scheme 78 developers. Analyze each one (pain points, fit with TNC). Write short Instagram DM for top 3 priority prospects.",
  "These 8 architects are my target. Analyze why each would benefit from designer credit on TNC. Write DMs highlighting that specific benefit.",
  "I found 12 premium brokers in Indore. Group them by: volume-focused vs quality-focused. Write DMs for quality-focused ones.",
  "Prospect said: 'Why should I trust a new platform?' How do I respond in a DM? Write a follow-up that addresses skepticism.",
  "Prospect replied: 'I'm already on 99acres and MagicBricks. What's different?' Write a DM response that positions TNC uniquely.",
  "No reply from these 3 prospects after 3 days. Write follow-up DMs with a different angle — focus on what they're missing.",
  "Prospect asked: 'How many buyers do you have?' Write a DM response that's honest about being early. Reframe as opportunity.",
  "These 5 prospects showed interest but didn't reply to next message. Write nurture DMs that add value (not sales).",
  "I want to feature one of our early supporters on Instagram. Write a DM asking them for an interview. Make it feel like an honor.",
  "Design a DM sequence (3 messages over 2 weeks) for cold outreach to architects. Intro → Value → CTA.",
  "These 6 prospects are warm (replied once, then went quiet). Write re-engagement DMs showing TNC's progress.",
  "Create a DM template I can customize for different prospect types: Developers, Brokers, Architects, Designers, Investors.",
  "I want to do a 'founding member' event with top 5 prospects. Write DMs inviting them. Make it feel exclusive.",
  "What's our competitive advantage vs 99acres, MagicBricks, Square Yards? Write a DM response for when prospects ask."
];

const insightsPrompts = [
  "Give me a full pipeline status report. How many prospects at each stage? Where are the bottlenecks?",
  "What's our conversion rate at each funnel stage? DM sent → Reply → Meeting → Onboarded. Where's the biggest drop?",
  "Which outreach channels are working best? Compare Instagram DMs vs referrals vs cold outreach.",
  "Are we on track for the 50-80 onboarding goal in 3 months? At current velocity, when will we hit it?",
  "Analyze our prospect data. Which TYPE of professional converts best? Should we shift our ICP focus?",
  "Give me a SWOT analysis of TNC right now. Be brutally honest.",
  "What are the top 3 risks to our 3-month plan? How do we mitigate each one?",
  "Compare TNC's growth to similar Indian startups at the same stage (CRED, Meesho, NoBroker).",
  "Which Indore neighborhoods are generating the most interest? Should we focus geographically?",
  "Give me a weekly scorecard template. What metrics should I track? What's green vs red?",
  "Analyze the quality of our founding members. Are we attracting the right caliber of professionals?",
  "What's the single most important thing I should do this week to move the needle?",
  "If you could redesign our outreach strategy from scratch, what would you change?",
  "What patterns do you see in prospects who say yes vs those who ghost?",
  "Create a 30-60-90 day plan for TNC with specific milestones and action items."
];

const marketingPrompts = [
  "Create a full Instagram content calendar for this week. 5 posts with captions, hashtags, and post type.",
  "Write 3 Instagram Reel scripts for property showcases. Architectural Digest quality, not 99acres.",
  "Design a 'Property of the Week' series format. How should we shoot it, caption it, and promote it?",
  "What Instagram hashtags should TNC use? Give me 30 hashtags in 3 tiers: high-volume, niche, branded.",
  "Plan a guerrilla marketing campaign for TNC with ₹0 budget. How do we create buzz?",
  "Create a brand voice guide for TNC. How should we sound? What words do we use vs avoid?",
  "Identify 10 Indore-based Instagram accounts we should collaborate with and why.",
  "Plan our Diwali campaign (peak real estate season). Content series and founding member specials.",
  "Write a compelling Instagram bio for @theneighbourhoodcollective.in. 150 characters, premium feel.",
  "Design a referral program for founding members. How do we incentivize them to bring others?",
  "What should our Instagram Stories strategy be? Daily plan: behind-the-scenes, polls, Q&As.",
  "Create a 'Neighbourhood Guide' series concept for Scheme 78. What should it include?",
  "How do we position TNC against 99acres and MagicBricks? Give me 3 positioning statements.",
  "Plan a launch event for TNC (virtual or in-person in Indore). Budget: ₹5k max.",
  "What metrics should I track weekly for Instagram growth? Give me a dashboard template."
];

const operationsPrompts = [
  "Design the perfect onboarding flow for a new founding member. Day 0 to Day 7 messages.",
  "How's our community health? What are the biggest risks to member satisfaction? How do we fix them?",
  "Plan a 'Member of the Week' spotlight program. Format, questions, how to feature on Instagram.",
  "Create a feedback survey for founding members. 5 key questions. Keep it short and genuine.",
  "Design a WhatsApp group strategy for founding members. How many groups? What rules?",
  "What should our member communication cadence be? Weekly updates? Monthly newsletters?",
  "Identify signs that a member is about to churn. Create an intervention playbook.",
  "Plan a virtual coffee chat for top 10 founding members. Format, ice-breakers, agenda.",
  "Create a member success framework. What does 'success' look like per professional type?",
  "How do we turn founding members into brand ambassadors? Design a program.",
  "Write welcome messages for 5 different professional types joining TNC.",
  "Create community guidelines for TNC. What behavior do we encourage? Keep it human.",
  "Plan a monthly community report to share with all members. What should it include?",
  "How do we handle negative feedback or complaints? Create a response framework.",
  "Design a member milestone celebration system. First listing, 10th listing, anniversaries."
];

const financePrompts = [
  "What's our current financial health? Break down expenses, revenue, burn rate, and runway.",
  "Should I spend money on Instagram ads? ROI analysis for ₹5k/month in ads.",
  "Are we on track for Phase 1 targets? 50-80 onboardings, ₹0-50k revenue forecast.",
  "Calculate our unit economics. What's our CAC right now? What should it be?",
  "Build a simple P&L statement for TNC's first 3 months.",
  "When should I start charging for listings? Find the optimal timing sweet spot.",
  "What pricing should I set for premium listings? Research competitors and Indore market.",
  "Do I need to register a company? LLP vs Pvt Ltd vs Proprietorship. Tax implications.",
  "Create a financial dashboard I should check weekly. 5 key health indicators.",
  "Should I hire someone? When does it make financial sense? First hire role and salary?",
  "What free tools should I use to save money? Free alternatives for CRM, email, analytics.",
  "If I wanted to raise funding in 6 months, what metrics do Indian angels want to see?",
  "Calculate the total addressable market for TNC in Indore. Revenue potential?",
  "What's the break-even point? How many paid listings per month to cover expenses?",
  "Create a 12-month financial projection. Conservative, moderate, optimistic scenarios."
];

const productPrompts = [
  "What should our product roadmap be for 3 months? Prioritize by impact vs effort.",
  "Can we build a property submission form this week? What fields? Design the flow.",
  "Should we add WhatsApp integration? How? What would the UX look like?",
  "Evaluate our tech stack (Next.js + Netlify + Google Sheets). What's working, what to change?",
  "Design the ideal property detail page. What info, what layout, what beats 99acres?",
  "When should we move from Google Sheets to a real database? Supabase vs Firebase vs Airtable.",
  "What SEO strategy should we implement? Keywords to target for Indore real estate?",
  "Should I build a mobile app? When? React Native vs Flutter vs PWA for our stage.",
  "Design a professional profile page for TNC members. Fields, layout, motivation to fill.",
  "What analytics should we implement? Google Analytics vs Vercel Analytics vs Mixpanel.",
  "How do we make the website faster for mobile users on slow 4G? Performance recommendations.",
  "Plan the 'Directory' feature. How should users browse professionals? Filters and search UX.",
  "What's our biggest technical debt? What breaks first at 10x scale? How to fix it?",
  "Evaluate AI features we could add. Property recommendations, buyer matching, market reports.",
  "If I could only build ONE feature this month, what should it be? Use ICE scoring."
];

const agents: Record<AgentId, { name: string; icon: string; title: string; desc: string; prompts: string[]; color?: string }> = {
  master: {
    name: 'Command Center', icon: '🎛️', title: 'Executive Dashboard', desc: 'Full team visibility, cross-agent intelligence & CEO briefings',
    prompts: masterPrompts, color: '#B8860B'
  },
  leadgen: { name: 'Lead Gen', icon: '✦', title: 'Head of Lead Generation', desc: 'Finds qualified real estate professionals in Indore', prompts: leadGenPrompts },
  sales: { name: 'Sales', icon: '✧', title: 'Head of Partnerships & Revenue', desc: 'Qualifies prospects & writes personalized Instagram DMs', prompts: salesPrompts },
  insights: { name: 'Insights', icon: '⟡', title: 'Strategic Advisor', desc: 'Analyzes funnel patterns & gives strategic advice', prompts: insightsPrompts },
  marketing: { name: 'Marketing', icon: '◆', title: 'Head of Growth & Marketing', desc: 'Builds brand awareness, content strategy & community', prompts: marketingPrompts },
  operations: { name: 'Operations', icon: '◇', title: 'Head of Ops & Community', desc: 'Manages onboarding, engagement & member success', prompts: operationsPrompts },
  finance: { name: 'Finance', icon: '▣', title: 'CFO & Analytics', desc: 'Tracks metrics, runway, unit economics & financial health', prompts: financePrompts },
  product: { name: 'Product', icon: '⬡', title: 'Head of Product & Tech', desc: 'Defines product roadmap & technical strategy', prompts: productPrompts },
};

// localStorage helpers
const STORAGE_KEY = 'tnc-agent-chats';
function saveChats(chats: Record<AgentId, Msg[]>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); } catch {}
}
function loadChats(): Record<AgentId, Msg[]> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function buildCrossAgentContext(chats: Record<AgentId, Msg[]>): string {
  const summaries: string[] = [];
  for (const id of chatAgentIds) {
    const msgs = chats[id];
    if (msgs.length === 0) continue;
    const recent = msgs.slice(-6);
    const agentName = agents[id].name;
    const lines = recent.map(m => `  ${m.role === 'user' ? 'Prasann' : agentName}: ${m.text.substring(0, 200)}${m.text.length > 200 ? '...' : ''}`).join('\n');
    summaries.push(`--- ${agentName} Agent (${msgs.length} messages) ---\n${lines}`);
  }
  return summaries.length > 0 ? summaries.join('\n\n') : 'No agent conversations yet. This is a fresh session.';
}

function initChats(): Record<AgentId, Msg[]> {
  const init: Record<string, Msg[]> = {};
  allAgentIds.forEach(id => { init[id] = []; });
  return init as Record<AgentId, Msg[]>;
}

function initIndices(): Record<AgentId, number> {
  const init: Record<string, number> = {};
  allAgentIds.forEach(id => { init[id] = 0; });
  return init as Record<AgentId, number>;
}

const themes = {
  light: {
    bg: '#FCFAF8', bgCard: '#FFFFFF', bgInput: '#FCFAF8', bgSidebar: '#FFFFFF',
    text: '#2D2D2D', textSoft: '#666', textMuted: '#888', textFaint: '#999',
    border: '#EAE1D9', primary: '#556A3E', master: '#B8860B',
    masterBg: '#FFFCF5', masterBadge: '#FFF3D0', masterInput: '#FFFDF7', masterInputBorder: '#E8D9A0',
    agentActiveBg: '#F6F8F3', agentBadgeBg: '#F0F4ED',
    promptBg: '#FFFFFF', promptBorder: '#e8e8e3', promptHover: '#efefea',
    refreshBg: '#F6F8F3',
    msgBotBg: '#FFFFFF', msgBotBorder: '#EAE1D9',
    copyBg: '#FCFAF8', copyBorder: '#EAE1D9',
    scrollThumb: '#EAE1D9',
    shortcutText: '#999',
  },
  dark: {
    bg: '#1A1A1F', bgCard: '#242429', bgInput: '#1E1E24', bgSidebar: '#1E1E24',
    text: '#E8E4DF', textSoft: '#A8A4A0', textMuted: '#787470', textFaint: '#585450',
    border: '#333338', primary: '#7FA668', master: '#D4A843',
    masterBg: '#22201A', masterBadge: '#332E1A', masterInput: '#22201A', masterInputBorder: '#4A4030',
    agentActiveBg: '#252A22', agentBadgeBg: '#2A3025',
    promptBg: '#242429', promptBorder: '#333338', promptHover: '#2E2E34',
    refreshBg: '#252A22',
    msgBotBg: '#242429', msgBotBorder: '#333338',
    copyBg: '#1E1E24', copyBorder: '#333338',
    scrollThumb: '#444448',
    shortcutText: '#585450',
  }
};

export default function AgentDashboard() {
  const [active, setActive] = useState<AgentId>('master');
  const [chats, setChats] = useState<Record<AgentId, Msg[]>>(initChats);
  const [promptIndices, setPromptIndices] = useState<Record<AgentId, number>>(initIndices);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [crm, setCrm] = useState<Prospect[]>([]);
  const [showCrm, setShowCrm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [dark, setDark] = useState(false);
  
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const a = agents[active];
  const msgs = chats[active];
  const currentPrompts = a.prompts;
  const currentIndex = promptIndices[active];
  const visiblePrompts = currentPrompts.slice(currentIndex, currentIndex + 4);
  const hasMorePrompts = currentPrompts.length > 4;

  const t = dark ? themes.dark : themes.light;
  const activeColor = active === 'master' ? t.master : t.primary;

  // Hydrate chats + theme from localStorage
  useEffect(() => {
    const saved = loadChats();
    if (saved) {
      const merged = initChats();
      for (const key of allAgentIds) {
        if (saved[key]) merged[key] = saved[key];
      }
      setChats(merged);
    }
    try { const th = localStorage.getItem('tnc-theme'); if (th === 'dark') setDark(true); } catch {}
    setHydrated(true);
  }, []);

  const toggleTheme = () => {
    setDark(prev => {
      const next = !prev;
      try { localStorage.setItem('tnc-theme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  };

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (hydrated) saveChats(chats);
  }, [chats, hydrated]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { inputRef.current?.focus(); }, [active]);
  
  const fetchCrm = async () => { try { const r = await fetch('/api/sheets'); const d = await r.json(); setCrm(d.rows || []); } catch { } };
  useEffect(() => { fetchCrm(); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 8) {
          e.preventDefault();
          setActive(allAgentIds[num - 1]);
        }
        if (e.key === 'k') {
          e.preventDefault();
          setChats(p => ({ ...p, [active]: [] }));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active]);
  
  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { id: 'u-' + Date.now(), role: 'user', text: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChats(p => ({ ...p, [active]: [...p[active], userMsg] }));
    setInput('');
    setLoading(true);
    try {
      const body: any = { message: text, agent: active, history: chats[active].map(m => ({ role: m.role, content: m.text })) };
      // For master agent, include cross-agent context
      if (active === 'master') {
        body.crossAgentContext = buildCrossAgentContext(chats);
      }
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      const botMsg: Msg = { id: 'a-' + Date.now(), role: 'assistant', text: d.response || d.error || 'No response received.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setChats(p => ({ ...p, [active]: [...p[active], botMsg] }));
      fetchCrm();
    } catch { 
      const errMsg: Msg = { id: 'e-' + Date.now(), role: 'assistant', text: 'Connection failed. Make sure the server is running.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }; 
      setChats(p => ({ ...p, [active]: [...p[active], errMsg] })); 
    } finally { setLoading(false); }
  }, [active, chats, loading]);
  
  const copyText = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  const clearChat = () => { setChats(p => ({ ...p, [active]: [] })); };

  // Count total messages across all agents for master dashboard
  const totalMessages = Object.values(chats).reduce((sum, msgs) => sum + msgs.length, 0);
  const activeAgentCount = chatAgentIds.filter(id => chats[id].length > 0).length;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .msg-anim { animation: fadeInUp 0.3s ease forwards; }
        .typing-pulse { animation: pulse 1.5s ease-in-out infinite; }
        .prompt-btn {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid ${t.promptBorder};
          background: ${t.promptBg};
          color: ${t.text};
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          flex: 1 1 calc(50% - 16px);
          min-width: 220px;
          line-height: 1.4;
        }
        .prompt-btn:hover { background: ${t.promptHover}; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,${dark ? '0.2' : '0.04'}); }
        .prompt-btn:active { transform: scale(0.98); }
        .refresh-btn {
          padding: 6px 14px;
          border-radius: 20px;
          background: ${t.refreshBg};
          border: 1px solid ${t.primary}30;
          color: ${t.primary};
          font-size: 11px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .refresh-btn:hover { background: ${t.primary}10; border-color: ${t.primary}; }
        * { box-sizing: border-box; }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 4px; }
        .agent-btn { transition: all 0.15s ease; }
        .agent-btn:hover { background: ${dark ? '#2A2A30' : '#F9F7F5'} !important; }
        .slash-cmd { color: ${t.master}; font-weight: 600; }
        .theme-toggle { padding: 4px 10px; border-radius: 20px; border: 1px solid ${t.border}; background: ${t.bgInput}; color: ${t.textSoft}; font-size: 14px; cursor: pointer; transition: all 0.2s ease; line-height: 1; }
        .theme-toggle:hover { background: ${t.promptHover}; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-full { width: 100% !important; }
          .prompt-btn { min-width: 100% !important; flex: 1 1 100% !important; }
        }
      `}} />
      <div style={{ display: 'flex', height: '100vh', background: t.bg, color: t.text, fontFamily: 'var(--font-montserrat), sans-serif', transition: 'background 0.3s ease, color 0.3s ease' }}>
        
        {/* LEFT SIDEBAR */}
        {sidebarOpen && (
          <div className="desktop-sidebar" style={{ width: 280, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', background: t.bgSidebar, flexShrink: 0, transition: 'background 0.3s ease' }}>
            <div style={{ padding: '24px 20px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 28, color: t.primary, lineHeight: 1 }}>TNC</div>
              <div style={{ fontSize: 9, color: t.textMuted, marginTop: 5, letterSpacing: 1.5, textTransform: 'uppercase' }}>Executive Team · {totalMessages} messages</div>
            </div>
            <div className="sidebar-scroll" style={{ padding: '6px 10px', flex: 1, overflowY: 'auto' }}>
              {allAgentIds.map((id, idx) => {
                const ag = agents[id];
                const isActive = active === id;
                const isMaster = id === 'master';
                const msgCount = chats[id].length;
                const accentColor = isMaster ? t.master : t.primary;
                return (
                  <div key={id}>
                    {isMaster && <div style={{ fontSize: 9, textTransform: 'uppercase', color: t.textMuted, letterSpacing: 2, padding: '8px 8px 4px', fontWeight: 500 }}>Command</div>}
                    {idx === 1 && <div style={{ fontSize: 9, textTransform: 'uppercase', color: t.textMuted, letterSpacing: 2, padding: '12px 8px 4px', fontWeight: 500, borderTop: `1px solid ${t.border}`, marginTop: 4 }}>The Team</div>}
                    <button 
                      className="agent-btn"
                      onClick={() => setActive(id)} 
                      style={{ 
                        width: '100%', padding: '9px 10px', margin: '1px 0', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, 
                        background: isActive ? (isMaster ? t.masterBg : t.agentActiveBg) : 'transparent', 
                        borderLeft: `3px solid ${isActive ? accentColor : 'transparent'}`,
                      }}>
                      <span style={{ fontSize: 15, color: isActive ? accentColor : t.textFaint, flexShrink: 0 }}>{ag.icon}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 15, color: isActive ? t.text : t.textSoft, fontStyle: isActive ? 'italic' : 'normal' }}>{ag.name}</div>
                        <div style={{ fontSize: 9, color: t.textFaint, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ag.title}</div>
                      </div>
                      {msgCount > 0 && <span style={{ fontSize: 9, background: isMaster ? t.masterBadge : t.agentBadgeBg, color: isMaster ? t.master : t.primary, padding: '2px 6px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>{msgCount}</span>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '8px 10px', borderTop: `1px solid ${t.border}`, fontSize: 9, color: t.shortcutText, textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}>⌘1-8 switch agents · ⌘K clear</div>
              <button onClick={() => { setShowCrm(!showCrm); if (!showCrm) fetchCrm(); }} style={{ width: '100%', padding: '8px', borderRadius: 6, border: `1px solid ${t.border}`, background: showCrm ? t.agentActiveBg : t.bgCard, color: t.textSoft, cursor: 'pointer', fontSize: 11, fontWeight: 500, transition: 'all 0.2s ease' }}>
                {showCrm ? 'Close CRM' : `View CRM (${crm.length})`}
              </button>
            </div>
          </div>
        )}

        {/* MAIN CHAT AREA */}
        <div className="mobile-full" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FCFAF8' }}>
          {/* HEADER */}
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active === 'master' ? t.masterBg : t.bgCard, transition: 'background 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 18, padding: 0 }}>☰</button>
              <span style={{ fontSize: 20, color: activeColor }}>{a.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 20, color: t.text, fontStyle: 'italic' }}>{a.name}</div>
                <div style={{ fontSize: 10, color: t.textMuted }}>{a.desc}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="theme-toggle" onClick={toggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? '☀️' : '🌙'}</button>
              {active === 'master' && activeAgentCount > 0 && (
                <span style={{ fontSize: 10, background: t.masterBadge, color: t.master, padding: '3px 10px', borderRadius: 12, fontWeight: 500 }}>{activeAgentCount}/7 agents active</span>
              )}
              {msgs.length > 0 && (
                <button onClick={clearChat} style={{ padding: '5px 12px', borderRadius: 4, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textSoft, fontSize: 10, cursor: 'pointer', transition: 'all 0.2s ease' }}>Clear</button>
              )}
            </div>
          </div>
          
          {/* MESSAGES */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {msgs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', gap: 20 }}>
                <div style={{ fontSize: 56, color: activeColor, opacity: 0.15 }}>{a.icon}</div>
                <div style={{ textAlign: 'center', maxWidth: 500 }}>
                  <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 28, color: t.text, marginBottom: 10 }}>
                    {active === 'master' ? 'Master Command Center' : `Speak with ${a.name}`}
                  </div>
                  <div style={{ fontSize: 13, color: t.textSoft, lineHeight: 1.6 }}>
                    {active === 'master' 
                      ? 'Your executive dashboard with full cross-agent visibility. Use slash commands like /brief, /trending, or /connect to unlock intelligence.'
                      : `${a.desc}. Try a suggestion below to begin.`
                    }
                  </div>
                  {active === 'master' && (
                    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {['/brief', '/trending', '/gap', '/connect', '/expert', '/analyze'].map(cmd => (
                        <span key={cmd} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: t.masterBadge, color: t.master, fontWeight: 600, fontFamily: 'monospace' }}>{cmd}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {msgs.map(m => (
                  <div key={m.id} className="msg-anim" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 5, margin: '0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>{m.role === 'user' ? 'Prasann' : a.name} <span style={{ opacity: 0.4, margin: '0 3px' }}>·</span> {m.time}</div>
                    <div style={{ 
                      position: 'relative', maxWidth: '85%', padding: '14px 18px', 
                      borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', 
                      background: m.role === 'user' ? activeColor : t.msgBotBg, 
                      border: m.role === 'user' ? 'none' : `1px solid ${t.msgBotBorder}`, 
                      fontSize: 13, lineHeight: 1.7, color: m.role === 'user' ? '#FFFFFF' : t.text, 
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      boxShadow: m.role === 'user' ? '0 2px 8px rgba(0,0,0,0.08)' : `0 1px 4px rgba(0,0,0,${dark ? '0.15' : '0.02'})`
                    }}>
                      {m.text}
                      {m.role === 'assistant' && (
                        <button onClick={() => copyText(m.text, m.id)} title="Copy response" style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 4, border: `1px solid ${t.copyBorder}`, background: t.copyBg, color: activeColor, fontSize: 10, cursor: 'pointer', transition: 'all 0.15s ease' }}>
                          {copied === m.id ? '✓' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && <div className="typing-pulse" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', color: activeColor, fontSize: 13, fontStyle: 'italic' }}><span>{a.icon}</span> {a.name} is thinking...</div>}
                <div ref={endRef} />
              </div>
            )}
          </div>
          
          {/* INPUT AREA */}
          <div style={{ padding: '16px 24px', background: active === 'master' ? t.masterBg : t.bgCard, borderTop: `1px solid ${t.border}`, transition: 'background 0.3s ease' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              
              {/* SUGGESTION CARDS */}
              {msgs.length === 0 && (
                <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: t.textSoft, letterSpacing: 1, textTransform: 'uppercase' }}>
                      {active === 'master' ? '🎛️ Commands & Queries' : '💡 Quick Suggestions'}
                    </div>
                    {hasMorePrompts && (
                      <button className="refresh-btn" onClick={() => {
                        setPromptIndices(prev => ({ ...prev, [active]: prev[active] + 4 >= currentPrompts.length ? 0 : prev[active] + 4 }));
                      }}>⟳ Refresh</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {visiblePrompts.map((p, i) => (
                      <button key={i} className="prompt-btn" onClick={() => setInput(p)} style={active === 'master' ? { borderColor: t.masterInputBorder, background: t.masterBg } : {}}>
                        {p.length > 85 ? p.substring(0, 82) + '...' : p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea 
                  ref={inputRef} value={input} onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} 
                  placeholder={active === 'master' ? 'Type a command (/brief, /trending...) or ask anything...' : `Message ${a.name}...`} rows={1}
                  style={{ flex: 1, padding: '12px 18px', borderRadius: 12, border: `1px solid ${active === 'master' ? t.masterInputBorder : t.border}`, background: active === 'master' ? t.masterInput : t.bgInput, color: t.text, fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', maxHeight: 150, lineHeight: 1.5, transition: 'border-color 0.2s ease' }} 
                />
                <button 
                  onClick={() => send(input)} disabled={loading || !input.trim()} 
                  style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: activeColor, color: '#FFFFFF', fontSize: 14, fontWeight: 500, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.5 : 1, transition: 'all 0.2s ease' }}>
                  {loading ? '...' : 'Send'}
                </button>
              </div>
              <div style={{ fontSize: 9, color: t.shortcutText, textAlign: 'center', marginTop: 8, letterSpacing: 0.5 }}>⇧Enter new line · Enter send · ⌘1-8 agents · ⌘K clear</div>
            </div>
          </div>
        </div>

        {/* RIGHT CRM SIDEBAR */}
        {showCrm && (
          <div className="desktop-sidebar" style={{ width: 300, borderLeft: `1px solid ${t.border}`, background: t.bg, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.bgCard, position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 18, color: t.text }}>CRM</div>
                <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{crm.length} Prospects</div>
              </div>
              <button onClick={fetchCrm} style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}`, background: t.bgInput, color: t.primary, fontSize: 10, cursor: 'pointer' }}>Sync</button>
            </div>
            <div style={{ padding: '10px' }}>
              {crm.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: t.textMuted, fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 36, marginBottom: 12, color: t.border }}>📭</div>
                  No prospects connected yet.
                </div>
              ) : crm.map((p, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: 6, border: `1px solid ${t.border}`, marginBottom: 8, background: t.bgCard, boxShadow: `0 1px 3px rgba(0,0,0,${dark ? '0.1' : '0.01'})` }}>
                  <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 15, color: t.text, marginBottom: 2 }}>{p.Name || 'Unknown'}</div>
                  {p.Company && <div style={{ fontSize: 10, color: t.textSoft, marginBottom: 8 }}>{p.Company}</div>}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.Status && <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, padding: '2px 6px', borderRadius: 12, background: t.agentActiveBg, color: t.primary, border: `1px solid ${t.primary}30` }}>{p.Status}</span>}
                    {p.Priority && <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, padding: '2px 6px', borderRadius: 12, background: p.Priority === 'HIGH' ? t.primary : t.promptBg, color: p.Priority === 'HIGH' ? '#FFF' : t.textSoft }}>{p.Priority}</span>}
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
