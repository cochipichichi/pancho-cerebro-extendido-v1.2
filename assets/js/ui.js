
import { loadState, saveState, exportState, importState, resetState } from "./storage.js";
import { toggleNarrationFor, isNarratorOn, stopSpeak } from "./narrator.js";

export function initShell(activePath){
  const root = document.documentElement;

  const theme = localStorage.getItem("ce_theme") || "dark";
  root.setAttribute("data-theme", theme);

  const contrast = localStorage.getItem("ce_contrast") || "normal";
  if(contrast === "high") root.setAttribute("data-contrast","high");

  const fs = parseFloat(localStorage.getItem("ce_fontScale") || "1");
  root.style.setProperty("--fontScale", String(fs));

  const lang = localStorage.getItem("ce_lang") || "es-CL";
  localStorage.setItem("ce_lang", lang);

  // nav active
  document.querySelectorAll("[data-nav]").forEach(a => {
    const p = a.getAttribute("href");
    if(p === activePath) a.classList.add("active");
  });

  // controls
  const btnTheme = document.getElementById("btnTheme");
  const btnFontUp = document.getElementById("btnFontUp");
  const btnFontDown = document.getElementById("btnFontDown");
  const btnNarrator = document.getElementById("btnNarrator");
  const btnContrast = document.getElementById("btnContrast");
  const btnExport = document.getElementById("btnExport");
  const btnImport = document.getElementById("btnImport");
  const fileImport = document.getElementById("fileImport");
  const btnReset = document.getElementById("btnReset");

  if(btnTheme) btnTheme.addEventListener("click", () => {
    const now = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", now);
    localStorage.setItem("ce_theme", now);
  });

  if(btnContrast) btnContrast.addEventListener("click", () => {
    const isHigh = root.getAttribute("data-contrast") === "high";
    if(isHigh){
      root.removeAttribute("data-contrast");
      localStorage.setItem("ce_contrast", "normal");
    }else{
      root.setAttribute("data-contrast", "high");
      localStorage.setItem("ce_contrast", "high");
    }
  });

  if(btnFontUp) btnFontUp.addEventListener("click", () => {
    const cur = parseFloat(localStorage.getItem("ce_fontScale") || "1");
    const next = Math.min(1.35, Math.round((cur + 0.05)*100)/100);
    localStorage.setItem("ce_fontScale", String(next));
    root.style.setProperty("--fontScale", String(next));
  });

  if(btnFontDown) btnFontDown.addEventListener("click", () => {
    const cur = parseFloat(localStorage.getItem("ce_fontScale") || "1");
    const next = Math.max(0.9, Math.round((cur - 0.05)*100)/100);
    localStorage.setItem("ce_fontScale", String(next));
    root.style.setProperty("--fontScale", String(next));
  });

  if(btnNarrator){
    const updateNarratorUI = () => {
      const on = isNarratorOn();
      btnNarrator.setAttribute("aria-pressed", on ? "true":"false");
      btnNarrator.innerHTML = on ? "🔊 Narrador: ON" : "🔈 Narrador: OFF";
    };
    updateNarratorUI();
    btnNarrator.addEventListener("click", () => {
      const main = document.querySelector("main") || document.body;
      const on = toggleNarrationFor(main);
      if(!on) stopSpeak();
      updateNarratorUI();
    });
  }

  if(btnExport) btnExport.addEventListener("click", () => {
    const data = exportState();
    const blob = new Blob([data], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pancho-ce-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  if(btnImport && fileImport){
    btnImport.addEventListener("click", () => fileImport.click());
    fileImport.addEventListener("change", async () => {
      const f = fileImport.files?.[0];
      if(!f) return;
      const text = await f.text();
      importState(text);
      location.reload();
    });
  }

  if(btnReset){
    btnReset.addEventListener("click", () => {
      if(confirm("Esto borrará tus datos locales del dashboard (localStorage). ¿Continuar?")){
        resetState();
        location.reload();
      }
    });
  }

  // PWA
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register(new URL((location.pathname.includes("/pages/") ? "../service-worker.js" : "service-worker.js"), location.href)).catch(()=>{});
  }
}

export function toast(msg){
  const el = document.createElement("div");
  el.className = "badge";
  el.style.position = "fixed";
  el.style.right = "16px";
  el.style.bottom = "86px";
  el.style.zIndex = "999";
  el.style.boxShadow = "var(--shadow)";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 2600);
}
