
const STORE_KEY = "pancho_ce_v1";

const defaultState = () => ({
  meta: { version: 1, createdAt: new Date().toISOString() },
  profile: { owner1: "Pancho", owner2: "Belén", mode: "hybrid" },
  inbox: [],
  today: { critical: "", important: ["","",""], minor: ["","","","",""], notes: "" },
  blocks: [{mode:"Crear", minutes:90},{mode:"Construir", minutes:90},{mode:"Gestionar", minutes:45},{mode:"Cuidar", minutes:45}],
  projects: [],
  incubator: [],
  manual: {
    good: "Cuando estoy bien: duermo mejor, avanzo en 1 crítica, estoy más calmo y claro.",
    early: "Señales tempranas: demasiadas ideas sin ejecución, urgencia constante, irritabilidad, postergar correos.",
    triggers: "Gatillantes: interrupciones, demasiados frentes, tareas administrativas largas, incertidumbre.",
    protoSaturation: "Protocolo Saturación (20–40 min): 1) Pausa física 3–5 min. 2) Descargar INBOX. 3) Elegir 1 crítica mínima. 4) Bloque 25 min. 5) Cierre dejando siguiente paso.",
    protoHyperfocus: "Protocolo Hiperfoco: temporizador + pausa obligatoria, agua/comida, cierre de sesión dejando el siguiente paso escrito.",
    agreements: "Acuerdos con Belén: check-in semanal 15 min. Palabras clave: 'Necesito contención' / 'Necesito estructura'. Señal de saturación acordada."
  },
  checkins: [], // {date:'YYYY-MM-DD', mood:'🙂', need:'contencion'|'estructura', note:''}
  logs: [], // {date:'YYYY-MM-DD', type:'critical'|'block'|'metric'|'inbox'|'note', text:''}
  ui: { focusMode:false, crisisMode:false },
  metrics: [] // {date:'YYYY-MM-DD', sleep:7, energy:3, focus:3, move:true, criticalDone:true, mood:3, note:""}
});

export function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  }catch(e){
    console.warn("State load failed", e);
    return defaultState();
  }
}

export function saveState(state){
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export function resetState(){
  localStorage.removeItem(STORE_KEY);
}

export function exportState(){
  return JSON.stringify(loadState(), null, 2);
}

export function importState(jsonText){
  const parsed = JSON.parse(jsonText);
  localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
  return loadState();
}
