
import { loadState, saveState } from "./storage.js";
import { initShell, toast } from "./ui.js";

function byId(id){ return document.getElementById(id); }

function init(){
  initShell("/pages/weekly.html");
  const state = loadState();

  // Check-in con Belén
  const mood = byId("checkinMood");
  const need = byId("checkinNeed");
  const note = byId("checkinNote");
  const saveCheck = byId("saveCheckin");
  const hist = byId("checkinHist");
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz*60000);
  const today = local.toISOString().slice(0,10);

  const renderHist = () => {
    const arr = (state.checkins || []).slice().reverse().slice(0, 5);
    if(!hist) return;
    if(arr.length === 0){
      hist.innerHTML = `<div class="mini">Sin check-ins aún. Guarda el primero y quedará historial.</div>`;
      return;
    }
    hist.innerHTML = arr.map(x => {
      const n = x.need === "contencion" ? "🤍 Contención" : "🧩 Estructura";
      return `<div class="item"><div><strong>${x.date} · ${x.mood || "🙂"} · ${n}</strong><small>${(x.note||"").slice(0,160)}</small></div></div>`;
    }).join("");
  };

  if(saveCheck){
    saveCheck.addEventListener("click", () => {
      state.checkins = state.checkins || [];
      state.checkins.push({date: today, mood: mood?.value || "🙂", need: need?.value || "contencion", note: note?.value || ""});
      // keep last 60
      if(state.checkins.length > 60) state.checkins = state.checkins.slice(-60);
      saveState(state);
      toast("Check-in guardado");
      renderHist();
    });
  }

  renderHist();

  // Week plan fields
  const p1 = byId("p1"); const p2 = byId("p2"); const p3 = byId("p3");
  const r1 = byId("r1"); const r2 = byId("r2"); const r3 = byId("r3");
  const risks = byId("risks");

  const weekly = state.weekly || { p:["","",""], r:["","",""], risks:"" };
  p1.value = weekly.p[0] || ""; p2.value = weekly.p[1] || ""; p3.value = weekly.p[2] || "";
  r1.value = weekly.r[0] || ""; r2.value = weekly.r[1] || ""; r3.value = weekly.r[2] || "";
  risks.value = weekly.risks || "";

  byId("btnSaveWeekly").addEventListener("click", () => {
    state.weekly = {
      p: [p1.value.trim(), p2.value.trim(), p3.value.trim()],
      r: [r1.value.trim(), r2.value.trim(), r3.value.trim()],
      risks: risks.value
    };
    saveState(state);
    toast("Semana guardada");
  });

  byId("btnApplyProjects").addEventListener("click", () => {
    // push top 3 weekly projects into active (if empty), respecting max 3
    const names = [p1.value.trim(), p2.value.trim(), p3.value.trim()].filter(Boolean);
    for(const n of names){
      if(state.projects.length >= 3) break;
      if(state.projects.some(x => x.title.toLowerCase() === n.toLowerCase())) continue;
      state.projects.push({ title:n, purpose:"Resultado semanal: completar el entregable.", next:"Definir siguiente acción", createdAt:new Date().toISOString() });
    }
    saveState(state);
    toast("Proyectos sincronizados");
  });

  // Checklist
  const items = [
    {k:"inbox", t:"Vaciar INBOX y clasificar (tarea/proyecto/incubadora/eliminar)."},
    {k:"3proj", t:"Elegir máximo 3 proyectos activos."},
    {k:"results", t:"Definir 1 resultado semanal por proyecto."},
    {k:"modes", t:"Calendarizar por modos (Crear/Construir/Gestionar/Cuidar)."},
    {k:"risk", t:"Anticipar riesgos y plan B."}
  ];
  const wrap = byId("checklist");
  wrap.innerHTML = "";
  state.weekChecklist = state.weekChecklist || {};
  items.forEach(it => {
    const row = document.createElement("div");
    row.className = "item";
    const checked = !!state.weekChecklist[it.k];
    row.innerHTML = `
      <div>
        <strong>🧩 ${it.t}</strong>
        <small>Hecho esta semana: <span class="pill">${checked ? "Sí ✅" : "No todavía"}</span></small>
      </div>
      <div class="row">
        <button class="btn small" data-k="${it.k}">${checked ? "Marcar NO" : "Marcar SÍ"}</button>
      </div>
    `;
    row.querySelector("button").addEventListener("click", () => {
      state.weekChecklist[it.k] = !state.weekChecklist[it.k];
      saveState(state);
      init(); // re-render quickly
    });
    wrap.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", init);
