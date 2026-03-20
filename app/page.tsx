'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- TYPES ---
type AgentId = 'master' | 'leadgen' | 'sales' | 'insights' | 'marketing' | 'operations' | 'finance' | 'product';

interface Msg {
  id: string;
  role: 'user' | 'assistant' | 'delegate' | 'system';
  content: string;
  time: Date;
}

interface Prospect {
  Name?: string;
  Company?: string;
  Status?: string;
  Priority?: string;
  [key: string]: any;
}

interface AgentTask {
  id: string;
  agent: AgentId;
  title: string;
  instruction: string;
  status: 'working' | 'done' | 'error';
  result: string | null;
  startedAt: Date;
  doneAt: Date | null;
}

interface AgentMessage {
  id: string;
  from: AgentId | 'master';
  to: AgentId | 'master' | 'all';
  timestamp: string;
  message: string;
}

// --- CONSTANTS ---
const AGENTS: Record<string, { icon: string; name: string; title: string; color: string; desc: string }> = {
  master:     { icon: "🎛️", name: "Command Center", title: "Executive Brain",          color: "#c9a96e", desc: "Full team visibility & strategic orchestration" },
  leadgen:    { icon: "✦", name: "Lead Gen",       title: "Head of Lead Generation",  color: "#7eb8a4", desc: "Finds and qualifies premium Indore prospects" },
  sales:      { icon: "✧", name: "Sales",          title: "Head of Partnerships",     color: "#c9a96e", desc: "Crafts DMs and converts founding members" },
  insights:   { icon: "⟡", name: "Insights",       title: "Strategic Advisor",        color: "#8fa8c4", desc: "Analyzes patterns and conversion metrics" },
  marketing:  { icon: "◆", name: "Marketing",      title: "Head of Growth",           color: "#c48fa0", desc: "Builds brand equity and content strategy" },
  operations: { icon: "◇", name: "Operations",     title: "Head of Ops",              color: "#8faac4", desc: "Designs onboarding and community flows" },
  finance:    { icon: "▣", name: "Finance",         title: "CFO & Analytics",          color: "#8fc494", desc: "Models economics and revenue growth" },
  product:    { icon: "⬡", name: "Product",         title: "Head of Product",          color: "#c4a87e", desc: "Evolves platform and technical roadmap" },
};

const LAUNCH_DATE = new Date("2026-03-05");
const allAgentIds: AgentId[] = ['master', 'leadgen', 'sales', 'insights', 'marketing', 'operations', 'finance', 'product'];

const QUICK_PROMPTS = [
  "What should we focus on today?",
  "Let's plan this week's priorities",
  "Start a lead generation sprint",
  "Delegate tasks to all 7 agents",
];

// --- HELPERS ---
const getDaysSince = () => Math.floor((new Date().getTime() - LAUNCH_DATE.getTime()) / 86400000);
const getTodayStr = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const tStr = (d: Date) => d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

export default function TNCCommandCenter() {
  // --- STATE ---
  const [active, setActive] = useState<AgentId>('master');
  const [msgs, setMsgs] = useState<Msg[]>([{
    id: '0', role: 'assistant',
    content: `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Prasann.\n\nAll 7 agents on standby. What are we working on today?`,
    time: new Date(),
  }]);
  // We keep track of individual agent chats separately for backend context
  const [chats, setChats] = useState<Record<AgentId, Msg[]>>({
    master: [], leadgen: [], sales: [], insights: [], marketing: [], operations: [], finance: [], product: []
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [collabMessages, setCollabMessages] = useState<AgentMessage[]>([]);
  const [crm, setCrm] = useState<Prospect[]>([]);
  const [showCrm, setShowCrm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dark, setDark] = useState(true); // Default to dark as requested by aesthetic
  
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    const fetchCrm = async () => { try { const r = await fetch('/api/sheets'); const d = await r.json(); setCrm(d.rows || []); } catch (e) {} };
    fetchCrm();
  }, []);

  // --- API CALLS ---
  const callAgentAPI = async (agent: AgentId, message: string, history: any[] = []) => {
    const timeContext = {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      days: getDaysSince(),
      weeks: Math.floor(getDaysSince() / 7),
      months: Math.floor(getDaysSince() / 30),
      phase: getDaysSince() < 90 ? 1 : getDaysSince() < 180 ? 2 : 3,
      progress: Math.min(100, Math.floor((getDaysSince() / 90) * 100))
    };
    
    // Cross-agent context for master
    let crossAgentContext = "";
    if (agent === 'master') {
      crossAgentContext = Object.entries(chats)
        .filter(([id]) => id !== 'master')
        .map(([id, msgs]) => {
           const last = msgs.slice(-3);
           return `--- ${AGENTS[id].name} ---\n${last.map(m => `${m.role === 'user' ? 'Prasann' : AGENTS[id].name}: ${m.content}`).join('\n')}`;
        }).join('\n\n');
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, agent, history, crossAgentContext, timeContext }),
    });
    const data = await res.json();
    return data.response || "No response received.";
  };

  const runAgentTask = async (task: AgentTask) => {
    try {
      const result = await callAgentAPI(task.agent, task.instruction);
      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: "done", result, doneAt: new Date() } : t));
      
      // Log to collaboration channel
      setCollabMessages(prev => [...prev, {
        id: 'c-' + Date.now(),
        from: task.agent,
        to: 'master',
        timestamp: tStr(new Date()),
        message: `Task Completed: ${task.title}`
      }]);
    } catch (e: any) {
      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: "error", result: `Error: ${e.message}` } : t));
    }
  };

  const parseDelegate = (t: string) => {
    const m = t.match(/\[\[DELEGATE\]\]([\s\S]*?)\[\[\/DELEGATE\]\]/);
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  };

  const stripDelegate = (t: string) => t.replace(/\[\[DELEGATE\]\][\s\S]*?\[\[\/DELEGATE\]\]/g, "").trim();

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    const userMsg: Msg = { id: Date.now().toString(), role: "user", content: text, time: new Date() };
    setMsgs(p => [...p, userMsg]);
    
    // Update master chat history
    const masterHistory = chats.master.map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await callAgentAPI('master', text, masterHistory);
      const display = stripDelegate(response);

      if (display) {
        const botMsg: Msg = { id: (Date.now() + 1).toString(), role: "assistant", content: display, time: new Date() };
        setMsgs(p => [...p, botMsg]);
        setChats(p => ({ ...p, master: [...p.master, userMsg, botMsg] }));
      }

      const del = parseDelegate(response);
      if (del?.tasks?.length) {
        const newTasks = del.tasks
          .filter((t: any) => AGENTS[t.agent])
          .map((t: any) => ({
            id: `t-${Date.now()}-${Math.random()}`,
            agent: t.agent as AgentId,
            title: t.title || "Task",
            instruction: t.instruction || "",
            status: "working" as const,
            result: null,
            startedAt: new Date(),
            doneAt: null,
          }));

        if (newTasks.length) {
          setTasks(p => [...newTasks, ...p]);
          setMsgs(p => [...p, {
            id: 'd-' + Date.now(),
            role: "delegate",
            content: `Delegated → ${newTasks.map((t: any) => `${AGENTS[t.agent as AgentId].icon} ${AGENTS[t.agent as AgentId].name}`).join("  ")}`,
            time: new Date(),
          }]);
          newTasks.forEach((t: AgentTask) => runAgentTask(t));
        }
      }
    } catch (e: any) {
      setMsgs(p => [...p, { id: 'err-' + Date.now(), role: "assistant", content: `Connection error: ${e.message}`, time: new Date() }]);
    }
    setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // --- RENDER HELPERS ---
  const formatMsg = (text: string) => {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^## (.+)$/gm, '<span class="hd">$1</span>')
      .replace(/^### (.+)$/gm, '<span class="hd2">$1</span>')
      .replace(/^[•\-\*] (.+)$/gm, '<span class="bl">• $1</span>')
      .replace(/^→ (.+)$/gm, '<span class="ar">→ $1</span>')
      .replace(/\n\n/g, '<span class="sp"></span>')
      .replace(/\n/g, "<br/>");
  };

  const workingN = tasks.filter(t => t.status === "working").length;
  const doneN = tasks.filter(t => t.status === "done").length;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b0b09", color: "#e4e0d8", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,500;1,400&family=JetBrains+Mono:wght@400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, div, span, textarea, button { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1e1e1c; border-radius: 2px; }
        .hd { display: block; font-size: .69rem; font-weight: 600; color: #c4a87e; letter-spacing: .1em; text-transform: uppercase; margin: 8px 0 3px; }
        .hd2 { display: block; font-size: .72rem; font-weight: 600; color: #a49880; margin: 6px 0 2px; }
        .bl { display: block; padding: 2px 0; font-size: .84rem; line-height: 1.55; }
        .ar { display: block; padding: 2px 0; font-size: .84rem; color: #c9a96e; }
        .sp { display: block; height: 7px; }
        strong { color: #dedad2; font-weight: 600; }
        .pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
        .tc { cursor: pointer; transition: background .15s; }
        .tc:hover { background: #131311 !important; }
        .qp { transition: all .15s; cursor: pointer; }
        .qp:hover { background: #1a1a18 !important; border-color: #2e2e2c !important; }
        .sbtn { transition: all .15s; }
        .sbtn:hover:not(:disabled) { filter: brightness(1.08); }
        textarea { resize: none; }
        textarea::placeholder { color: #3a3a36; }
      `}</style>

      {/* ── LEFT SIDEBAR ────────────────────────────────── */}
      <div style={{ width: 220, borderRight: "1px solid #161614", display: "flex", flexDirection: "column", background: "#0d0d0b", flexShrink: 0 }}>
        
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid #161614" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: ".95rem", color: "#e4e0d8", lineHeight: 1.3, marginBottom: 4 }}>
            The Neighbourhood<br/>Collective
          </div>
          <div style={{ fontSize: ".6rem", color: "#363632", letterSpacing: ".1em", textTransform: "uppercase" }}>
            Day {getDaysSince()} · Phase {getDaysSince() < 90 ? 1 : 2}
          </div>
        </div>

        <div style={{ padding: "8px 8px 4px" }}>
          <div style={{ background: "#141412", border: "1px solid #1e1e1c", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: ".58rem", color: "#c9a96e", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 1 }}>Active</div>
            <div style={{ fontSize: ".78rem", fontWeight: 600 }}>🧠 Command Center</div>
          </div>
        </div>

        <div style={{ padding: "14px 16px 6px", fontSize: ".57rem", color: "#2a2a28", letterSpacing: ".1em", textTransform: "uppercase" }}>Team Standby</div>

        <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px" }}>
          {allAgentIds.filter(id => id !== 'master').map(id => {
            const a = AGENTS[id];
            const isWorking = tasks.some(t => t.agent === id && t.status === "working");
            return (
              <div key={id} style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 10, borderRadius: 6, marginBottom: 2 }}>
                <span style={{ fontSize: ".85rem", color: a.color, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".8rem", color: "#aca8a0", fontWeight: 500 }}>{a.name}</div>
                  {isWorking && <div style={{ fontSize: ".55rem", color: a.color }} className="pulse">EXECUTING...</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px", borderTop: "1px solid #161614" }}>
          <button onClick={() => setShowCrm(!showCrm)} style={{ width: "100%", padding: "8px", borderRadius: 6, background: showCrm ? "#1c1c1a" : "transparent", border: "1px solid #1e1e1c", color: "#646460", fontSize: ".7rem", cursor: "pointer", transition: "all 0.2s" }}>
            {showCrm ? "Hide CRM" : `View CRM (${crm.length})`}
          </button>
        </div>
      </div>

      {/* ── CENTER: MASTER CHAT ──────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        <div style={{ padding: "14px 24px", borderBottom: "1px solid #161614", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: ".6rem", color: "#363632", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 1 }}>Strategic Orchestration</div>
            <div style={{ fontSize: ".78rem", color: "#545450" }}>{getTodayStr()}</div>
          </div>
          {workingN > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#131311", border: "1px solid #1c1c1a", padding: "6px 12px", borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a96e" }} className="pulse" />
              <span style={{ fontSize: ".68rem", color: "#c9a96e" }}>{workingN} agents active</span>
            </div>
          )}
        </div>

        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {msgs.map(msg => {
            if (msg.role === "delegate") return (
              <div key={msg.id} style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ fontSize: ".68rem", color: "#565652", background: "#101010", border: "1px solid #181816", padding: "5px 16px", borderRadius: 24 }}>
                  {msg.content}
                </div>
              </div>
            );
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", maxWidth: "85%", alignSelf: isUser ? "flex-end" : "flex-start" }}>
                {!isUser && (
                  <div style={{ fontSize: ".58rem", color: "#363632", marginBottom: 4, letterSpacing: ".1em", textTransform: "uppercase" }}>Master Command</div>
                )}
                <div style={{
                  background: isUser ? "#191917" : "#111110",
                  border: `1px solid ${isUser ? "#222220" : "#181816"}`,
                  borderRadius: isUser ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
                  padding: "12px 16px",
                  fontSize: ".85rem",
                  lineHeight: 1.7,
                  color: isUser ? "#b8b4ac" : "#d4d0c8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  boxShadow: isUser ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
                }}>
                  <div dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }} />
                </div>
                <div style={{ fontSize: ".58rem", color: "#282826", marginTop: 4, padding: "0 4px" }}>{tStr(msg.time)}</div>
              </div>
            );
          })}

          {busy && (
            <div style={{ alignSelf: "flex-start", background: "#111110", border: "1px solid #181816", borderRadius: "2px 12px 12px 12px", padding: "12px 18px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#363632", animation: `pulse 1s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          )}
        </div>

        {msgs.length <= 1 && !busy && (
          <div style={{ padding: "0 24px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_PROMPTS.map(qp => (
              <button key={qp} className="qp" onClick={() => send(qp)}
                style={{ background: "#111110", border: "1px solid #1c1c1a", borderRadius: 24, padding: "7px 14px", fontSize: ".75rem", color: "#7a7670", cursor: "pointer" }}>
                {qp}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: "16px 24px 20px", borderTop: "1px solid #161614", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#101010", border: "1px solid #1a1a18", borderRadius: 12, padding: "10px 14px" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Brainstorm with Command Center…"
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e4e0d8", fontSize: ".85rem", lineHeight: 1.6 }}
            />
            <button className="sbtn" onClick={() => send()} disabled={busy || !input.trim()}
              style={{ background: busy || !input.trim() ? "#181816" : "#c9a96e", border: "none", borderRadius: 8, padding: "8px 18px", color: busy || !input.trim() ? "#383834" : "#0a0a08", fontSize: ".75rem", fontWeight: 600, cursor: busy || !input.trim() ? "not-allowed" : "pointer", flexShrink: 0, letterSpacing: ".04em" }}>
              {busy ? "···" : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: TASK PANEL or CRM ───────────────────── */}
      <div style={{ width: 300, borderLeft: "1px solid #161614", display: "flex", flexDirection: "column", background: "#0d0d0b", flexShrink: 0 }}>

        {showCrm ? (
          <>
            <div style={{ padding: "16px", borderBottom: "1px solid #161614", flexShrink: 0 }}>
              <div style={{ fontSize: ".6rem", color: "#363632", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 2 }}>CRM Database</div>
              <div style={{ fontSize: ".85rem", color: "#646460" }}>{crm.length} Prospects</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
               {crm.map((p, i) => (
                 <div key={i} style={{ padding: "12px", border: "1px solid #161614", borderRadius: 8, background: "#0f0f0d", marginBottom: 8 }}>
                    <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#aca8a0" }}>{p.Name}</div>
                    <div style={{ fontSize: ".65rem", color: "#363632", marginTop: 4 }}>{p.Company || 'No Company'} · {p.Status || 'New'}</div>
                 </div>
               ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: "16px", borderBottom: "1px solid #161614", flexShrink: 0 }}>
              <div style={{ fontSize: ".6rem", color: "#363632", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 2 }}>Live Execution</div>
              <div style={{ fontSize: ".85rem", color: "#646460" }}>
                {tasks.length === 0 ? "No active tasks" : `${tasks.length} tasks scheduled`}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
              {tasks.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", opacity: .1, marginBottom: 16 }}>◌</div>
                  <div style={{ fontSize: ".75rem", color: "#282826", lineHeight: 1.7 }}>
                    Agree on a plan with Command Center to delegate work to the team.
                  </div>
                </div>
              ) : (
                tasks.map(task => {
                  const ag = AGENTS[task.agent];
                  const isExp = expanded === task.id;
                  const sc = task.status === "done" ? "#7eb8a4" : task.status === "error" ? "#c47a7a" : ag?.color || "#c9a96e";
                  return (
                    <div key={task.id} className="tc"
                      onClick={() => setExpanded(isExp ? null : task.id)}
                      style={{ background: "#0f0f0d", border: "1px solid #161614", borderLeft: `3px solid ${sc}`, borderRadius: 8, padding: "12px", marginBottom: 8 }}>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ color: ag?.color, fontSize: ".75rem" }}>{ag?.icon}</span>
                        <span style={{ fontSize: ".65rem", color: "#545450", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>{ag?.name}</span>
                        <div style={{ marginLeft: "auto" }}>
                          {task.status === "working" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc }} className="pulse" />}
                          {task.status === "done" && <span style={{ fontSize: ".7rem", color: sc }}>✓</span>}
                        </div>
                      </div>

                      <div style={{ fontSize: ".82rem", color: "#b8b4ac", fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>{task.title}</div>

                      <div style={{ fontSize: ".62rem", color: "#363632" }}>
                        {task.status === "working" ? `Executing...` : `Completed at ${tStr(task.doneAt!)}`}
                      </div>

                      {isExp && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #181816" }}>
                          <div style={{ fontSize: ".75rem", color: "#888480", lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap" }}>
                            {task.result || "Agent is processing instruction..."}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        <div style={{ borderTop: "1px solid #161614", padding: "12px 16px", display: "flex", gap: 20, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#c9a96e" }}>{workingN}</div>
            <div style={{ fontSize: ".58rem", color: "#363632" }}>working</div>
          </div>
          <div>
            <div style={{ fontSize: ".85rem", fontWeight: 600, color: "#7eb8a4" }}>{doneN}</div>
            <div style={{ fontSize: ".58rem", color: "#363632" }}>completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
