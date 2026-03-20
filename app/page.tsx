'use client';
import { useState, useRef, useEffect } from 'react';

type AgentId = 'leadgen' | 'sales' | 'insights' | 'marketing' | 'operations' | 'finance' | 'product';
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
  "Give me a full pipeline status report. How many prospects at each stage? Where are the bottlenecks? What should I focus on this week?",
  "What's our conversion rate at each funnel stage? DM sent → Reply → Meeting → Onboarded. Which stage has the biggest drop-off and how do we fix it?",
  "Which outreach channels are working best? Compare Instagram DMs vs referrals vs cold outreach. Where should I double down?",
  "Are we on track for the 50-80 onboarding goal in 3 months? At current velocity, when will we hit it? What needs to change if we're behind?",
  "Analyze our prospect data. Which TYPE of professional (developer, broker, architect) converts best? Should we shift our ICP focus?",
  "Give me a SWOT analysis of TNC right now. Strengths, Weaknesses, Opportunities, Threats. Be brutally honest.",
  "What are the top 3 risks to our 3-month plan? How do we mitigate each one? Give me specific action items.",
  "Compare TNC's growth curve to similar Indian startups at the same stage (CRED, Meesho, NoBroker). Are we ahead or behind?",
  "Which Indore neighborhoods are generating the most interest? Should we focus our efforts geographically?",
  "Give me a weekly scorecard template I can fill in every Friday. What metrics should I track? What's green vs red?",
  "Analyze the quality of our founding members so far. Are we attracting the right caliber of professionals?",
  "What's the single most important thing I should do this week to move the needle? Just one thing, with full context on why.",
  "If you could redesign our outreach strategy from scratch, what would you change? Be creative and unconventional.",
  "What patterns do you see in prospects who say yes vs those who ghost? What can we learn?",
  "Create a 30-60-90 day plan for TNC. Specific milestones, metrics, and action items for each period."
];

const marketingPrompts = [
  "Create a full Instagram content calendar for this week. 5 posts with exact captions, hashtags, and post type (Reel/Carousel/Static). TNC brand voice.",
  "Write 3 Instagram Reel scripts for property showcases. Make them feel like Architectural Digest, not 99acres. Include hook, content, and CTA.",
  "Design a 'Property of the Week' series format. How should we shoot it, caption it, and promote it? Make professionals WANT to be featured.",
  "What Instagram hashtags should TNC be using? Give me 30 hashtags in 3 tiers: high-volume, medium-niche, and TNC-branded.",
  "Plan a guerrilla marketing campaign for TNC with ₹0 budget. How do we create buzz in Indore's real estate community without spending a rupee?",
  "Create a brand voice guide for TNC. How should we sound on Instagram? What words do we use and avoid? Give me 10 example captions.",
  "Identify 10 Indore-based Instagram accounts we should collaborate with. Food, lifestyle, architecture, design pages. Why each one and how to approach them.",
  "Plan our Diwali campaign (peak real estate season). Content series, special offers for founding members, festive property showcases.",
  "Write a compelling Instagram bio for @theneighbourhoodcollective.in. 150 characters, premium feel, clear value proposition.",
  "Design a referral program for founding members. How do we incentivize them to bring in other professionals? Make it feel exclusive, not MLM.",
  "What content should our Instagram Stories strategy be? Daily plan: behind-the-scenes, polls, Q&As, property sneak peeks. Be specific.",
  "Create a 'Neighbourhood Guide' series concept for Scheme 78. What should it include? Architecture, cafes, lifestyle, property trends.",
  "How do we position TNC against 99acres and MagicBricks in our marketing? What's our core messaging? Give me 3 positioning statements.",
  "Plan a launch event for TNC (virtual or in-person in Indore). Theme, agenda, invitees, promotion strategy. Budget: ₹5k max.",
  "What metrics should I track weekly for our Instagram growth? Give me a dashboard template with targets for followers, engagement, saves, DMs."
];

const operationsPrompts = [
  "Design the perfect onboarding flow for a new founding member. Day 0 to Day 7, what messages do they get? Make it feel personal and premium.",
  "How's our community health right now? Based on what you know, what are the biggest risks to member satisfaction? How do we fix them?",
  "Plan a 'Member of the Week' spotlight program. Format, questions to ask, how to feature them on Instagram, how to make them feel special.",
  "Create a feedback survey for founding members. 5 key questions that help us improve TNC. Keep it short, make it feel like we genuinely care.",
  "Design a WhatsApp group strategy for our founding members. How many groups? What rules? How do we keep conversations high-quality?",
  "What should our member communication cadence be? Weekly updates? Monthly newsletters? What goes in each one?",
  "Identify signs that a member is about to churn. What are the early warning signals? Create an intervention playbook for each signal.",
  "Plan a virtual coffee chat event for our top 10 founding members. Format, duration, ice-breakers, agenda. Make it feel premium, not like a Zoom call.",
  "Create a member success framework. What does 'success' look like for a developer vs a broker vs an architect on TNC? Different metrics for each.",
  "How do we turn founding members into brand ambassadors? Design a program that makes them WANT to advocate for TNC without being asked.",
  "Write welcome messages for 5 different professional types joining TNC. Developer, Broker, Architect, Designer, Consultant. Make each one specific to their world.",
  "Create a community guidelines document for TNC. What behavior do we encourage? What do we not tolerate? Keep it human, not corporate.",
  "Plan a monthly community report that we share with all members. What numbers, wins, and updates should it include? Make members feel proud to be part of TNC.",
  "How do we handle negative feedback or complaints from members? Create a response framework. Always make them feel heard.",
  "Design a member milestone celebration system. First listing, 10th listing, first inquiry received, 1-month anniversary. How do we celebrate each one?"
];

const financePrompts = [
  "What's our current financial health? Break down all expenses, revenue (if any), burn rate, and runway. Give me the honest picture.",
  "Should I spend money on Instagram ads right now? Do an ROI analysis. What would ₹5k/month in ads realistically return?",
  "Are we on track for our Phase 1 targets? 50-80 onboardings, ₹0-50k revenue. At current velocity, what's the forecast?",
  "Calculate our unit economics. What's our CAC (cost per onboarding) right now? What should it be? How do we improve it?",
  "Build a simple P&L (Profit & Loss) statement for TNC's first 3 months. What are all our costs vs potential revenue?",
  "When should I start charging for listings? What's the optimal timing? Too early kills growth, too late burns money. Find the sweet spot.",
  "What pricing should I set for premium listings? Research what 99acres, MagicBricks charge. What's TNC's pricing sweet spot for Indore market?",
  "Do I need to register a company for TNC? What's the cheapest legal structure? LLP vs Pvt Ltd vs Proprietorship. Tax implications.",
  "Create a financial dashboard I should check every week. What 5 numbers tell me if TNC is healthy or in trouble?",
  "Should I hire someone? When does it make financial sense? What role should be my first hire and at what Indore salary range?",
  "What free tools should I be using to save money? List all the free alternatives for CRM, email, analytics, design, hosting.",
  "If I wanted to raise funding in 6 months, what metrics would Indian angel investors want to see? What's the minimum traction needed?",
  "Calculate the total addressable market for TNC in Indore. How many premium professionals, how many transactions, what's the revenue potential?",
  "What's the break-even point for TNC? How many paid listings do I need per month to cover all expenses?",
  "Create a 12-month financial projection. Conservative, moderate, and optimistic scenarios. What does each path look like?"
];

const productPrompts = [
  "What should our product roadmap be for the next 3 months? Prioritize by impact. What builds moat vs what's nice-to-have?",
  "Can we build a property submission form this week? What fields do we need? How should it work? Design the flow.",
  "Should we add WhatsApp integration to the website? How? What would the user experience look like?",
  "Evaluate our current tech stack (Next.js + Netlify + Google Sheets). What's working, what's breaking, what should we change?",
  "Design the ideal property detail page. What information should it show? How should it look? What makes it better than 99acres?",
  "When should we move from Google Sheets to a real database? What are our options? Supabase vs Firebase vs Airtable. Pros/cons for our scale.",
  "What SEO strategy should we implement? What keywords should we target? How do we rank for 'premium property Indore'?",
  "Should I build a mobile app? When? React Native vs Flutter vs PWA. Give me the honest answer for our current stage.",
  "Design a professional profile page for TNC. What fields, what layout, what makes a broker want to fill it out completely?",
  "What analytics should we implement on the website? What events should we track? Google Analytics vs Vercel Analytics vs Mixpanel.",
  "How do we make the website faster for mobile users on slow 4G in India? Performance audit and specific recommendations.",
  "Plan the 'Directory' feature. How should users browse professionals? Filter by type, area, specialty. Design the search experience.",
  "What's our biggest technical debt right now? What will break first if we grow 10x? How do we fix it before it becomes a crisis?",
  "Evaluate AI features we could add to TNC. Property recommendations, buyer matching, automated market reports. What's feasible and valuable?",
  "If I could only build ONE new feature this month, what should it be? Use ICE scoring (Impact × Confidence × Ease). Show your work."
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
  marketing: {
    name: 'Marketing', icon: '◆', title: 'Head of Growth & Marketing', desc: 'Builds brand awareness, content strategy & community',
    prompts: marketingPrompts
  },
  operations: {
    name: 'Operations', icon: '◇', title: 'Head of Ops & Community', desc: 'Manages onboarding, engagement & member success',
    prompts: operationsPrompts
  },
  finance: {
    name: 'Finance', icon: '▣', title: 'CFO & Analytics', desc: 'Tracks metrics, runway, unit economics & financial health',
    prompts: financePrompts
  },
  product: {
    name: 'Product', icon: '⬡', title: 'Head of Product & Tech', desc: 'Defines product roadmap & technical strategy',
    prompts: productPrompts
  },
};

const allAgentIds: AgentId[] = ['leadgen', 'sales', 'insights', 'marketing', 'operations', 'finance', 'product'];

export default function AgentDashboard() {
  const [active, setActive] = useState<AgentId>('leadgen');
  const [chats, setChats] = useState<Record<AgentId, Msg[]>>(() => {
    const init: Record<string, Msg[]> = {};
    allAgentIds.forEach(id => { init[id] = []; });
    return init as Record<AgentId, Msg[]>;
  });
  const [promptIndices, setPromptIndices] = useState<Record<AgentId, number>>(() => {
    const init: Record<string, number> = {};
    allAgentIds.forEach(id => { init[id] = 0; });
    return init as Record<AgentId, number>;
  });
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
          line-height: 1.4;
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
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #EAE1D9; border-radius: 4px; }
      `}} />
      <div style={{ display: 'flex', height: '100vh', background: '#FCFAF8', color: '#2D2D2D', fontFamily: 'var(--font-montserrat), sans-serif' }}>
        
        {/* LEFT SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width: 280, borderRight: `1px solid ${BORDER_COLOR}`, display: 'flex', flexDirection: 'column', background: '#FFFFFF', flexShrink: 0 }}>
            <div style={{ padding: '28px 24px', borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 32, color: PRIMARY_COLOR, lineHeight: 1 }}>TNC</div>
              <div style={{ fontSize: 10, color: '#888', marginTop: 6, letterSpacing: 1.5, textTransform: 'uppercase' }}>Your Executive Team</div>
            </div>
            <div className="sidebar-scroll" style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#888', letterSpacing: 2, padding: '10px 8px 6px', fontWeight: 500 }}>The Team</div>
              {allAgentIds.map(id => {
                const ag = agents[id];
                const isActive = active === id;
                return (
                  <button 
                    key={id} onClick={() => setActive(id)} 
                    style={{ 
                      width: '100%', padding: '10px 12px', margin: '2px 0', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, 
                      background: isActive ? '#F6F8F3' : 'transparent', 
                      borderLeft: `3px solid ${isActive ? PRIMARY_COLOR : 'transparent'}`,
                      transition: 'all 0.2s ease'
                    }}>
                    <span style={{ fontSize: 16, color: isActive ? PRIMARY_COLOR : '#AAA', flexShrink: 0 }}>{ag.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 16, color: isActive ? '#2D2D2D' : '#666', fontStyle: isActive ? 'italic' : 'normal' }}>{ag.name}</div>
                      <div style={{ fontSize: 9, color: '#888', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ag.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ padding: '12px', borderTop: `1px solid ${BORDER_COLOR}` }}>
              <button onClick={() => { setShowCrm(!showCrm); if (!showCrm) fetchCrm(); }} style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${BORDER_COLOR}`, background: showCrm ? '#F6F8F3' : '#FFFFFF', color: '#444', cursor: 'pointer', fontSize: 11, fontWeight: 500, transition: 'all 0.2s ease' }}>
                {showCrm ? 'Close CRM' : `View CRM (${crm.length})`}
              </button>
            </div>
          </div>
        )}

        {/* MAIN CHAT AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FCFAF8' }}>
          <div style={{ padding: '16px 32px', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, padding: 0 }}>☰</button>
              <span style={{ fontSize: 22, color: PRIMARY_COLOR }}>{a.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 22, color: '#2D2D2D', fontStyle: 'italic' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{a.desc}</div>
              </div>
            </div>
            {msgs.length > 0 && (
              <button onClick={clearChat} style={{ padding: '5px 12px', borderRadius: 4, border: `1px solid ${BORDER_COLOR}`, background: '#FFFFFF', color: '#666', fontSize: 10, cursor: 'pointer', transition: 'all 0.2s ease' }}>Clear chat</button>
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
          
          <div style={{ padding: '20px 32px', background: '#FFFFFF', borderTop: `1px solid ${BORDER_COLOR}` }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              
              {/* SUGGESTION CARDS */}
              {msgs.length === 0 && (
                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>💡 Quick Suggestions</div>
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
              <div style={{ fontSize: 10, color: '#888', textAlign: 'center', marginTop: 10, letterSpacing: 0.5 }}>Shift+Enter for new line <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span> Enter to send</div>
            </div>
          </div>
        </div>

        {/* RIGHT CRM SIDEBAR */}
        {showCrm && (
          <div style={{ width: 320, borderLeft: `1px solid ${BORDER_COLOR}`, background: '#FCFAF8', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 20, color: '#2D2D2D' }}>CRM Directory</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 3 }}>{crm.length} Prospects Found</div>
              </div>
              <button onClick={fetchCrm} style={{ padding: '5px 10px', borderRadius: 4, border: `1px solid ${BORDER_COLOR}`, background: '#FCFAF8', color: PRIMARY_COLOR, fontSize: 11, cursor: 'pointer' }}>Sync</button>
            </div>
            <div style={{ padding: '12px' }}>
              {crm.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888', fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 40, marginBottom: 16, color: BORDER_COLOR }}>📭</div>
                  No prospects connected yet.
                </div>
              ) : crm.map((p, i) => (
                <div key={i} style={{ padding: '14px', borderRadius: 8, border: `1px solid ${BORDER_COLOR}`, marginBottom: 10, background: '#FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.015)' }}>
                  <div style={{ fontFamily: 'var(--font-instrument)', fontSize: 16, color: '#2D2D2D', marginBottom: 3 }}>{p.Name || 'Unknown Prospect'}</div>
                  {p.Company && <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>{p.Company}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.Status && <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, padding: '3px 8px', borderRadius: 20, background: '#F6F8F3', color: PRIMARY_COLOR, border: `1px solid ${PRIMARY_COLOR}30` }}>{p.Status}</span>}
                    {p.Priority && <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, padding: '3px 8px', borderRadius: 20, background: p.Priority === 'HIGH' ? PRIMARY_COLOR : '#F5F5F5', color: p.Priority === 'HIGH' ? '#FFF' : '#666', border: 'none' }}>{p.Priority} Priority</span>}
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
