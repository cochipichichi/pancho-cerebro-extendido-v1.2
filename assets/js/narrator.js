
let speaking = false;

export function isNarratorOn(){
  return localStorage.getItem("ce_narrator") === "on";
}
export function setNarrator(on){
  localStorage.setItem("ce_narrator", on ? "on" : "off");
}
export function stopSpeak(){
  try { window.speechSynthesis.cancel(); } catch(e){}
  speaking = false;
}
export function speakText(text){
  if(!("speechSynthesis" in window)) return;
  stopSpeak();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = (localStorage.getItem("ce_lang") || "es-CL");
  u.rate = 1;
  u.pitch = 1;
  u.onend = () => { speaking = false; };
  speaking = true;
  window.speechSynthesis.speak(u);
}
export function toggleNarrationFor(el){
  const on = !isNarratorOn();
  setNarrator(on);
  if(on){
    const text = el ? el.innerText : document.body.innerText;
    speakText(text.slice(0, 2500));
  } else {
    stopSpeak();
  }
  return on;
}
