let _audio: HTMLAudioElement | null = null;
let _lastPlayedAt = 0;
let _isPrimed = false;

const SOUND_COOLDOWN_MS = 2000;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio("/notification-sound.mp3");
    _audio.preload = "auto";
    _audio.volume = 0.6;
  }
  return _audio;
}

/**
 * Prime audio on user gesture so subsequent auto-plays aren't blocked.
 * Idempotent — safe to call on every click/keydown; only does work once.
 */
export function primeNotificationAudio(): void {
  if (_isPrimed) return;
  const audio = getAudio();
  audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      _isPrimed = true;
    })
    .catch(() => {});
}

/**
 * Play the notification sound.
 * Debounced to 2 s so back-to-back triggers only produce one sound unless forced.
 */
export function playNotificationSound(options?: { force?: boolean }): void {
  const force = options?.force === true;
  const now = Date.now();
  if (!force && now - _lastPlayedAt < SOUND_COOLDOWN_MS) return;

  const audio = getAudio();
  audio.currentTime = 0;
  audio
    .play()
    .then(() => {
      _lastPlayedAt = now;
    })
    .catch(() => {
      /* autoplay blocked — ignore */
    });
}

/** No-op kept for callers that flush after gesture unlock. */
export function flushPendingNotificationSound(): void {
  playNotificationSound({ force: true });
}
