// Aviso sonoro de pedido novo (WebAudio, sem arquivo). O navegador só libera som depois de um clique do usuário,
// por isso o painel tem o botão "Som": ao ativar, criamos o AudioContext.
let ctx = null;

export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  } catch {
    return false;
  }
}

function beep(at, freq, duration = 0.18) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** campainha de 3 toques */
export function playAlert() {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  beep(t, 880); beep(t + 0.22, 1175); beep(t + 0.44, 880, 0.3);
}
