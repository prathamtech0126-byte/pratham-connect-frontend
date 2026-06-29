/**
 * Notification sound — /notification-sound.mp3 from client/public.
 * Plays immediately on alert; repeats at most once every 10 seconds.
 */

const NOTIFICATION_SOUND_SRC = "/notification-sound.mp3";
const SOUND_COOLDOWN_MS = 10_000;

let _lastPlayedAt = 0;
let _audioCtx: AudioContext | null = null;
let _audio: HTMLAudioElement | null = null;
let _unlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!_audioCtx) {
    _audioCtx = new Ctx();
  }
  return _audioCtx;
}

function getSharedAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio(NOTIFICATION_SOUND_SRC);
    _audio.preload = "auto";
    _audio.volume = 0.85;
    _audio.load();
  }
  return _audio;
}

function playWebAudioChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const run = () => {
    const now = ctx.currentTime;
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(880, now, 0.14);
    playTone(1174.66, now + 0.1, 0.22);
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

async function playSharedMp3(): Promise<boolean> {
  const audio = getSharedAudio();
  try {
    audio.pause();
    audio.currentTime = 0;
    await audio.play();
    _unlocked = true;
    return true;
  } catch (err) {
    console.warn("[notification-sound] play failed:", err);
    return false;
  }
}

export function primeNotificationAudio() {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume();
  }

  if (_unlocked) return;

  const audio = getSharedAudio();
  void (async () => {
    try {
      const prevVolume = audio.volume;
      audio.volume = 0;
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = prevVolume;
      _unlocked = true;
    } catch {
      /* needs a user gesture — handlers will retry */
    }
  })();
}

/** Instant play; same sound won't repeat within 10 seconds unless forced. */
export function playNotificationSound(options?: { force?: boolean }) {
  const now = Date.now();
  if (!options?.force && now - _lastPlayedAt < SOUND_COOLDOWN_MS) return;
  _lastPlayedAt = now;

  void playSharedMp3().then((played) => {
    if (!played) playWebAudioChime();
  });
}

if (typeof window !== "undefined") {
  getSharedAudio();
}
