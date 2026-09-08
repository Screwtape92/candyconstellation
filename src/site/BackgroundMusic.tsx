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
// Browsers block audio autoplay before a user gesture, so playback can't
// just start on mount — it retries on the first click/keydown anywhere on
// the page (which happens very quickly in practice: the IntroSplash and
// every button are all valid gestures) and stops retrying once it actually
// starts.
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
        // Autoplay still blocked — the next interaction retries.
      })
    }
    attemptPlay()

    const onPlaying = () => {
      window.removeEventListener('pointerdown', attemptPlay)
      window.removeEventListener('keydown', attemptPlay)
    }
    audio.addEventListener('playing', onPlaying)
    window.addEventListener('pointerdown', attemptPlay)
    window.addEventListener('keydown', attemptPlay)

    return () => {
      audio.removeEventListener('playing', onPlaying)
      window.removeEventListener('pointerdown', attemptPlay)
      window.removeEventListener('keydown', attemptPlay)
    }
  }, [])

  return (
    <audio
      ref={audioRef}
      src="/assets/audio/background-music.wav"
      loop
      autoPlay
      // Hidden — this is ambient music, not a control the player interacts
      // with directly (no on-page audio player UI exists yet).
      className="hidden"
    />
  )
}
