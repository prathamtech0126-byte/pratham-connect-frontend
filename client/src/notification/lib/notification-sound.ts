let _audio: HTMLAudioElement | null = null;
let _lastPlayedAt = 0;
let _isPrimed = false;

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
export function primeNotificationAudio() {
  if (_isPrimed) return;
  const audio = getAudio();
  audio.play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      _isPrimed = true;
    })
    .catch(() => {});
}

/**
 * Play the notification sound.
 * Debounced to 2 s so back-to-back triggers (e.g. lead:assigned:notify +
 * notification:new for the same event) only produce one sound.
 */
export function playNotificationSound() {
  const now = Date.now();
  if (now - _lastPlayedAt < 2000) return;
  _lastPlayedAt = now;

  const audio = getAudio();
  audio.currentTime = 0;
  audio.play().catch(() => {/* autoplay blocked — ignore */});
}
