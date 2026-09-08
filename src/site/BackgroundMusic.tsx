import { useEffect, useRef } from 'react'

// TUNABLE — playtest, not final (see docs/game-design.md "Audio spec").
const MUSIC_VOLUME = 0.4

// Site-wide background music: mounted once at the App root (not inside any
// one view), so it plays continuously across Landing/BuildStory/in-game/
// PostGame/Leaderboard and is never stopped or restarted by navigating
// between them — "must always play, game or no game" (2026-09-08). This is
// deliberately separate from the Phaser-side SFX (BlasterSystem's fire
// loop, etc.): a plain HTML5 <audio> element outlives any one Phaser.Game
// instance, which gets destroyed and recreated every run.
//
// Browsers hard-block unmuted audio until the page has seen a genuine user
// gesture (click, tap, keypress) — no code can start it before that, in any
// browser. Confirmed 2026-09-08: with zero interaction (letting IntroSplash
// auto-dismiss on its own ~6s timer, never clicking it), nothing plays until
// whatever the player's first-ever click turns out to be. That's not a bug
// in this component — it's the same for literally any site with audio — but
// it means "starts on page load" isn't achievable; "starts on the first
// click/keypress of any kind, wherever it happens" is the real contract here.
//
// The mount-time attemptPlay() call below is guaranteed to be blocked (no
// gesture exists yet) — it's there anyway because calling play() is what
// actually kicks off buffering the file. Without it (tried removing it
// 2026-09-08), the browser can leave the element essentially unloaded until
// the first real play() call, so *that* call — the one racing to satisfy an
// actual gesture — sometimes loses the race against the file still being
// fetched and silently fails. Calling it early, blocked or not, means the
// file is already loaded by the time a real gesture arrives.
// Every event type any browser's autoplay policy might specifically require
// as "the" qualifying gesture — Chrome's is permissive about which one
// (pointerdown is enough), but Safari's WebKit policy is stricter and wants
// the play() call to be the direct result of a *click* or *keydown*
// specifically, not the earlier-firing pointerdown/mousedown. Listening for
// all of them, in the capture phase (so nothing upstream calling
// stopPropagation on the bubble phase can swallow it first), covers every
// browser's policy rather than assuming Chrome's is the only one that
// matters.
const GESTURE_EVENTS = [
  'pointerdown',
  'mousedown',
  'click',
  'keydown',
  'touchend',
] as const

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    audio.volume = MUSIC_VOLUME

    const attemptPlay = () => {
      void audio.play().catch(() => {
        // Still blocked (no qualifying gesture yet) — the next interaction
        // retries.
      })
    }
    attemptPlay()

    const onPlaying = () => {
      for (const type of GESTURE_EVENTS) {
        window.removeEventListener(type, attemptPlay, true)
      }
    }
    audio.addEventListener('playing', onPlaying)
    for (const type of GESTURE_EVENTS) {
      window.addEventListener(type, attemptPlay, true)
    }

    return () => {
      audio.removeEventListener('playing', onPlaying)
      for (const type of GESTURE_EVENTS) {
        window.removeEventListener(type, attemptPlay, true)
      }
    }
  }, [])

  return (
    <audio
      ref={audioRef}
      src="/assets/audio/background-music.wav"
      loop
      preload="auto"
      // Hidden — this is ambient music, not a control the player interacts
      // with directly (no on-page audio player UI exists yet).
      className="hidden"
    />
  )
}
