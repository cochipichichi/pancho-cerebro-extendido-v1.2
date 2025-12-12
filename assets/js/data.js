
import { loadState, saveState } from "./storage.js";

function logMetric(state, text){
  const d = todayISO();
  state.logs = state.logs || [];
  state.logs.push({date:d, type:"metric", text, at:new Date().toISOString()});
  if(state.logs.length > 200) state.logs = state.logs.slice(-200);
}

import { initShell, toast } from "./ui.js";

function byId(id){ return document.getElementById(id); }
function todayISO(){
  const d = new Date(); const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz*60000);
  return local.toISOString().slice(0,10);
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function init(){
  initShell("/pages/data.html");
  const state = loadState();

  const date = byId("mDate"); date.value = todayISO();
  const sleep = byId("mSleep");
  const energy = byId("mEnergy");
  const focus = byId("mFocus");
  const mood = byId("mMood");
  const move = byId("mMove");
  const criticalDone = byId("mCritical");
  const note = byId("mNote");

  const loadRow = () => {
    const r = state.metrics.find(x => x.date === date.value);
    sleep.value = r?.sleep ?? "";
    energy.value = r?.energy ?? "";
    focus.value = r?.focus ?? "";
    mood.value = r?.mood ?? "";
    move.checked = !!r?.move;
    criticalDone.checked = !!r?.criticalDone;
    note.value = r?.note ?? "";
  };

  date.addEventListener("change", loadRow);

  byId("mSave").addEventListener("click", () => {
    const d = date.value;
    let r = state.metrics.find(x => x.date === d);
    if(!r){ r = {date:d, sleep:null, energy:null, focus:null, move:false, criticalDone:false, mood:null, note:""}; state.metrics.push(r); }
    r.sleep = sleep.value === "" ? null : clamp(parseFloat(sleep.value), 0, 14);
    r.energy = energy.value === "" ? null : clamp(parseInt(energy.value,10), 1, 5);
    r.focus = focus.value === "" ? null : clamp(parseInt(focus.value,10), 1, 5);
    r.mood = mood.value === "" ? null : clamp(parseInt(mood.value,10), 1, 5);
    r.move = !!move.checked;
    r.criticalDone = !!criticalDone.checked;
    r.note = note.value;
    state.metrics.sort((a,b)=> a.date.localeCompare(b.date));
    logMetric(state, "📊 Registro diario guardado");
    saveState(state);
    toast("Métrica guardada");
    drawChart(state);
    renderTable(state);
  });

  byId("mQuickToday").addEventListener("click", () => {
    date.value = todayISO();
    loadRow();
  });

  byId("mExportCsv").addEventListener("click", () => {
    const rows = [["date","sleep","energy","focus","move","criticalDone","mood","note"]];
    for(const r of state.metrics){
      rows.push([r.date, r.sleep ?? "", r.energy ?? "", r.focus ?? "", r.move ? "1":"0", r.criticalDone ? "1":"0", r.mood ?? "", (r.note||"").replaceAll("\n"," ")]);
    }
    const csv = rows.map(x => x.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pancho-metricas.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  drawChart(state);
  renderTable(state);
  loadRow();
}

function drawChart(state){
  const canvas = document.getElementById("chart");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.clientWidth * devicePixelRatio;
  const height = canvas.height = 220 * devicePixelRatio;

  const last = state.metrics.slice(-14);
  const values = last.map(r => r.focus ?? null).filter(v => v !== null);
  const max = 5, min = 1;

  // background
  ctx.clearRect(0,0,width,height);
  ctx.lineWidth = 1 * devicePixelRatio;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--line");
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted");

  // grid
  const pad = 24 * devicePixelRatio;
  for(let i=0;i<5;i++){
    const y = pad + (height-2*pad) * (i/4);
    ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(width-pad,y); ctx.stroke();
  }

  // labels
  ctx.font = `${12*devicePixelRatio}px system-ui`;
  ctx.fillText("Foco (últimos 14 días)", pad, 16*devicePixelRatio);

  // line
  const points = last.map((r, i) => {
    const x = pad + (width-2*pad) * (i/(Math.max(1,last.length-1)));
    const v = (r.focus ?? null);
    const y = v === null ? null : pad + (height-2*pad) * (1 - ((v-min)/(max-min)));
    return {x,y,v, date:r.date};
  });

  // path
  ctx.lineWidth = 2 * devicePixelRatio;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent");
  ctx.beginPath();
  let started = false;
  for(const p of points){
    if(p.y === null) continue;
    if(!started){ ctx.moveTo(p.x,p.y); started = true; }
    else ctx.lineTo(p.x,p.y);
  }
  ctx.stroke();

  // dots
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent2");
  for(const p of points){
    if(p.y === null) continue;
    ctx.beginPath(); ctx.arc(p.x,p.y, 3.5*devicePixelRatio, 0, Math.PI*2); ctx.fill();
  }
}

function renderTable(state){
  const wrap = document.getElementById("table");
  if(!wrap) return;
  const rows = state.metrics.slice().reverse().slice(0, 14);
  if(rows.length === 0){
    wrap.innerHTML = `<div class="mini">Sin datos aún. Registra 3 días seguidos y ya tendrás tendencia.</div>`;
    return;
  }
  wrap.innerHTML = rows.map(r => `
    <div class="item">
      <div>
        <strong>📅 ${r.date}</strong>
        <small>Sueño: ${r.sleep ?? "-"}h · Energía: ${r.energy ?? "-"} · Foco: ${r.focus ?? "-"} · Ánimo: ${r.mood ?? "-"}</small>
        <div class="tags">
          <span class="tag ${r.move ? "ok":"warn"}">Movimiento: ${r.move ? "Sí":"No"}</span>
          <span class="tag ${r.criticalDone ? "ok":"danger"}">Crítica: ${r.criticalDone ? "Hecha":"Pendiente"}</span>
        </div>
      </div>
      <div class="mini" style="max-width:320px">${(r.note||"").slice(0,140)}</div>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", init);
