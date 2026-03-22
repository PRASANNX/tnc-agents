'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- TYPES ---
type AgentId = 'master' | 'leadgen' | 'sales' | 'insights' | 'marketing' | 'operations' | 'finance' | 'product';

interface Msg {
  id: string;
  role: 'user' | 'assistant' | 'delegate' | 'system' | 'signal' | 'task-done';
  content: string;
  time: Date;
  from?: AgentId;
  title?: string;
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

interface CollabSignal {
  id: string;
  from: AgentId;
  to: AgentId;
  note: string;
  time: Date;
}

// --- CONSTANTS ---
const AGENTS: Record<AgentId, { icon: string; name: string; title: string; color: string }> = {
  master:     { icon: "🎛️", name: "Command Center", title: "Executive Brain",          color: "#c9a96e" },
  leadgen:    { icon: "✦", name: "Lead Gen",       title: "Head of Lead Generation",  color: "#7EB8A4" },
  sales:      { icon: "✧", name: "Sales",          title: "Head of Partnerships",     color: "#C9A96E" },
  insights:   { icon: "⟡", name: "Insights",       title: "Strategic Advisor",        color: "#8FA8C4" },
  marketing:  { icon: "◆", name: "Marketing",      title: "Head of Growth",           color: "#C48FA0" },
  operations: { icon: "◇", name: "Operations",     title: "Head of Ops & Community",  color: "#8FAAC4" },
  finance:    { icon: "▣", name: "Finance",         title: "CFO & Analytics",          color: "#8FC494" },
  product:    { icon: "⬡", name: "Product",         title: "Head of Product & Tech",   color: "#C4A87E" },
};

const SHARE_RULES: Record<string, AgentId[]> = {
  leadgen:    ["sales", "insights"],
  sales:      ["insights", "marketing"],
  insights:   ["sales", "marketing", "leadgen"],
  marketing:  ["sales", "operations"],
  finance:    ["sales", "product"],
  operations: ["sales"],
  product:    ["operations", "finance"],
};

const SLASH_COMMANDS: Record<string, string> = {
  "/brief":    "Give me a full executive briefing on TNC. Cover what each agent has worked on, key wins, gaps, and the single most important thing I should focus on today.",
  "/trending": "What's working or gaining traction right now — in outreach, content, prospect segments, or messaging?",
  "/gap":      "Where are we losing ground? Identify the biggest gaps in TNC's current operations.",
  "/status":   "Quick status check: tasks delegated, agents active, and pace toward Phase 1 goals.",
  "/sprint":   "Plan a focused 48h sprint for the relevant agents.",
};

const LAUNCH_DATE = new Date("2026-03-05");
const allAgentIds: AgentId[] = ['master', 'leadgen', 'sales', 'insights', 'marketing', 'operations', 'finance', 'product'];

// --- HELPERS ---
const getDaysSince = () => Math.floor((new Date().getTime() - LAUNCH_DATE.getTime()) / 86400000);
const getDateStr = () => new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const getTimeStr = (d: Date = new Date()) => d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

let _id = 0;
const uid = () => String(++_id);

export default function TNCCommandCenter() {
  // --- STATE ---
  const [activeChat, setActiveChat] = useState<AgentId>("master");
  const [chatHistories, setChatHistories] = useState<Record<string, Msg[]>>({
    master: [],
    ...Object.fromEntries(allAgentIds.filter(id => id !== 'master').map(id => [id, []]))
  });
  const [busyChats, setBusyChats] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [collab, setCollab] = useState<CollabSignal[]>([]);
  const [rightTab, setRightTab] = useState<"tasks" | "collab">("tasks");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCmd, setShowCmd] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isMaster = activeChat === "master";
  const isBusy = !!busyChats[activeChat];
  const currentMsgs = chatHistories[activeChat] || [];
  const currentAgent = isMaster ? null : AGENTS[activeChat];

  // --- EFFECTS ---
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistories, busyChats, activeChat]);

  useEffect(() => {
    setHydrated(true);
    const greetingMsg: Msg = {
      id: "0", role: "assistant", time: new Date(),
      content: `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Prasann.\n\n**Day ${getDaysSince()}.** All 7 agents on standby. What are we building today?`,
    };
    setChatHistories(p => ({
      ...p,
      master: [greetingMsg],
      ...Object.fromEntries(allAgentIds.filter(id => id !== 'master').map(id => {
         const a = AGENTS[id];
         return [id, [{
           id: uid(), role: "assistant", time: new Date(),
           content: `${a.icon} **${a.name}** — ${a.title}\n\nReady for your lead. What do you need?`
         }]];
      }))
    }));
  }, []);

  // --- API CALLS ---
  const callAgentAPI = async (agent: AgentId, message: string, history: any[] = [], isCollab: boolean = false, fromAgent?: AgentId) => {
    const timeContext = {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      days: getDaysSince(),
      weeks: Math.floor(getDaysSince() / 7),
      months: Math.floor(getDaysSince() / 30),
      phase: getDaysSince() < 90 ? 1 : getDaysSince() < 180 ? 2 : 3,
      progress: Math.min(100, Math.floor((getDaysSince() / 90) * 100))
    };
    
    let crossAgentContext = "";
    if (agent === 'master') {
      crossAgentContext = Object.entries(chatHistories)
        .filter(([id]) => id !== 'master')
        .map(([id, msgs]) => {
           const last = msgs.slice(-3);
           return `--- ${AGENTS[id as AgentId].name} ---\n${last.map(m => `${m.role === 'user' ? 'Prasann' : AGENTS[id as AgentId].name}: ${m.content}`).join('\n')}`;
        }).join('\n\n');
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message, 
        agent, 
        history, 
        crossAgentContext, 
        timeContext,
        isCollab,
        fromAgent
      }),
    });
    const data = await res.json();
    return data.response || "No response received.";
  };

  const runAgentCollab = async (finishedTask: AgentTask) => {
    const targets = SHARE_RULES[finishedTask.agent] || [];
    if (!finishedTask.result || !targets.length) return;
    
    for (const toId of targets) {
      try {
        const insight = await callAgentAPI(toId, finishedTask.result, [], true, finishedTask.agent);
        setCollab(p => [{ id: uid(), from: finishedTask.agent, to: toId, note: insight, time: new Date() }, ...p]);
        
        // Inject as signal in target chat
        const notif: Msg = { id: uid(), role: "signal", time: new Date(), from: finishedTask.agent, content: insight };
        setChatHistories(p => ({ ...p, [toId]: [...(p[toId] || []), notif] }));
      } catch (e) {}
    }
  };

  const runTask = async (task: AgentTask) => {
    try {
      const result = await callAgentAPI(task.agent, task.instruction);
      const finished = { ...task, status: "done" as const, result, doneAt: new Date() };
      setTasks(p => p.map(t => t.id === task.id ? finished : t));
      
      // Inject completion notification
      const notif: Msg = { id: uid(), role: "task-done", time: new Date(), title: task.title, content: result };
      setChatHistories(p => ({ ...p, [task.agent]: [...(p[task.agent] || []), notif] }));
      
      runAgentCollab(finished);
    } catch (e: any) {
      setTasks(p => p.map(t => t.id === task.id ? { ...t, status: "error", result: `Error: ${e.message}` } : t));
    }
  };

  const parseDelegate = (t: string) => {
    const closed = t.match(/\[\[DELEGATE\]\]([\s\S]*?)\[\[\/DELEGATE\]\]/);
    if (closed) {
      try { return JSON.parse(closed[1].trim()); } catch { return null; }
    }
    const open = t.match(/\[\[DELEGATE\]\]([\s\S]*?)$/);
    if (open) {
      let raw = open[1].trim();
      try { return JSON.parse(raw); } catch {
        const repaired = raw.replace(/,?\s*\{[^}]*$/, "").replace(/,?\s*$/, "") + "]}";
        try { return JSON.parse(repaired); } catch { return null; }
      }
    }
    return null;
  };

  const stripDelegate = (t: string) => t.replace(/\[\[DELEGATE\]\][\s\S]*?\[\[\/DELEGATE\]\]/g, "").replace(/\[\[DELEGATE\]\][\s\S]*/g, "").trim();

  const send = async (override?: string) => {
    const raw = (override || input).trim();
    if (!raw || isBusy) return;
    setInput("");
    setShowCmd(false);

    const userMsg: Msg = { id: uid(), role: "user", content: raw, time: new Date() };
    setChatHistories(p => ({ ...p, [activeChat]: [...(p[activeChat] || []), userMsg] }));
    setBusyChats(p => ({ ...p, [activeChat]: true }));

    try {
      const history = (chatHistories[activeChat] || []).filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }));
      const response = await callAgentAPI(activeChat, raw, history);
      
      if (isMaster) {
        const display = stripDelegate(response);
        if (display) {
          const botMsg: Msg = { id: uid(), role: "assistant", content: display, time: new Date() };
          setChatHistories(p => ({ ...p, master: [...(p.master || []), botMsg] }));
        }

        const del = parseDelegate(response);
        if (del?.tasks?.length) {
          const newTasks = del.tasks
            .filter((t: any) => AGENTS[t.agent as AgentId])
            .map((t: any) => ({
              id: `t${uid()}`,
              agent: t.agent as AgentId,
              title: t.title || "Task",
              instruction: t.instruction || t.title,
              status: "working" as const,
              result: null,
              startedAt: new Date(),
              doneAt: null,
            }));

          if (newTasks.length) {
            setTasks(p => [...newTasks, ...p]);
            const delegateMsg: Msg = { 
              id: uid(), 
              role: "delegate", 
              time: new Date(), 
              content: newTasks.map((t: any) => `${AGENTS[t.agent as AgentId].icon} ${AGENTS[t.agent as AgentId].name}`).join("  ·  ") 
            };
            setChatHistories(p => ({ ...p, master: [...(p.master || []), delegateMsg] }));
            setRightTab("tasks");
            newTasks.forEach((t: AgentTask) => runTask(t));
          }
        }
      } else {
        const botMsg: Msg = { id: uid(), role: "assistant", content: response, time: new Date() };
        setChatHistories(p => ({ ...p, [activeChat]: [...(p[activeChat] || []), botMsg] }));
      }
    } catch (e: any) {
      setChatHistories(p => ({ ...p, [activeChat]: [...(p[activeChat] || []), { id: uid(), role: "assistant", content: `Error: ${e.message}`, time: new Date() }] }));
    }
    setBusyChats(p => ({ ...p, [activeChat]: false }));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const fmt = (t: string) => {
    if (!t) return "";
    return t
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code style="background:#1a1a18;padding:1px 5px;border-radius:3px;font-size:.8em;font-family:monospace">$1</code>')
      .replace(/^## (.+)$/gm, '<div class="hd">$1</div>')
      .replace(/^### (.+)$/gm, '<div class="hd2">$1</div>')
      .replace(/^[-•] (.+)$/gm, '<div class="bl"><span class="dot">•</span><span>$1</span></div>')
      .replace(/^→ (.+)$/gm, '<div class="ar">→ $1</div>')
      .replace(/^(\d+)\. (.+)$/gm, '<div class="nl"><span class="num">$1.</span><span>$2</span></div>')
      .replace(/\n\n/g, '<div style="height:7px"></div>')
      .replace(/\n/g, "<br/>");
  };

  const working = tasks.filter(t => t.status === "working").length;
  const done = tasks.filter(t => t.status === "done").length;

  if (!hydrated) return <div style={{ background: "#0b0b09", height: "100vh" }} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b0b09", color: "#e4e0d8", overflow: "hidden", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1e1e1c; border-radius: 2px; }
        .hd  { display: block; font-size: .69rem; font-weight: 600; color: #c4a87e; letter-spacing: .1em; text-transform: uppercase; margin: 8px 0 3px; }
        .hd2 { display: block; font-size: .72rem; font-weight: 600; color: #a49880; margin: 6px 0 2px; }
        .bl  { display: block; padding: 2px 0; font-size: .84rem; line-height: 1.55; color: #aca8a0; }
        .dot { color: #404038; font-size: .5rem; margin-right: 6px; }
        .ar  { display: block; padding: 2px 0; font-size: .84rem; color: #c9a96e; }
        .nl  { display: block; padding: 2px 0; font-size: .84rem; color: #aca8a0; }
        .num { color: #585450; font-weight: 600; margin-right: 8px; }
        strong { color: #dedad2; font-weight: 600; }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes fadein { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
        .pulse  { animation: pulse 1.4s ease-in-out infinite; }
        .fadein { animation: fadein .3s ease; }
        textarea { resize: none; border: none; outline: none; background: transparent; color: #e4e0d8; font-family: 'Outfit', sans-serif; font-size: .85rem; line-height: 1.6; }
        textarea::placeholder { color: #3a3a36; }
        .agent-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; border: 1px solid transparent; background: transparent; text-align: left; }
        .agent-btn:hover { background: #131311 !important; }
        .agent-btn.active { background: #141412 !important; border: 1px solid #1e1e1c !important; }
        .qbtn { transition: all 0.2s; cursor: pointer; background: transparent; border: 1px solid #1c1c1a; border-radius: 24px; padding: 7px 14px; font-size: .75rem; color: #7a7670; }
        .qbtn:hover { background: #111110; border-color: #2e2e2c; color: #aca8a0; }
        .tc { cursor: pointer; transition: background 0.15s; }
        .tc:hover { background: #131311 !important; }
      `}</style>

      {/* ── LEFT SIDEBAR ────────────────────────────────── */}
      <aside style={{ width: 220, borderRight: "1px solid #161614", display: "flex", flexDirection: "column", background: "#0d0d0b", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid #161614" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: ".95rem", color: "#e4e0d8", lineHeight: 1.3, marginBottom: 4 }}>
            The Neighbourhood<br/>Collective
          </div>
          <div style={{ fontSize: ".6rem", color: "#363632", letterSpacing: ".1em", textTransform: "uppercase" }}>Day {getDaysSince()} · Phase {getDaysSince() < 90 ? 1 : 2}</div>
        </div>

        <div style={{ padding: "8px 8px 4px" }}>
          <button className={`agent-btn${isMaster ? " active" : ""}`} onClick={() => setActiveChat("master")}
            style={{ width: "100%", borderRadius: 6, padding: "8px 10px", borderLeft: isMaster ? "2px solid #c9a96e" : "2px solid transparent" }}>
            <div style={{ fontSize: ".58rem", color: "#c9a96e", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 1 }}>Active</div>
            <div style={{ fontSize: ".78rem", fontWeight: 600, color: isMaster ? "#dedad2" : "#6a6660" }}>🧠 Command Center</div>
          </button>
        </div>

        <div style={{ padding: "14px 16px 6px", fontSize: ".57rem", color: "#2a2a28", letterSpacing: ".1em", textTransform: "uppercase" }}>Team Standby</div>

        <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px" }}>
          {allAgentIds.filter(id => id !== 'master').map(id => {
            const a = AGENTS[id];
            const isActive = activeChat === id;
            const isWorking = tasks.some(t => t.agent === id && t.status === "working");
            return (
              <button key={id} className={`agent-btn${isActive ? " active" : ""}`} onClick={() => setActiveChat(id)}
                style={{ width: "100%", borderRadius: 6, padding: "8px 10px", marginBottom: 2, display: "flex", alignItems: "center", gap: 10, borderLeft: isActive ? `2px solid ${a.color}` : "2px solid transparent" }}>
                <span style={{ fontSize: ".85rem", color: a.color }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".8rem", color: isActive ? "#dedad2" : "#aca8a0", fontWeight: isActive ? 500 : 400 }}>{a.name}</div>
                  {isWorking && <div style={{ fontSize: ".55rem", color: a.color }} className="pulse">EXECUTING...</div>}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid #161614", padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div><div style={{ fontSize: ".85rem", fontWeight: 600, color: "#c9a96e" }}>{working}</div><div style={{ fontSize: ".58rem", color: "#363632" }}>working</div></div>
            <div><div style={{ fontSize: ".85rem", fontWeight: 600, color: "#7eb8a4" }}>{done}</div><div style={{ fontSize: ".58rem", color: "#363632" }}>done</div></div>
          </div>
        </div>
      </aside>

      {/* ── CENTER: MASTER CHAT ──────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRight: "1px solid #161614" }}>
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #161614", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: ".6rem", color: "#363632", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 1 }}>{isMaster ? "Strategic Orchestration" : currentAgent?.title}</div>
            <div style={{ fontSize: ".78rem", color: "#545450" }}>{isMaster ? getDateStr() : currentAgent?.name}</div>
          </div>
          {isMaster && working > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#131311", border: "1px solid #1c1c1a", padding: "6px 12px", borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a96e" }} className="pulse" />
              <span style={{ fontSize: ".68rem", color: "#c9a96e" }}>{working} agents active</span>
            </div>
          )}
        </div>

        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {currentMsgs.map(msg => {
            if (msg.role === "delegate") return (
              <div key={msg.id} className="fadein" style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ fontSize: ".68rem", color: "#565652", background: "#101010", border: "1px solid #181816", padding: "5px 16px", borderRadius: 24 }}>
                  Delegated → {msg.content}
                </div>
              </div>
            );

            if (msg.role === "signal") {
              const from = AGENTS[msg.from as AgentId];
              return (
                <div key={msg.id} className="fadein" style={{ background: "#0d0d0c", border: `1px solid #1a1a18`, borderLeft: `2px solid ${from?.color}60`, borderRadius: 7, padding: "12px 16px" }}>
                  <div style={{ fontSize: ".58rem", color: from?.color, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>
                    {from?.icon} Signal from {from?.name}
                  </div>
                  <div style={{ fontSize: ".82rem", color: "#8a8680", lineHeight: 1.6 }}>{msg.content}</div>
                </div>
              );
            }

            if (msg.role === "task-done") return (
              <div key={msg.id} className="fadein" style={{ background: "#0d0f0d", border: "1px solid #161a16", borderLeft: "2px solid #7eb8a460", borderRadius: 7, padding: "12px 16px" }}>
                <div style={{ fontSize: ".58rem", color: "#7eb8a4", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>
                  ✓ Task completed: {msg.title}
                </div>
                <div style={{ fontSize: ".82rem", color: "#7a7670", lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                  {msg.content}
                </div>
              </div>
            );

            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className="fadein" style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", maxWidth: "85%", alignSelf: isUser ? "flex-end" : "flex-start" }}>
                {!isUser && (
                  <div style={{ fontSize: ".58rem", color: "#363632", marginBottom: 4, letterSpacing: ".1em", textTransform: "uppercase" }}>{isMaster ? "Master Command" : currentAgent?.name}</div>
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
                  <div dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
                </div>
                <div style={{ fontSize: ".58rem", color: "#282826", marginTop: 4, padding: "0 4px" }}>{getTimeStr(msg.time)}</div>
              </div>
            );
          })}

          {isBusy && (
            <div className="fadein" style={{ alignSelf: "flex-start", background: "#111110", border: "1px solid #181816", borderRadius: "2px 12px 12px 12px", padding: "12px 18px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#363632", animation: `pulse 1s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          )}
        </div>

        {currentMsgs.length <= 1 && !isBusy && (
          <div style={{ padding: "0 24px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(isMaster
              ? ["What's the priority today?", "Let's plan a sprint", "Delegate tasks", "/brief"]
              : ["Write copy", "Find prospects", "Analyze trends"]
            ).map(q => (
              <button key={q} className="qbtn" onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        )}

        <div style={{ padding: "16px 24px 20px", borderTop: "1px solid #161614", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#101010", border: "1px solid #1a1a18", borderRadius: 12, padding: "10px 14px" }}>
            <textarea ref={inputRef} value={input} onChange={e => { setInput(e.target.value); setShowCmd(isMaster && e.target.value.startsWith("/")); }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={isMaster ? "Brainstorm with Command Center…" : `Brief ${currentAgent?.name}…`}
              rows={1} style={{ flex: 1 }} />
            <button onClick={() => send()} disabled={isBusy || !input.trim()}
              style={{
                background: isBusy || !input.trim() ? "#181816" : (isMaster ? "#c9a96e" : currentAgent?.color || "#c9a96e"),
                border: "none", borderRadius: 8, padding: "8px 18px",
                color: isBusy || !input.trim() ? "#383834" : "#0a0a08",
                fontSize: ".75rem", fontWeight: 600, cursor: isBusy || !input.trim() ? "not-allowed" : "pointer"
              }}>
              {isBusy ? "···" : "Send"}
            </button>
          </div>
        </div>
      </main>

      {/* ── RIGHT PANEL ───────────────────────────────────── */}
      <aside style={{ width: 280, borderLeft: "1px solid #161614", display: "flex", flexDirection: "column", background: "#0d0d0b", flexShrink: 0 }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #161614", display: "flex", gap: 20 }}>
          <button onClick={() => setRightTab("tasks")} style={{ background: "none", border: "none", borderBottom: `2px solid ${rightTab === "tasks" ? "#c9a96e" : "transparent"}`, padding: "0 0 10px", fontSize: ".72rem", color: rightTab === "tasks" ? "#c9a96e" : "#363632", fontWeight: 600 }}>TASKS</button>
          <button onClick={() => setRightTab("collab")} style={{ background: "none", border: "none", borderBottom: `2px solid ${rightTab === "collab" ? "#c9a96e" : "transparent"}`, padding: "0 0 10px", fontSize: ".72rem", color: rightTab === "collab" ? "#c9a96e" : "#363632", fontWeight: 600 }}>COLLAB</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {rightTab === "tasks" ? (
            tasks.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", opacity: .1, marginBottom: 16 }}>◌</div>
                <div style={{ fontSize: ".75rem", color: "#282826", lineHeight: 1.7 }}>No active scheduled tasks for the team.</div>
              </div>
            ) : tasks.map(task => {
              const ag = AGENTS[task.agent];
              const isExp = expanded === task.id;
              const sc = task.status === "done" ? "#7eb8a4" : task.status === "error" ? "#c47a7a" : ag?.color;
              return (
                <div key={task.id} className="tc fadein" onClick={() => setExpanded(isExp ? null : task.id)}
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
                  <div style={{ fontSize: ".62rem", color: "#363632" }}>{task.status === "working" ? `Executing...` : `Done at ${getTimeStr(task.doneAt!)}`}</div>
                  {isExp && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #181816", fontSize: ".72rem", color: "#888480", lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap" }}>
                      {task.result || "Agent is processing instruction..."}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            collab.map(c => (
              <div key={c.id} className="fadein" style={{ background: "#0e0e0c", border: "1px solid #161614", borderRadius: 8, padding: "12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: ".58rem", color: "#484440" }}>{AGENTS[c.from].name} → {AGENTS[c.to].name}</span>
                </div>
                <div style={{ fontSize: ".78rem", color: "#7a7670", lineHeight: 1.6 }}>{c.note}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
