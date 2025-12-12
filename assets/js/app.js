
import { loadState, saveState } from "./storage.js";
import { initShell, toast } from "./ui.js";
import { isNarratorOn, speakText, stopSpeak } from "./narrator.js";

function byId(id){ return document.getElementById(id); }
function todayISO(){
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz*60000);
  return local.toISOString().slice(0,10);
}


function logEvent(state, type, text){
  const d = todayISO();
  state.logs = state.logs || [];
  state.logs.push({date:d, type, text, at: new Date().toISOString()});
  // keep last 200
  if(state.logs.length > 200) state.logs = state.logs.slice(-200);
}

function getTodayMetric(state){
  const d = todayISO();
  state.metrics = state.metrics || [];
  let row = state.metrics.find(x => x.date === d);
  if(!row){
    row = {date:d, sleep:null, energy:null, focus:null, move:false, criticalDone:false, mood:null, note:""};
    state.metrics.push(row);
  }
  return row;
}

function energySemaforo(energy){
  if(energy === null || energy === undefined) return {level:"none", label:"Sin datos", mode:"Gestionar", tag:"warn"};
  if(energy >= 4) return {level:"green", label:"🟢 Alto", mode:"Crear / Construir", tag:"ok"};
  if(energy >= 2) return {level:"yellow", label:"🟡 Medio", mode:"Gestionar", tag:"warn"};
  return {level:"red", label:"🔴 Bajo", mode:"Cuidar", tag:"danger"};
}

function initFocusCrisis(state){
  const body = document.body;
  const btnFocus = document.getElementById("btnFocus");
  const btnCrisis = document.getElementById("btnCrisis");
  const crisisModal = document.getElementById("crisisModal");
  const crisisClose = document.getElementById("crisisClose");
  const crisisRead = document.getElementById("crisisRead");
  const crisisPause = document.getElementById("crisisPause");
  const crisisFocus25 = document.getElementById("crisisFocus25");
  const crisisGoInbox = document.getElementById("crisisGoInbox");
  const crisisSetCritical = document.getElementById("crisisSetCritical");

  const apply = () => {
    const on = !!state.ui?.focusMode;
    body.classList.toggle("focus-mode", on);
    if(btnFocus) btnFocus.textContent = on ? "🧠 Salir Modo Hoy" : "🧠 Modo Hoy";
  };
  if(!state.ui) state.ui = {focusMode:false, crisisMode:false};
  apply();

  if(btnFocus){
    btnFocus.addEventListener("click", () => {
      state.ui.focusMode = !state.ui.focusMode;
      saveState(state);
      apply();
      toast(state.ui.focusMode ? "Modo Hoy activado" : "Modo Hoy desactivado");
    });
  }

  const openCrisis = () => {
    if(!crisisModal) return;
    crisisModal.style.display = "block";
    crisisModal.setAttribute("aria-hidden","false");
    state.ui.crisisMode = true;
    saveState(state);
    if(isNarratorOn()){
      speakText("Protocolo saturación. Paso uno: pausa física tres a cinco minutos. Paso dos: descargar inbox. Paso tres: elegir una crítica mínima. Paso cuatro: veinticinco minutos de ejecución. Paso cinco: cierre dejando el siguiente paso.");
    }
  };
  const closeCrisis = () => {
    if(!crisisModal) return;
    crisisModal.style.display = "none";
    crisisModal.setAttribute("aria-hidden","true");
    state.ui.crisisMode = false;
    saveState(state);
    stopSpeak();
  };

  if(btnCrisis) btnCrisis.addEventListener("click", openCrisis);
  if(crisisClose) crisisClose.addEventListener("click", closeCrisis);
  if(crisisModal) crisisModal.addEventListener("click", (e) => { if(e.target === crisisModal) closeCrisis(); });

  if(crisisRead) crisisRead.addEventListener("click", () => {
    speakText("Protocolo saturación. Uno: pausa física tres a cinco minutos. Dos: descargar inbox. Tres: elegir una crítica mínima. Cuatro: veinticinco minutos de ejecución. Cinco: cierre dejando el siguiente paso.");
  });

  if(crisisPause) crisisPause.addEventListener("click", () => startTimer(state, 3*60, "Pausa 3 min (respirar / agua)", true));
  if(crisisFocus25) crisisFocus25.addEventListener("click", () => startTimer(state, 25*60, "Bloque 25 min (una crítica mínima)", true));
  if(crisisGoInbox) crisisGoInbox.addEventListener("click", () => {
    document.getElementById("inboxInput")?.scrollIntoView({behavior:"smooth", block:"center"});
    toast("INBOX abierto");
  });
  if(crisisSetCritical) crisisSetCritical.addEventListener("click", () => {
    const c = document.getElementById("tCritical");
    c?.focus();
    toast("Define 1 crítica mínima");
  });
}

let timerInterval = null;
function startTimer(state, seconds, label, fromCrisis=false){
  const wrap = document.getElementById("timerWrap");
  const labelEl = document.getElementById("timerLabel");
  const timeEl = document.getElementById("timerTime");
  const btnStop = document.getElementById("timerStop");
  const btnDone = document.getElementById("timerDone");
  if(!wrap || !labelEl || !timeEl) return;

  if(timerInterval) clearInterval(timerInterval);
  let remaining = seconds;

  labelEl.textContent = label;
  wrap.style.display = "block";

  const render = () => {
    const m = Math.floor(remaining/60);
    const s = remaining%60;
    timeEl.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };
  render();

  timerInterval = setInterval(() => {
    remaining -= 1;
    if(remaining <= 0){
      clearInterval(timerInterval);
      timerInterval = null;
      remaining = 0;
      render();
      toast("Timer terminado ✅");
      if(isNarratorOn()) speakText("Timer terminado. Cierra dejando el siguiente paso.");
    } else {
      render();
    }
  }, 1000);

  if(btnStop){
    btnStop.onclick = () => {
      if(timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      wrap.style.display = "none";
      toast("Timer detenido");
    };
  }
  if(btnDone){
    btnDone.onclick = () => {
      // Log as completed block if it was a focus block
      if(label.toLowerCase().includes("bloque") || label.toLowerCase().includes("pausa")){
        logEvent(state, "block", label);
        saveState(state);
        renderAchievements(state);
      }
      if(timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      wrap.style.display = "none";
      toast("Bloque registrado");
    };
  }
}

function renderEnergy(state){
  const metric = getTodayMetric(state);
  const sem = energySemaforo(metric.energy);
  const el = document.getElementById("energyBadge");
  const rec = document.getElementById("energyRec");
  const btnApply = document.getElementById("applySuggestedMode");
  if(el){
    el.className = `tag ${sem.tag}`;
    el.textContent = `Energía: ${sem.label}`;
  }
  if(rec){
    rec.textContent = `Recomendación: ${sem.mode}`;
  }
  if(btnApply){
    btnApply.onclick = () => {
      // apply first block mode suggestion
      if(sem.level === "green"){
        if(state.blocks?.[0]) state.blocks[0].mode = "Crear";
      } else if(sem.level === "yellow"){
        if(state.blocks?.[0]) state.blocks[0].mode = "Gestionar";
      } else if(sem.level === "red"){
        if(state.blocks?.[0]) state.blocks[0].mode = "Cuidar";
      }
      saveState(state);
      renderBlocks(state);
      toast("Bloque 1 ajustado según energía");
    };
  }
}

function renderCheckinSummary(state){
  const el = document.getElementById("checkinSummary");
  if(!el) return;
  const last = (state.checkins || []).slice().reverse()[0];
  if(!last){
    el.innerHTML = `<span class="mini">Sin check-in aún. Hazlo en <a href="pages/weekly.html" class="kbd">Semana</a>.</span>`;
    return;
  }
  const need = last.need === "contencion" ? "🤍 Contención" : "🧩 Estructura";
  el.innerHTML = `<div class="tags">
    <span class="tag ok">Último: ${last.date}</span>
    <span class="tag">${last.mood || "🙂"}</span>
    <span class="tag warn">${need}</span>
  </div>
  <div class="mini" style="margin-top:8px">${(last.note||"").slice(0,160)}</div>`;
}

function renderAchievements(state){
  const wrap = document.getElementById("achievements");
  if(!wrap) return;
  const d = todayISO();
  const todays = (state.logs || []).filter(x => x.date === d).slice(-8).reverse();
  const metric = (state.metrics || []).find(x => x.date === d);
  const checks = [];
  if(metric?.criticalDone) checks.push({ok:true, text:"✅ Crítica hecha"});
  if(metric && (metric.energy !== null || metric.focus !== null || metric.sleep !== null || metric.mood !== null || metric.move)) checks.push({ok:true, text:"📊 Registro diario"});
  const inboxCount = (state.inbox || []).length;
  if(inboxCount === 0) checks.push({ok:true, text:"📥 INBOX vacío"});
  if(checks.length === 0) checks.push({ok:false, text:"Empieza por 1 micro-paso: define la crítica mínima."});

  wrap.innerHTML = `
    <div class="tags" style="margin-bottom:10px">
      ${checks.map(c => `<span class="tag ${c.ok?"ok":"warn"}">${c.text}</span>`).join("")}
    </div>
    <div class="list">
      ${todays.length ? todays.map(l => `
        <div class="item">
          <div>
            <strong>• ${escapeHtml(l.text)}</strong>
            <small>${new Date(l.at || Date.now()).toLocaleTimeString()}</small>
          </div>
          <span class="tag">${escapeHtml(l.type)}</span>
        </div>
      `).join("") : `<div class="mini">Aún sin log hoy. Usa el timer o marca la crítica.</div>`}
    </div>
  `;
}
function renderInbox(state){
  const list = byId("inboxList");
  const input = byId("inboxInput");
  const btn = byId("inboxAdd");
  if(!list || !input || !btn) return;

  const draw = () => {
    list.innerHTML = "";
    state.inbox.slice().reverse().forEach((it, idxRev) => {
      const idx = state.inbox.length-1-idxRev;
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <strong>💡 ${escapeHtml(it.text)}</strong>
          <small>${new Date(it.at).toLocaleString()}</small>
          <div class="tags">
            <span class="tag">${it.type}</span>
          </div>
        </div>
        <div class="row">
          <button class="btn small ghost" data-act="toTask" title="Convertir a tarea">✅</button>
          <button class="btn small ghost" data-act="toInc" title="Enviar a incubadora">🧪</button>
          <button class="btn small ghost" data-act="del" title="Eliminar">🗑️</button>
        </div>
      `;
      div.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        const act = b.dataset.act;
        if(act === "del"){
          state.inbox.splice(idx,1);
        }else if(act === "toInc"){
          state.incubator.push({ title: it.text, at: it.at, note: "Desde INBOX" });
          state.inbox.splice(idx,1);
          logEvent(state,"note","INBOX → Incubadora");
          toast("Enviado a Incubadora");
        }else if(act === "toTask"){
          // push into minor list first empty slot
          const slot = state.today.minor.findIndex(x => !x);
          if(slot !== -1) state.today.minor[slot] = it.text;
          else state.today.notes = (state.today.notes ? state.today.notes + "\n" : "") + "- " + it.text;
          state.inbox.splice(idx,1);
          logEvent(state,"note","INBOX → Tarea");
          toast("Convertido a tarea (Menor/Notas)");
        }
        saveState(state);
        draw();
        renderToday(state);
        renderProjects(state);
      }));
      list.appendChild(div);
    });
    if(state.inbox.length === 0){
      list.innerHTML = `<div class="mini">INBOX vacío. Eso es bueno: cabeza más liviana.</div>`;
    }
  };

  btn.addEventListener("click", () => {
    const v = input.value.trim();
    if(!v) return;
    state.inbox.push({ text: v, at: new Date().toISOString(), type: "captura" });
    logEvent(state, "inbox", `INBOX +1: ${v.slice(0,60)}`);
    input.value = "";
    saveState(state);
    draw();
  });

  input.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){ e.preventDefault(); btn.click(); }
  });

  draw();
}

function renderToday(state){
  const critical = byId("tCritical");
  const imp = [byId("tImp1"), byId("tImp2"), byId("tImp3")];
  const minor = [byId("tMin1"), byId("tMin2"), byId("tMin3"), byId("tMin4"), byId("tMin5")];
  const notes = byId("tNotes");
  const btnSave = byId("todaySave");
  const btnDone = byId("criticalDone");

  if(!critical || !notes || !btnSave) return;

  critical.value = state.today.critical || "";
  imp.forEach((el,i)=> el && (el.value = state.today.important[i] || ""));
  minor.forEach((el,i)=> el && (el.value = state.today.minor[i] || ""));
  notes.value = state.today.notes || "";

  btnSave.addEventListener("click", () => {
    state.today.critical = critical.value.trim();
    state.today.important = imp.map(el => (el?.value || "").trim());
    state.today.minor = minor.map(el => (el?.value || "").trim());
    state.today.notes = notes.value;
    saveState(state);
    logEvent(state,"note","Plan del día guardado");
    renderAchievements(state);
    toast("Guardado");
  });

  if(btnDone){
    btnDone.addEventListener("click", () => {
      const d = todayISO();
      const row = state.metrics.find(x => x.date === d) || (() => {
        const r = {date:d, sleep:null, energy:null, focus:null, move:false, criticalDone:false, mood:null, note:""};
        state.metrics.push(r);
        return r;
      })();
      row.criticalDone = true;
      logEvent(state, "critical", "Crítica marcada como hecha ✅");
      saveState(state);
      renderAchievements(state);
      toast("Crítica marcada como hecha ✅");
    });
  }
}

function renderBlocks(state){
  const wrap = byId("blocksWrap");
  if(!wrap) return;
  wrap.innerHTML = "";
  state.blocks.forEach((b, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <strong>🧠 ${escapeHtml(b.mode)}</strong>
        <small>${b.minutes} minutos</small>
      </div>
      <div class="row">
        <select class="input" style="width:auto" aria-label="Modo">
          ${["Crear","Construir","Gestionar","Cuidar"].map(m => `<option ${m===b.mode?"selected":""}>${m}</option>`).join("")}
        </select>
        <input class="input" style="width:110px" type="number" min="15" max="180" value="${b.minutes}" aria-label="Minutos">
        <button class="btn small ghost" title="Eliminar">🗑️</button>
      </div>
    `;
    const sel = div.querySelector("select");
    const inp = div.querySelector("input");
    const del = div.querySelector("button");
    sel.addEventListener("change", () => { state.blocks[i].mode = sel.value; saveState(state); });
    inp.addEventListener("change", () => { state.blocks[i].minutes = Math.max(15, Math.min(180, parseInt(inp.value||"60",10))); saveState(state); });
    del.addEventListener("click", () => { state.blocks.splice(i,1); saveState(state); renderBlocks(state); });
    wrap.appendChild(div);
  });
  const btnAdd = byId("blockAdd");
  if(btnAdd){
    btnAdd.onclick = () => {
      state.blocks.push({mode:"Crear", minutes:60});
      saveState(state);
      renderBlocks(state);
    };
  }
}

function renderProjects(state){
  const wrap = byId("projectsWrap");
  const addBtn = byId("projAdd");
  const incubWrap = byId("incWrap");
  const incubAdd = byId("incAdd");
  if(!wrap) return;

  const draw = () => {
    wrap.innerHTML = "";
    const active = state.projects;
    active.forEach((p, idx) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div style="min-width:0">
          <strong>🚀 ${escapeHtml(p.title)}</strong>
          <small>${escapeHtml(p.purpose || "Propósito: definir en 1 línea.")}</small>
          <div class="tags">
            <span class="tag ok">Activo</span>
            <span class="tag">${escapeHtml(p.next || "Siguiente acción")}</span>
          </div>
        </div>
        <div class="row">
          <button class="btn small ghost" data-act="edit" title="Editar">✏️</button>
          <button class="btn small ghost" data-act="pause" title="Enviar a incubadora">🧪</button>
          <button class="btn small ghost" data-act="del" title="Eliminar">🗑️</button>
        </div>
      `;
      div.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        const act = b.dataset.act;
        if(act==="del"){
          state.projects.splice(idx,1);
          saveState(state);
          draw();
        } else if(act==="pause"){
          state.incubator.push({ title:p.title, at:new Date().toISOString(), note:"Pausado desde Activos" });
          state.projects.splice(idx,1);
          saveState(state);
          draw();
          renderIncubator(state);
          toast("Movido a Incubadora");
        } else if(act==="edit"){
          const title = prompt("Nombre del proyecto", p.title) ?? p.title;
          const purpose = prompt("Propósito (1 línea)", p.purpose || "") ?? (p.purpose||"");
          const next = prompt("Siguiente acción concreta", p.next || "") ?? (p.next||"");
          state.projects[idx] = { ...p, title:title.trim(), purpose:purpose.trim(), next:next.trim() };
          saveState(state);
          draw();
        }
      }));
      wrap.appendChild(div);
    });

    if(active.length === 0){
      wrap.innerHTML = `<div class="mini">Sin proyectos activos. Define hasta 3 (máximo). Lo demás va a Incubadora.</div>`;
    }
    const count = byId("projCount");
    if(count) count.textContent = `${active.length}/3 activos`;
  };

  if(addBtn){
    addBtn.onclick = () => {
      if(state.projects.length >= 3){
        toast("Máximo 3 proyectos activos. Envía otros a Incubadora.");
        return;
      }
      const title = prompt("Nombre del proyecto (activo)")?.trim();
      if(!title) return;
      const purpose = prompt("Propósito (1 línea)")?.trim() || "";
      const next = prompt("Siguiente acción concreta")?.trim() || "";
      state.projects.push({ title, purpose, next, createdAt: new Date().toISOString() });
      saveState(state);
      draw();
    };
  }

  function renderIncubator(st){
    if(!incubWrap) return;
    incubWrap.innerHTML = "";
    st.incubator.slice().reverse().forEach((it, idxRev) => {
      const idx = st.incubator.length-1-idxRev;
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <strong>🧪 ${escapeHtml(it.title)}</strong>
          <small>${new Date(it.at).toLocaleString()} · ${escapeHtml(it.note || "")}</small>
        </div>
        <div class="row">
          <button class="btn small ghost" title="Activar (si hay cupo)" data-act="activate">🚀</button>
          <button class="btn small ghost" title="Eliminar" data-act="del">🗑️</button>
        </div>
      `;
      div.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        const act = b.dataset.act;
        if(act==="del"){
          st.incubator.splice(idx,1);
        } else if(act==="activate"){
          if(st.projects.length >= 3){
            toast("No hay cupo: 3 proyectos activos.");
            return;
          }
          st.projects.push({ title: it.title, purpose:"", next:"", createdAt: new Date().toISOString() });
          st.incubator.splice(idx,1);
          toast("Activado ✅");
        }
        saveState(st);
        draw();
        renderIncubator(st);
      }));
      incubWrap.appendChild(div);
    });
    if(st.incubator.length === 0){
      incubWrap.innerHTML = `<div class="mini">Incubadora vacía. Aquí van ideas buenas sin presión.</div>`;
    }
  }
  renderIncubator(state);
  if(incubAdd){
    incubAdd.onclick = () => {
      const t = prompt("Idea / proyecto en incubadora")?.trim();
      if(!t) return;
      state.incubator.push({ title:t, at:new Date().toISOString(), note:"Capturado manualmente" });
      saveState(state);
      renderIncubator(state);
    };
  }

  draw();
}

function escapeHtml(s){
  return String(s || "").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function init(){
  initShell(location.pathname.endsWith("/") ? "/index.html" : location.pathname);

  const state = loadState();
  renderInbox(state);
  renderToday(state);
  renderBlocks(state);
  renderProjects(state);

  const streakEl = document.getElementById("streak");
  if(streakEl){
    const days = computeCriticalStreak(state.metrics);
    streakEl.textContent = `${days} días`;
  }

  const tipEl = document.getElementById("dailyTip");
  if(tipEl){
    const tips = [
      "Regla de oro: nada importante se piensa dos veces. Se captura una vez.",
      "No es falta de voluntad. Es falta de arquitectura.",
      "Hoy: 1 crítica. Si sale, el día fue exitoso.",
      "No mezcles modos: Crear/Construir/Gestionar/Cuidar.",
      "Si estás saturado: pausa física 3–5 min, luego 25 min de ejecución."
    ];
    tipEl.textContent = tips[Math.floor(Math.random()*tips.length)];
  }
}

function computeCriticalStreak(metrics){
  // consecutive days from today backwards where criticalDone is true
  const map = new Map(metrics.map(r => [r.date, !!r.criticalDone]));
  let d = new Date();
  const tz = d.getTimezoneOffset();
  d = new Date(d.getTime() - tz*60000);
  let count = 0;
  for(let i=0;i<365;i++){
    const key = d.toISOString().slice(0,10);
    if(map.get(key)){
      count++;
      d.setDate(d.getDate()-1);
    }else{
      break;
    }
  }
  return count;
}

document.addEventListener("DOMContentLoaded", init);
