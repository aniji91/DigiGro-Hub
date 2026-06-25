const STORAGE_KEY = "workhub-chat-sound";

let audioCtx = null;

export function isChatSoundEnabled() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "true";
}

export function setChatSoundEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

function getAudioContext() {
  if (!audioCtx && typeof window !== "undefined") {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  return audioCtx;
}

export function unlockChatSound() {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

function playTone(ctx, mention) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";

  if (mention) {
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(1174, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.28);
  } else {
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.start(now);
    osc.stop(now + 0.16);
  }
}

export function playChatSound({ mention = false } = {}) {
  if (!isChatSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().then(() => playTone(ctx, mention)).catch(() => {});
      return;
    }

    playTone(ctx, mention);
  } catch {
    // Browsers may block audio until user interaction
  }
}
