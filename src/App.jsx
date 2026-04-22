import { useState, useEffect } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ADMIN_EMAIL     = "shabs@opstelservices.co.uk";
const ADMIN_PASSWORD  = "HallGreen2026!";
const WARD_NAME       = "Hall Green & Moseley";
const CURRENT_QUARTER = "Q2 2026";
const QUARTER_END     = "30 June 2026";
const NEXT_WINDOW     = "1 July 2026";
const RESPONSE_TARGET = 500;

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://mrkkyecgxdwgpyrozija.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya2t5ZWNneGR3Z3B5cm96aWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTM0NTIsImV4cCI6MjA5MjM4OTQ1Mn0.5UB3KSQZqPlf5dA4V1zok1v2BlwYy0gKYC9_Tig_EQE";

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Supabase error:", err);
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function dbGet(table, query = "") {
  return await sb(`${table}?${query}`);
}

async function dbInsert(table, data) {
  return await sb(table, { method: "POST", body: JSON.stringify(data) });
}

async function dbUpdate(table, query, data) {
  return await sb(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(data), prefer: "return=representation" });
}

async function dbUpsert(table, data, onConflict) {
  return await sb(`${table}`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Prefer": `resolution=merge-duplicates,return=representation` },
  });
}

// ─── VALID POSTCODES ──────────────────────────────────────────────────────────
const VALID_AREAS = ["B13","B14","B28"];
const VALID_DISTRICTS = [
  "B13 0","B13 8","B13 9",
  "B14 4","B14 5","B14 6","B14 7",
  "B28 0","B28 8","B28 9",
  "B11 3","B11 4","B12 9",
];
function normalisePC(raw) { return raw.toUpperCase().replace(/\s+/," ").trim(); }
function validatePostcode(raw) {
  const pc = normalisePC(raw);
  if (VALID_DISTRICTS.some(d => pc.startsWith(d))) return true;
  const area = pc.match(/^([A-Z]+\d+)/)?.[1];
  return VALID_AREAS.includes(area);
}

// ─── DEFAULT ISSUES ───────────────────────────────────────────────────────────
const DEFAULT_ISSUES = [
  { id:"1",  icon:"🚦", title:"Road safety & traffic calming",    desc:"Speeding, dangerous junctions, pedestrian crossings",        active:true },
  { id:"2",  icon:"🗑️", title:"Fly-tipping & street cleanliness", desc:"Illegal dumping, litter, overflowing bins",                  active:true },
  { id:"3",  icon:"🏘️", title:"Housing affordability",            desc:"Rents, social housing waiting lists, homelessness",          active:true },
  { id:"4",  icon:"🌳", title:"Green spaces & parks",             desc:"Maintenance, access, biodiversity, new plantings",           active:true },
  { id:"5",  icon:"🚌", title:"Public transport links",           desc:"Bus frequency, routes, reliability, cycling infrastructure", active:true },
  { id:"6",  icon:"👮", title:"Anti-social behaviour & crime",    desc:"Burglary, drug dealing, youth crime, CCTV",                  active:true },
  { id:"7",  icon:"🏫", title:"School places & education",        desc:"Capacity, quality, SEND provision, catchment areas",         active:true },
  { id:"8",  icon:"🏥", title:"NHS & GP access",                  desc:"Appointment waiting times, surgery closures, mental health", active:true },
  { id:"9",  icon:"🌡️", title:"Air quality & pollution",          desc:"Idling vehicles, industrial emissions, monitoring",          active:true },
  { id:"10", icon:"💡", title:"Street lighting",                  desc:"Broken lights, safety after dark, energy efficiency",        active:true },
  { id:"11", icon:"🧓", title:"Support for older residents",      desc:"Social isolation, care provision, accessible services",      active:true },
  { id:"12", icon:"🧒", title:"Youth services & activities",      desc:"Youth clubs, sports facilities, after-school provision",     active:true },
  { id:"13", icon:"♻️", title:"Recycling & climate action",       desc:"Collection services, sustainability targets, net zero",      active:true },
  { id:"14", icon:"🏗️", title:"Planning & development",           desc:"New buildings, heritage protection, consultation process",   active:true },
  { id:"15", icon:"💼", title:"Local economy & jobs",             desc:"High street vacancy, business support, employment schemes",  active:true },
];

// ─── EMAIL LOGGER ─────────────────────────────────────────────────────────────
async function logEmail({ to, subject, body }) {
  await dbInsert("email_log", { recipient: to, subject, body });
  console.log(`[EMAIL] To: ${to} | ${subject}`);
}
async function notifyVote({ email, postcode, selectedIssues }) {
  const list = selectedIssues.map((s,i) => `  ${i+1}. ${s.icon} ${s.title}`).join("\n");
  await logEmail({ to: email, subject: `✅ Your ${CURRENT_QUARTER} priorities for ${WARD_NAME} have been recorded`,
    body: `Hello,\n\nThank you for submitting your ward priorities for ${CURRENT_QUARTER}.\n\nYour 5 priorities:\n${list}\n\nThe council will raise the top issues at Area Committee and Full Council.\n\nResults close: ${QUARTER_END} · Next suggestion window: ${NEXT_WINDOW}\n\n— ${WARD_NAME} Ward Office` });
  await logEmail({ to: ADMIN_EMAIL, subject: `[Ward Priorities] New vote — ${email}`,
    body: `New vote submitted.\n\nResident: ${email}\nPostcode: ${postcode}\nTime: ${new Date().toLocaleString("en-GB")}\n\nPriorities:\n${list}` });
}
async function notifySuggestion({ email, postcode, text }) {
  await logEmail({ to: email, subject: `💡 Your suggestion for ${WARD_NAME} has been received`,
    body: `Hello,\n\nYour suggestion has been received:\n"${text}"\n\nPopular suggestions will be added to the next quarter's list.\n\n— ${WARD_NAME} Ward Office` });
  await logEmail({ to: ADMIN_EMAIL, subject: `[Ward Priorities] New suggestion — action needed`,
    body: `New suggestion submitted.\n\nFrom: ${email}\nPostcode: ${postcode}\nTime: ${new Date().toLocaleString("en-GB")}\n\nSuggestion:\n"${text}"\n\nLog in to admin panel → Suggestions to review.` });
}

// ─── PRINT REPORT ─────────────────────────────────────────────────────────────
function generateReport({ issues, votes, suggestions, stats }) {
  const pctList = Object.entries(stats.pcts||{})
    .map(([id,pct]) => ({ ...issues.find(i=>i.id===id), pct, count: stats.counts?.[id]||0 }))
    .filter(Boolean).sort((a,b)=>b.pct-a.pct);
  const top3 = pctList.slice(0,3);
  const total = stats.total||0;
  const today = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  const rows = pctList.map((item,i)=>`<tr class="${i<3?'top':''}"><td class="rank">#${i+1}</td><td>${item.icon}</td><td>${item.title}</td><td style="text-align:right">${item.count}</td><td><div style="display:inline-block;width:80px;height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden;vertical-align:middle;margin-right:6px"><div style="height:100%;width:${item.pct}%;background:#2d6a4f;border-radius:4px"></div></div>${item.pct}%</td></tr>`).join("");
  const suggRows = suggestions.filter(s=>s.status==="pending"||s.status==="approved")
    .map(s=>`<tr><td>${s.text}</td><td>${s.email}</td><td style="font-weight:700;text-transform:uppercase;font-size:8pt;color:${s.status==='approved'?'#065f46':'#92400e'}">${s.status}</td></tr>`).join("")
    || "<tr><td colspan='3' style='color:#9ca3af'>No suggestions this quarter.</td></tr>";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${WARD_NAME} — ${CURRENT_QUARTER} Report</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#1a1a2e;font-size:11pt}
.cover{background:linear-gradient(135deg,#1a2e1f,#2d4a35);color:white;padding:3rem;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cover h1{font-family:'Playfair Display',serif;font-size:28pt;font-weight:900;line-height:1.1;margin-bottom:.5rem}
.cover h1 span{color:#95d5b2}.cover-sub{color:rgba(255,255,255,.6);margin-top:.4rem}
.cover-meta{margin-top:2rem;display:flex;gap:3rem}
.cover-meta .lbl{font-size:7pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:.2rem}
.cover-meta .val{font-family:'Playfair Display',serif;font-size:14pt;font-weight:700}
.section{padding:2rem 3rem}.sl{font-size:7.5pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#2d6a4f;margin-bottom:1rem;padding-bottom:.4rem;border-bottom:1px solid #e5e0d8}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
.sbox{background:#f7f4ef;border:1px solid #e5e0d8;border-radius:4px;padding:1rem;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sbox .n{font-family:'Playfair Display',serif;font-size:22pt;font-weight:900;color:#2d6a4f}.sbox .l{font-size:8pt;color:#6b7280;margin-top:.2rem}
.top3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem}
.tc{border-radius:4px;padding:1rem 1.1rem;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tc.f{background:#1a2e1f;color:white}.tc.s{background:#d8f3dc}.tc.t{background:#f0fdf4;border:1px solid #d8f3dc}
.tc .rl{font-size:7pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;opacity:.6;margin-bottom:.3rem}
.tc .in{font-family:'Playfair Display',serif;font-size:11pt;font-weight:700;line-height:1.3}
.tc .pb{font-family:'Playfair Display',serif;font-size:20pt;font-weight:900;margin-top:.25rem;color:#2d6a4f}.tc.f .pb{color:#95d5b2}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{background:#f7f4ef;padding:.5rem .75rem;text-align:left;font-size:8pt;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e0d8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
td{padding:.55rem .75rem;border-bottom:1px solid #f0ede8;vertical-align:middle}
tr.top td{background:#f0faf4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
td.rank{font-family:'Playfair Display',serif;font-weight:900;color:#2d6a4f;font-size:11pt;width:40px}
.cbox{background:#1a2e1f;color:white;border-radius:4px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cbox h4{font-family:'Playfair Display',serif;font-size:11pt;margin-bottom:.75rem;color:#95d5b2}
.ci{display:flex;align-items:flex-start;gap:.5rem;margin-bottom:.4rem;font-size:9.5pt}
.abox{background:#f7f4ef;border:1px solid #e5e0d8;border-radius:4px;padding:1.25rem;margin-bottom:1rem}
.abox h4{font-size:9pt;font-weight:700;margin-bottom:.4rem}.al{height:24px;border-bottom:1px dashed #e5e0d8;margin-bottom:6px}
.pb2{page-break-before:always;padding-top:2rem}
.footer{background:#1a2e1f;color:rgba(255,255,255,.4);padding:.75rem 3rem;font-size:8pt;display:flex;justify-content:space-between;margin-top:2rem;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer span{color:#95d5b2;font-weight:600}
</style></head><body>
<div class="cover">
  <div style="font-size:8pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;background:#52b788;color:white;display:inline-block;padding:.3rem .8rem;border-radius:2px;margin-bottom:.75rem">${WARD_NAME} Ward</div>
  <h1>Quarterly Priorities<br><span>Report</span></h1>
  <p class="cover-sub">Birmingham City Council</p>
  <div class="cover-meta">
    <div><div class="lbl">Quarter</div><div class="val">${CURRENT_QUARTER}</div></div>
    <div><div class="lbl">Total responses</div><div class="val">${total}</div></div>
    <div><div class="lbl">Generated</div><div class="val">${today}</div></div>
  </div>
</div>
<div class="section"><div class="sl">At a glance</div>
<div class="grid4">
  <div class="sbox"><div class="n">${total}</div><div class="l">Residents responded</div></div>
  <div class="sbox"><div class="n">${pctList.filter(i=>i.pct>=50).length}</div><div class="l">Issues above 50%</div></div>
  <div class="sbox"><div class="n">${suggestions.filter(s=>s.quarter===CURRENT_QUARTER).length}</div><div class="l">Suggestions submitted</div></div>
  <div class="sbox"><div class="n">${suggestions.filter(s=>s.status==="approved").length}</div><div class="l">Suggestions approved</div></div>
</div>
${top3.length?`<div class="sl">Top 3 priorities this quarter</div><div class="top3">${top3.map((item,i)=>`<div class="tc ${i===0?'f':i===1?'s':'t'}"><div class="rl">${i===0?'🥇 Top priority':i===1?'🥈 Second':'🥉 Third'}</div><div class="in">${item.icon} ${item.title}</div><div class="pb">${item.pct}%</div><div style="font-size:8pt;opacity:.7;margin-top:.2rem">${item.count} of ${total} residents</div></div>`).join("")}</div>`:''}
<div class="cbox"><h4>Council commitment — ${CURRENT_QUARTER}</h4>${top3.map(item=>`<div class="ci"><span>✦</span><span>Raise <strong>${item.title}</strong> at the next Area Committee and Full Council meeting</span></div>`).join('')}<div style="margin-top:.75rem;font-size:8.5pt;opacity:.65">Signed: _________________ &nbsp;·&nbsp; Date: _________________ &nbsp;·&nbsp; ${WARD_NAME} Ward</div></div>
<div class="sl">Full priority rankings</div>
<table><thead><tr><th>#</th><th></th><th>Issue</th><th style="text-align:right">Votes</th><th>Support</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="pb2"><div class="section"><div class="sl">Resident suggestions this quarter</div>
<table><thead><tr><th>Suggestion</th><th>Submitted by</th><th>Status</th></tr></thead><tbody>${suggRows}</tbody></table>
<div style="margin-top:2rem"><div class="sl">Action notes</div>${top3.map((item,i)=>`<div class="abox"><h4>${i+1}. ${item.icon} ${item.title} — ${item.pct}% support</h4><div class="al"></div><div class="al"></div><div class="al"></div></div>`).join('')}</div></div>
<div class="footer"><div><span>${WARD_NAME} Ward</span> · Birmingham City Council</div><div>Generated ${today} · ${CURRENT_QUARTER}</div></div></div>
</body></html>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes fadeUp    { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
@keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
.fade-up    { animation: fadeUp    0.4s ease both; }
.fade-in    { animation: fadeIn    0.3s ease both; }
.slide-down { animation: slideDown 0.35s ease both; }
.issue-card { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
.issue-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(45,106,79,0.12); }
`;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app:  { fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f7f4ef", color:"#1a1a2e" },
  hdr:  { background:"linear-gradient(135deg,#1a2e1f 0%,#2d4a35 60%,#1e3a28 100%)", overflow:"hidden" },
  hdrI: { maxWidth:1100, margin:"0 auto", padding:"2.5rem 2rem 2rem" },
  bdg:  { background:"#52b788", color:"white", padding:"0.35rem 0.9rem", borderRadius:2, fontSize:"0.68rem", fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", display:"inline-block", marginBottom:"0.8rem" },
  h1:   { fontFamily:"'Playfair Display',serif", fontSize:"clamp(2rem,5vw,3rem)", fontWeight:900, color:"white", lineHeight:1.1, marginBottom:"0.5rem" },
  h1A:  { color:"#95d5b2" },
  sub:  { fontSize:"0.95rem", color:"rgba(255,255,255,0.6)", fontWeight:300, maxWidth:500, lineHeight:1.7 },
  pb:   { height:4, background:"rgba(255,255,255,0.1)" },
  pf:   { height:"100%", background:"linear-gradient(90deg,#52b788,#e9c46a)", transition:"width 1.2s ease" },
  card: { background:"white", borderRadius:6, border:"1px solid #e5e0d8", padding:"1.75rem" },
  btnP: { background:"#2d6a4f", color:"white", border:"none", padding:"0.75rem 1.75rem", borderRadius:4, fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", fontWeight:600, cursor:"pointer" },
  btnA: { background:"#e9c46a", color:"#1a1a2e", border:"none", padding:"0.75rem 1.75rem", borderRadius:4, fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", fontWeight:700, cursor:"pointer" },
  btnG: { background:"transparent", color:"#6b7280", border:"1px solid #e5e0d8", padding:"0.6rem 1.2rem", borderRadius:4, fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", cursor:"pointer" },
  btnD: { background:"#fee2e2", color:"#dc2626", border:"none", padding:"0.4rem 0.9rem", borderRadius:3, fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:600, cursor:"pointer" },
  btnS: { background:"#d1fae5", color:"#065f46", border:"none", padding:"0.4rem 0.9rem", borderRadius:3, fontFamily:"'DM Sans',sans-serif", fontSize:"0.78rem", fontWeight:600, cursor:"pointer" },
  btnPr:{ background:"#1a2e1f", color:"white", border:"none", padding:"0.7rem 1.4rem", borderRadius:4, fontFamily:"'DM Sans',sans-serif", fontSize:"0.85rem", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"0.5rem" },
  inp:  { width:"100%", border:"1.5px solid #e5e0d8", borderRadius:4, padding:"0.75rem 1rem", fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", color:"#1a1a2e", background:"#faf7f2", outline:"none", boxSizing:"border-box" },
  lbl:  { fontSize:"0.78rem", fontWeight:600, color:"#374151", marginBottom:"0.4rem", display:"block", letterSpacing:"0.03em" },
  trk:  { background:"#1a2e1f", color:"white", borderRadius:6, padding:"1.25rem 1.75rem", display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap", marginBottom:"2rem" },
  slot: f => ({ flex:1, height:7, background:f?"#52b788":"rgba(255,255,255,0.12)", borderRadius:4, transition:"background 0.3s" }),
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,   setView]   = useState("loading");
  const [user,   setUser]   = useState(null);
  const [issues, setIssues] = useState([]);
  const [votes,  setVotes]  = useState([]);
  const [suggs,  setSuggs]  = useState([]);
  const [elog,   setElog]   = useState([]);
  const [stats,  setStats]  = useState({});
  const [admin,  setAdmin]  = useState(false);
  const [toast,  setToast]  = useState(null);
  const [dbError, setDbError] = useState(false);

  function showToast(msg, type="success") {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 4500);
  }

  function computeStats(voteRows, iss) {
    const counts = {};
    iss.forEach(i => counts[i.id] = 0);
    voteRows.forEach(v => (v.selected_issues||[]).forEach(id => { if(counts[id]!==undefined) counts[id]++; }));
    const total = voteRows.length;
    const pcts = {};
    Object.entries(counts).forEach(([id,c]) => { pcts[id] = total ? Math.round((c/total)*100) : 0; });
    setStats({counts, pcts, total});
    return {counts, pcts, total};
  }

  async function loadAll() {
    try {
      const [dbIssues, dbVotes, dbSuggs, dbElog] = await Promise.all([
        dbGet("issues", "order=created_at.asc"),
        dbGet("votes", `quarter=eq.${CURRENT_QUARTER}`),
        dbGet("suggestions", "order=created_at.desc"),
        dbGet("email_log", "order=sent_at.desc&limit=100"),
      ]);

      // Seed default issues if none exist
      let iss = dbIssues && dbIssues.length > 0 ? dbIssues.map(i => ({...i, desc: i.description})) : DEFAULT_ISSUES;
      if (!dbIssues || dbIssues.length === 0) {
        for (const issue of DEFAULT_ISSUES) {
          await dbInsert("issues", { id: issue.id, icon: issue.icon, title: issue.title, description: issue.desc, active: issue.active });
        }
      }

      const v = dbVotes || [];
      setIssues(iss);
      setVotes(v);
      setSuggs(dbSuggs || []);
      setElog(dbElog || []);
      computeStats(v, iss);
      setView("register");
    } catch(e) {
      console.error("DB load error:", e);
      setDbError(true);
      setIssues(DEFAULT_ISSUES);
      setView("register");
    }
  }

  useEffect(() => {
    loadAll();
    const tag = document.createElement("style");
    tag.textContent = CSS;
    document.head.appendChild(tag);
    return () => { try { document.head.removeChild(tag); } catch{} };
  }, []);

  // ── REGISTER ──────────────────────────────────────────────────────────────
  function RegisterView() {
    const [email,setEmail] = useState("");
    const [pc,setPc]       = useState("");
    const [err,setErr]     = useState("");
    const [busy,setBusy]   = useState(false);

    async function go() {
      setErr("");
      if (!email.includes("@")) { setErr("Please enter a valid email address."); return; }
      if (!pc.trim()) { setErr("Please enter your postcode."); return; }
      if (!validatePostcode(pc)) {
        setErr(`This postcode isn't in the ${WARD_NAME} ward. Only ward residents can participate. If you think this is an error, please contact the ward office.`);
        return;
      }
      setBusy(true);
      await new Promise(r => setTimeout(r, 400));
      const ek = email.toLowerCase().trim();
      const existingVote = votes.find(v => v.email === ek);
      const hasSuggested = suggs.some(s => s.email === ek && s.quarter === CURRENT_QUARTER);
      setUser({ email:ek, postcode:normalisePC(pc), hasVoted:!!existingVote, existingVote, hasSuggested });
      setView("vote");
      setBusy(false);
    }

    return (
      <div style={{maxWidth:520, margin:"0 auto", padding:"3rem 1.5rem"}}>
        <div className="fade-up" style={S.card}>
          {dbError && (
            <div style={{background:"#fef3c7",border:"1px solid #fde68a",borderRadius:4,padding:"0.75rem 1rem",marginBottom:"1.25rem",fontSize:"0.82rem",color:"#92400e"}}>
              ⚠️ Database connecting… votes will save once connected.
            </div>
          )}
          <div style={{textAlign:"center", marginBottom:"2rem"}}>
            <div style={{fontSize:"2.5rem", marginBottom:"0.5rem"}}>🗳️</div>
            <h2 style={{fontFamily:"'Playfair Display',serif", fontSize:"1.6rem", marginBottom:"0.4rem"}}>Enter your details</h2>
            <p style={{fontSize:"0.83rem", color:"#6b7280", lineHeight:1.6}}>Your email and postcode verify you're a ward resident and ensure one response per person.</p>
          </div>
          <div style={{marginBottom:"1.25rem"}}>
            <label style={S.lbl}>Email address</label>
            <input style={S.inp} type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} />
          </div>
          <div style={{marginBottom:"1.5rem"}}>
            <label style={S.lbl}>Postcode</label>
            <input style={S.inp} type="text" placeholder="e.g. B13 9QR" value={pc} onChange={e=>setPc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} />
            <div style={{fontSize:"0.73rem", color:"#9ca3af", marginTop:"0.4rem"}}>Must be in {WARD_NAME} (B13, B14, B28 and bordering areas)</div>
          </div>
          {err && <div className="fade-in" style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:4,padding:"0.75rem 1rem",marginBottom:"1.25rem",fontSize:"0.83rem",color:"#b91c1c",lineHeight:1.5}}>⚠️ {err}</div>}
          <button style={{...S.btnP, width:"100%", opacity:busy?0.7:1}} onClick={go} disabled={busy}>{busy?"Verifying…":"Continue →"}</button>
          <div style={{textAlign:"center", marginTop:"1.25rem"}}>
            <button style={{background:"none",border:"none",fontSize:"0.75rem",color:"#9ca3af",cursor:"pointer",textDecoration:"underline"}} onClick={()=>setView("adminLogin")}>Admin login</button>
          </div>
        </div>
      </div>
    );
  }

  // ── VOTE ──────────────────────────────────────────────────────────────────
  function VoteView() {
    const active = issues.filter(i=>i.active);
    const existingIds = user?.existingVote?.selected_issues || [];
    const [sel, setSel]           = useState(new Set(existingIds));
    const [suggestion, setSugg]   = useState("");
    const [submitted, setSubmitted] = useState(!!user?.hasVoted);
    const [sugDone, setSugDone]   = useState(user?.hasSuggested||false);
    const [tab, setTab]           = useState(submitted?"results":"vote");
    const [busy, setBusy]         = useState(false);
    const pctList = Object.entries(stats.pcts||{}).map(([id,pct])=>({...issues.find(i=>i.id===id),pct})).filter(Boolean).sort((a,b)=>b.pct-a.pct);

    function toggle(id) {
      const s = new Set(sel);
      s.has(id) ? s.delete(id) : (s.size < 5 && s.add(id));
      setSel(s);
    }

    async function submitVote() {
      if (sel.size !== 5 || busy) return;
      setBusy(true);
      try {
        const voteData = { email: user.email, postcode: user.postcode, selected_issues: [...sel], quarter: CURRENT_QUARTER };
        // Upsert — insert or update if email already exists
        const existing = votes.find(v => v.email === user.email);
await sb(`votes?on_conflict=email`, {
  method: "POST",
  body: JSON.stringify(voteData),
  headers: { "Prefer": "resolution=merge-duplicates,return=representation" }
});
        // Reload votes
        const newVotes = await dbGet("votes", `quarter=eq.${CURRENT_QUARTER}`);
        const v = newVotes || [];
        setVotes(v);
        computeStats(v, issues);
        const selectedIssues = [...sel].map(id => issues.find(i=>i.id===id)).filter(Boolean);
        await notifyVote({ email:user.email, postcode:user.postcode, selectedIssues });
        const el = await dbGet("email_log","order=sent_at.desc&limit=100"); setElog(el||[]);
        setSubmitted(true); setTab("results");
        showToast("Priorities submitted! Thank you for having your say.");
      } catch(e) {
        console.error(e);
        showToast("Something went wrong — please try again.", "warning");
      }
      setBusy(false);
    }

    async function submitSug() {
      if (!suggestion.trim() || sugDone) return;
      try {
        await dbInsert("suggestions", { email:user.email, postcode:user.postcode, text:suggestion.trim(), quarter:CURRENT_QUARTER, status:"pending", admin_note:"" });
        const newSuggs = await dbGet("suggestions","order=created_at.desc"); setSuggs(newSuggs||[]);
        await notifySuggestion({ email:user.email, postcode:user.postcode, text:suggestion.trim() });
        setSugDone(true); setSugg("");
        showToast("Suggestion submitted successfully!");
      } catch(e) {
        showToast("Something went wrong — please try again.", "warning");
      }
    }

    return (
      <div style={{maxWidth:1100, margin:"0 auto", padding:"2.5rem 1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <div style={{fontSize:"0.73rem",color:"#9ca3af",marginBottom:"0.2rem"}}>Logged in as {user?.email} · {user?.postcode}</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem"}}>{submitted?"Your priorities for "+CURRENT_QUARTER:"Choose your 5 priorities"}</h2>
          </div>
          <div style={{display:"flex",gap:"0.5rem"}}>
            {["vote","results"].map(t=>(
              <button key={t} style={{...S.btnG,background:tab===t?"#2d6a4f":"transparent",color:tab===t?"white":"#6b7280",border:"1px solid "+(tab===t?"#2d6a4f":"#e5e0d8")}} onClick={()=>setTab(t)}>{t==="vote"?"Vote":"Live Results"}</button>
            ))}
          </div>
        </div>

        {tab==="vote" && (
          <div className="fade-in">
            {submitted ? (
              <div className="fade-up" style={{...S.card,textAlign:"center",padding:"3rem"}}>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>✅</div>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.8rem",color:"#2d6a4f",marginBottom:"0.75rem"}}>Priorities submitted!</h2>
                <p style={{color:"#6b7280",marginBottom:"0.5rem",fontSize:"0.9rem",lineHeight:1.6}}>Your 5 priorities for {CURRENT_QUARTER} have been recorded.</p>
                <p style={{color:"#9ca3af",fontSize:"0.82rem",marginBottom:"1.5rem"}}>📧 A confirmation has been logged for {user?.email}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",justifyContent:"center",marginBottom:"1.75rem"}}>
                  {[...sel].map(id=>{const iss=issues.find(i=>i.id===id);return iss?<span key={id} style={{background:"#d1fae5",color:"#065f46",padding:"0.3rem 0.8rem",borderRadius:3,fontSize:"0.8rem",fontWeight:600}}>{iss.icon} {iss.title}</span>:null;})}
                </div>
                <button style={S.btnP} onClick={()=>setTab("results")}>See live results →</button>
              </div>
            ) : (
              <>
                <div style={S.trk}>
                  <div>
                    <div style={{fontSize:"0.63rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.45)",marginBottom:"0.3rem"}}>Selected</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:"2rem",color:"#95d5b2"}}>{sel.size}/5</div>
                  </div>
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{fontSize:"0.63rem",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.45)",marginBottom:"0.5rem"}}>Priority slots</div>
                    <div style={{display:"flex",gap:"0.4rem"}}>{[0,1,2,3,4].map(i=><div key={i} style={S.slot(i<sel.size)}/>)}</div>
                  </div>
                  <button style={{...S.btnA,opacity:sel.size===5&&!busy?1:0.35,pointerEvents:sel.size===5&&!busy?"auto":"none"}} onClick={submitVote}>{busy?"Submitting…":"Submit priorities →"}</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"1rem",marginBottom:"2.5rem"}}>
                  {active.map((issue,idx)=>{
                    const isSel=sel.has(issue.id), isDis=!isSel&&sel.size>=5;
                    return (
                      <div key={issue.id} className="issue-card fade-up" style={{animationDelay:`${idx*0.04}s`,background:isSel?"linear-gradient(135deg,#f0faf4,white)":"white",border:`2px solid ${isSel?"#2d6a4f":"#e5e0d8"}`,borderRadius:6,padding:"1.25rem",cursor:isDis?"not-allowed":"pointer",opacity:isDis?0.4:1,position:"relative",userSelect:"none"}} onClick={()=>!isDis&&toggle(issue.id)}>
                        {isSel&&<div style={{position:"absolute",top:-10,left:14,background:"#2d6a4f",color:"white",fontSize:"0.6rem",fontWeight:700,padding:"0.18rem 0.6rem",borderRadius:2}}>Priority {[...sel].indexOf(issue.id)+1}</div>}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.6rem"}}>
                          <span style={{fontSize:"1.4rem"}}>{issue.icon}</span>
                          <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${isSel?"#2d6a4f":"#e5e0d8"}`,background:isSel?"#2d6a4f":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0}}>
                            {isSel&&<span style={{color:"white",fontSize:"0.7rem",fontWeight:700}}>✓</span>}
                          </div>
                        </div>
                        <h4 style={{fontSize:"0.88rem",fontWeight:600,marginBottom:"0.3rem"}}>{issue.title}</h4>
                        <p style={{fontSize:"0.75rem",color:"#6b7280",lineHeight:1.45}}>{issue.desc||issue.description}</p>
                      </div>
                    );
                  })}
                </div>
                <div style={{...S.card,marginBottom:"2rem"}}>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",marginBottom:"0.4rem"}}>Suggest a new issue</h3>
                  <p style={{fontSize:"0.83rem",color:"#6b7280",marginBottom:"1.25rem",lineHeight:1.6}}>Once per quarter you can nominate one issue not on the list. Popular suggestions may be added next quarter.</p>
                  {sugDone?(
                    <div style={{background:"#d1fae5",border:"1px solid #a7f3d0",borderRadius:4,padding:"0.75rem 1rem",fontSize:"0.85rem",color:"#065f46"}}>✅ Your suggestion for {CURRENT_QUARTER} has been submitted. You'll hear back if it's added next quarter.</div>
                  ):(
                    <div style={{display:"flex",gap:"1rem",alignItems:"flex-end",flexWrap:"wrap"}}>
                      <textarea style={{...S.inp,minHeight:80,resize:"vertical",flex:1,minWidth:240}} placeholder="Be specific — e.g. 'Dangerous crossing on Stratford Road near Morrisons — no traffic island, near school'…" value={suggestion} onChange={e=>setSugg(e.target.value)} />
                      <button style={{...S.btnP,whiteSpace:"nowrap"}} onClick={submitSug}>Submit suggestion</button>
                    </div>
                  )}
                  <div style={{marginTop:"0.75rem",fontSize:"0.73rem",color:"#9ca3af"}}>📅 Next new issue window: {NEXT_WINDOW}</div>
                </div>
              </>
            )}
          </div>
        )}

        {tab==="results" && (
          <div className="fade-in">
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"1.5rem"}}>
              <div style={S.card}>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",marginBottom:"1.5rem"}}>What {WARD_NAME} cares about — {CURRENT_QUARTER}</h3>
                {pctList.length===0&&<p style={{color:"#9ca3af",fontSize:"0.85rem"}}>No votes yet — be the first!</p>}
                {pctList.map((item,i)=>(
                  <div key={item.id} style={{marginBottom:"1rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.3rem"}}>
                      <span style={{fontSize:"0.83rem",fontWeight:500}}>{item.icon} {item.title}</span>
                      <span style={{fontSize:"0.8rem",fontWeight:700,color:"#2d6a4f"}}>{item.pct}%</span>
                    </div>
                    <div style={{height:8,background:"#d8f3dc",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${item.pct}%`,background:"linear-gradient(90deg,#2d6a4f,#52b788)",borderRadius:4,transition:"width 1s ease"}} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                {pctList[0]&&<div style={{background:"#1a2e1f",borderRadius:6,padding:"1.5rem",color:"white"}}>
                  <div style={{fontSize:"0.63rem",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:"0.5rem"}}>Top priority</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#95d5b2",lineHeight:1.3,marginBottom:"0.4rem"}}>{pctList[0].icon} {pctList[0].title}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"2.2rem",fontWeight:900}}>{pctList[0].pct}%</div>
                </div>}
                <div style={{...S.card,textAlign:"center"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"2.5rem",fontWeight:900,color:"#2d6a4f"}}>{stats.total||0}</div>
                  <div style={{fontSize:"0.78rem",color:"#6b7280"}}>Residents responded this quarter</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ADMIN LOGIN ───────────────────────────────────────────────────────────
  function AdminLogin() {
    const [pw,setPw]=useState(""); const [err,setErr]=useState("");
    const go=()=>{ if(pw===ADMIN_PASSWORD){setAdmin(true);setView("admin");}else setErr("Incorrect password."); };
    return (
      <div style={{maxWidth:400,margin:"4rem auto",padding:"0 1.5rem"}}>
        <div className="fade-up" style={S.card}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",marginBottom:"1.5rem",textAlign:"center"}}>Admin login</h2>
          <div style={{marginBottom:"1rem"}}><label style={S.lbl}>Password</label><input style={S.inp} type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} /></div>
          {err&&<div style={{color:"#dc2626",fontSize:"0.83rem",marginBottom:"1rem"}}>⚠️ {err}</div>}
          <button style={{...S.btnP,width:"100%"}} onClick={go}>Log in</button>
          <button style={{...S.btnG,width:"100%",marginTop:"0.75rem"}} onClick={()=>setView("register")}>← Back</button>
        </div>
      </div>
    );
  }

  // ── ADMIN PANEL ───────────────────────────────────────────────────────────
  function AdminPanel() {
    const [tab,setTab]=useState("overview");
    const [newIss,setNewIss]=useState({icon:"📌",title:"",desc:""});
    const [refreshing,setRefreshing]=useState(false);
    const pending=suggs.filter(s=>s.status==="pending");
    const pctList=Object.entries(stats.pcts||{}).map(([id,pct])=>({...issues.find(i=>i.id===id),pct,count:stats.counts?.[id]||0})).filter(Boolean).sort((a,b)=>b.pct-a.pct);

    async function refresh() {
      setRefreshing(true);
      await loadAll();
      setRefreshing(false);
      showToast("Data refreshed!");
    }

    async function updateSugg(id,updates){
      await dbUpdate("suggestions",`id=eq.${id}`,updates);
      const s=await dbGet("suggestions","order=created_at.desc"); setSuggs(s||[]);
    }
    async function approveAsIssue(sugg){
      const newId=Date.now().toString();
      await dbInsert("issues",{id:newId,icon:"📌",title:sugg.text.substring(0,60),description:"Added from resident suggestion",active:true});
      await updateSugg(sugg.id,{status:"approved",admin_note:"Added to issue list"});
      await loadAll();
      showToast("Added to issues list!");
    }
    async function toggleActive(id){
      const iss=issues.find(i=>i.id===id);
      await dbUpdate("issues",`id=eq.${id}`,{active:!iss.active});
      await loadAll();
    }
    async function addIssue(){
      if(!newIss.title.trim()) return;
      await dbInsert("issues",{id:Date.now().toString(),icon:newIss.icon,title:newIss.title,description:newIss.desc,active:true});
      await loadAll();
      setNewIss({icon:"📌",title:"",desc:""});
      showToast("New issue added.");
    }
    async function clearVotes(){
      if(!window.confirm("Delete ALL votes for this quarter? Cannot be undone.")) return;
      // Delete all votes for current quarter
      await sb(`votes?quarter=eq.${CURRENT_QUARTER}`,{method:"DELETE",prefer:""});
      await loadAll();
      showToast("All votes cleared.","warning");
    }
    function printReport(){ const w=window.open("","_blank"); w.document.write(generateReport({issues,votes,suggestions:suggs,stats})); w.document.close(); w.onload=()=>w.print(); }

    const TabBtn=({id,label,badge})=>(
      <button onClick={()=>setTab(id)} style={{padding:"0.6rem 1.1rem",borderRadius:4,border:"none",background:tab===id?"#2d6a4f":"transparent",color:tab===id?"white":"#374151",fontFamily:"'DM Sans',sans-serif",fontSize:"0.83rem",fontWeight:600,cursor:"pointer"}}>
        {label}{badge>0&&<span style={{marginLeft:6,background:"#e9c46a",color:"#1a1a2e",borderRadius:10,padding:"0.1rem 0.4rem",fontSize:"0.7rem",fontWeight:700}}>{badge}</span>}
      </button>
    );

    return (
      <div style={{maxWidth:1100,margin:"0 auto",padding:"2rem 1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <div style={{fontSize:"0.68rem",color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.25rem"}}>Admin Dashboard</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.6rem"}}>{WARD_NAME} — {CURRENT_QUARTER}</h2>
          </div>
          <div style={{display:"flex",gap:"0.75rem",alignItems:"center",flexWrap:"wrap"}}>
            <button style={{...S.btnG,opacity:refreshing?0.6:1}} onClick={refresh}>{refreshing?"Refreshing…":"🔄 Refresh"}</button>
            <button style={S.btnPr} onClick={printReport}>🖨️ Print Report</button>
            <button style={S.btnG} onClick={()=>{setAdmin(false);setView("register");}}>← Exit admin</button>
          </div>
        </div>

        <div style={{display:"flex",gap:"0.4rem",marginBottom:"1.5rem",background:"#f0ede8",padding:"0.4rem",borderRadius:6,flexWrap:"wrap"}}>
          <TabBtn id="overview"    label="Overview" />
          <TabBtn id="suggestions" label="Suggestions" badge={pending.length} />
          <TabBtn id="issues"      label="Manage Issues" />
          <TabBtn id="voters"      label="Voters" />
          <TabBtn id="emails"      label="Email Log" badge={elog.filter(e=>e.recipient===ADMIN_EMAIL).length} />
        </div>

        {tab==="overview"&&(
          <div className="fade-in">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"1rem",marginBottom:"2rem"}}>
              {[{l:"Total responses",v:stats.total||0,c:"#2d6a4f"},{l:"Pending suggestions",v:pending.length,c:"#d97706"},{l:"Active issues",v:issues.filter(i=>i.active).length,c:"#1d4ed8"},{l:"Emails logged",v:elog.length,c:"#7c3aed"}].map(s=>(
                <div key={s.l} style={{...S.card,textAlign:"center"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:"2rem",fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:"0.73rem",color:"#6b7280",marginTop:"0.2rem"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.2rem"}}>Priority rankings</h3>
                <button style={S.btnPr} onClick={printReport}>🖨️ Print report</button>
              </div>
              {pctList.length===0&&<p style={{color:"#9ca3af",fontSize:"0.85rem"}}>No votes yet.</p>}
              {pctList.map((item,i)=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"0.85rem"}}>
                  <div style={{width:28,fontFamily:"'Playfair Display',serif",fontWeight:700,color:i<3?"#2d6a4f":"#9ca3af",fontSize:"0.9rem",textAlign:"center"}}>#{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.82rem",fontWeight:500,marginBottom:"0.25rem"}}>{item.icon} {item.title}</div>
                    <div style={{height:7,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${item.pct}%`,background:i===0?"#2d6a4f":i===1?"#52b788":i===2?"#95d5b2":"#d8f3dc",borderRadius:4}} />
                    </div>
                  </div>
                  <div style={{width:44,textAlign:"right",fontSize:"0.82rem",fontWeight:700,color:"#2d6a4f"}}>{item.pct}%</div>
                  <div style={{width:52,textAlign:"right",fontSize:"0.78rem",color:"#9ca3af"}}>{item.count} votes</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="suggestions"&&(
          <div className="fade-in">
            {suggs.length===0&&<div style={{...S.card,textAlign:"center",color:"#9ca3af",padding:"3rem",fontSize:"0.85rem"}}>No suggestions yet.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
              {suggs.map(s=>(
                <div key={s.id} style={{...S.card,borderLeft:`4px solid ${s.status==="pending"?"#e9c46a":s.status==="approved"?"#52b788":"#f87171"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"0.75rem"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.68rem",color:"#9ca3af",marginBottom:"0.3rem"}}>{s.quarter} · {new Date(s.created_at).toLocaleDateString("en-GB")} · {s.email} · {s.postcode}</div>
                      <p style={{fontSize:"0.9rem",color:"#1a1a2e",lineHeight:1.5,marginBottom:"0.5rem"}}>"{s.text}"</p>
                      <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.2rem 0.6rem",borderRadius:3,background:s.status==="pending"?"#fef3c7":s.status==="approved"?"#d1fae5":"#fee2e2",color:s.status==="pending"?"#92400e":s.status==="approved"?"#065f46":"#b91c1c"}}>{s.status.toUpperCase()}</span>
                      {s.admin_note&&<span style={{marginLeft:"0.5rem",fontSize:"0.75rem",color:"#6b7280"}}>{s.admin_note}</span>}
                    </div>
                    {s.status==="pending"&&(
                      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                        <button style={S.btnS} onClick={()=>approveAsIssue(s)}>✅ Add to issues</button>
                        <button style={S.btnG} onClick={()=>{const n=prompt("Note:");updateSugg(s.id,{status:"merged",admin_note:n||"Similar to existing issue"});}}>🔗 Duplicate</button>
                        <button style={S.btnD} onClick={()=>updateSugg(s.id,{status:"rejected",admin_note:"Out of scope"})}>✕ Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="issues"&&(
          <div className="fade-in">
            <div style={{...S.card,marginBottom:"1.5rem"}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",marginBottom:"1.25rem"}}>Add new issue</h3>
              <div style={{display:"grid",gridTemplateColumns:"80px 1fr 2fr auto",gap:"0.75rem",alignItems:"end"}}>
                <div><label style={S.lbl}>Icon</label><input style={S.inp} value={newIss.icon} onChange={e=>setNewIss(f=>({...f,icon:e.target.value}))} /></div>
                <div><label style={S.lbl}>Title</label><input style={S.inp} value={newIss.title} onChange={e=>setNewIss(f=>({...f,title:e.target.value}))} placeholder="Issue title" /></div>
                <div><label style={S.lbl}>Description</label><input style={S.inp} value={newIss.desc} onChange={e=>setNewIss(f=>({...f,desc:e.target.value}))} placeholder="Brief description" /></div>
                <button style={S.btnP} onClick={addIssue}>Add</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {issues.map(issue=>(
                <div key={issue.id} style={{...S.card,padding:"1rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",opacity:issue.active?1:0.5}}>
                  <span style={{fontSize:"1.3rem"}}>{issue.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.88rem",fontWeight:600}}>{issue.title}</div>
                    <div style={{fontSize:"0.75rem",color:"#9ca3af"}}>{issue.description||issue.desc}</div>
                  </div>
                  <div style={{fontSize:"0.8rem",color:"#2d6a4f",fontWeight:600,minWidth:64,textAlign:"right"}}>{stats.counts?.[issue.id]||0} votes</div>
                  <button style={issue.active?S.btnD:S.btnS} onClick={()=>toggleActive(issue.id)}>{issue.active?"Hide":"Show"}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="voters"&&(
          <div className="fade-in">
            <div style={{...S.card,marginBottom:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem"}}>Respondents — {stats.total||0} total</h3>
              <button style={S.btnD} onClick={clearVotes}>🗑 Clear all votes</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {votes.map(v=>(
                <div key={v.id} style={{...S.card,padding:"0.9rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
                  <div style={{fontSize:"0.83rem",fontWeight:500,minWidth:200,color:"#374151"}}>{v.email} · {v.postcode}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",flex:1}}>
                    {(v.selected_issues||[]).map(id=>{const iss=issues.find(i=>i.id===id);return iss?<span key={id} style={{background:"#d8f3dc",color:"#2d6a4f",padding:"0.2rem 0.5rem",borderRadius:3,fontSize:"0.72rem",fontWeight:600}}>{iss.icon} {iss.title}</span>:null;})}
                  </div>
                </div>
              ))}
              {votes.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:"3rem",fontSize:"0.85rem"}}>No votes yet.</div>}
            </div>
          </div>
        )}

        {tab==="emails"&&(
          <div className="fade-in">
            <div style={{...S.card,marginBottom:"1rem",background:"#fffbeb",border:"1px solid #fde68a"}}>
              <p style={{fontSize:"0.83rem",color:"#92400e",lineHeight:1.6}}>
                <strong>📧 Email simulation mode.</strong> Emails are logged here. To send real emails, connect <strong>Resend.com</strong> (free — 3,000/month).
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {elog.length===0&&<div style={{...S.card,textAlign:"center",color:"#9ca3af",padding:"3rem",fontSize:"0.85rem"}}>No emails logged yet.</div>}
              {elog.map(e=>(
                <div key={e.id} style={{...S.card,padding:"1rem 1.25rem",borderLeft:`3px solid ${e.recipient===ADMIN_EMAIL?"#2d6a4f":"#52b788"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.4rem"}}>
                    <div>
                      <span style={{fontSize:"0.7rem",fontWeight:700,background:e.recipient===ADMIN_EMAIL?"#d8f3dc":"#dbeafe",color:e.recipient===ADMIN_EMAIL?"#065f46":"#1d4ed8",padding:"0.15rem 0.5rem",borderRadius:3,marginRight:"0.5rem"}}>{e.recipient===ADMIN_EMAIL?"→ YOU":"→ RESIDENT"}</span>
                      <span style={{fontSize:"0.83rem",fontWeight:600}}>{e.subject}</span>
                    </div>
                    <div style={{fontSize:"0.72rem",color:"#9ca3af"}}>{new Date(e.sent_at).toLocaleString("en-GB")}</div>
                  </div>
                  <div style={{fontSize:"0.73rem",color:"#9ca3af",marginBottom:"0.5rem"}}>To: {e.recipient}</div>
                  <pre style={{fontSize:"0.78rem",color:"#374151",whiteSpace:"pre-wrap",lineHeight:1.55,background:"#f7f4ef",padding:"0.75rem",borderRadius:4,fontFamily:"'DM Sans',sans-serif"}}>{e.body}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  const total = stats.total||0;
  const topIssue = Object.entries(stats.pcts||{}).sort((a,b)=>b[1]-a[1])[0];
  const topName  = topIssue ? issues.find(i=>i.id===topIssue[0])?.title : null;

  return (
    <div style={S.app}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {toast&&(
        <div className="slide-down" style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="warning"?"#fef3c7":"#d1fae5",border:`1px solid ${toast.type==="warning"?"#fde68a":"#a7f3d0"}`,borderRadius:6,padding:"0.85rem 1.25rem",fontSize:"0.87rem",fontWeight:500,color:toast.type==="warning"?"#92400e":"#065f46",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",maxWidth:400}}>
          {toast.msg}
        </div>
      )}

      {view!=="admin"&&view!=="adminLogin"&&(
        <header style={S.hdr}>
          <div style={S.hdrI}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"1.5rem"}}>
              <div>
                <div style={S.bdg}>{WARD_NAME} · Birmingham City Council</div>
                <h1 style={S.h1}>Your Ward.<br/><span style={S.h1A}>Your Priorities.</span></h1>
                <p style={S.sub}>Tell the council what matters most to you. Choose 5 issues every quarter — your selections shape what gets raised in the council chamber.</p>
              </div>
              <div style={{paddingTop:"0.5rem"}}>
                <div style={{background:"#e9c46a",color:"#1a1a2e",padding:"0.35rem 0.9rem",borderRadius:2,fontSize:"0.72rem",fontWeight:700,marginBottom:"0.5rem",display:"inline-block"}}>{CURRENT_QUARTER} — Open Now</div>
                {total>0&&<div style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.5)"}}>{total} resident{total!==1?"s":""} responded{topName?` · Top: ${topName}`:""}</div>}
              </div>
            </div>
          </div>
          <div style={S.pb}><div style={{...S.pf,width:`${Math.min(100,(total/RESPONSE_TARGET)*100)}%`}}/></div>
        </header>
      )}

      {view==="loading"    && <div style={{textAlign:"center",padding:"4rem",color:"#9ca3af"}}>Loading…</div>}
      {view==="register"   && <RegisterView />}
      {view==="vote"       && user && <VoteView />}
      {view==="adminLogin" && <AdminLogin />}
      {view==="admin"      && admin && <AdminPanel />}

      {view!=="admin"&&(
        <footer style={{background:"#1a2e1f",color:"rgba(255,255,255,0.4)",textAlign:"center",padding:"1.25rem",fontSize:"0.73rem"}}>
          <span style={{color:"#95d5b2",fontWeight:600}}>{WARD_NAME} Ward</span> · Birmingham City Council · Data used only for ward representation
        </footer>
      )}
    </div>
  );
}
