
import { loadState, saveState } from "./storage.js";
import { initShell, toast } from "./ui.js";

function byId(id){ return document.getElementById(id); }

function init(){
  initShell("/pages/manual.html");
  const state = loadState();
  const m = state.manual;

  byId("good").value = m.good || "";
  byId("early").value = m.early || "";
  byId("triggers").value = m.triggers || "";
  byId("sat").value = m.protoSaturation || "";
  byId("hyper").value = m.protoHyperfocus || "";
  byId("agreements").value = m.agreements || "";

  byId("saveManual").addEventListener("click", () => {
    state.manual = {
      good: byId("good").value,
      early: byId("early").value,
      triggers: byId("triggers").value,
      protoSaturation: byId("sat").value,
      protoHyperfocus: byId("hyper").value,
      agreements: byId("agreements").value
    };
    saveState(state);
    toast("Manual guardado");
  });
}

document.addEventListener("DOMContentLoaded", init);
