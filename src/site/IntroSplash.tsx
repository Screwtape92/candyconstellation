import { useEffect, useState } from 'react'

import { PlayButton } from './ui'

// Timings for the reveal: a typed boot log, then the bottle grows in, then
// the wordmark settles over it. The boot beat is the retro-computer
// direction's own device — Poolsuite.net is the real, working precedent for
// "one typed boot-up moment, then everything settles and stays calm" (see
// the mockup at https://claude.ai/code/artifact/efd948a1-ea8e-4ad9-9d12-6fd388127e85).
//
// Dismissal requires a real click/keypress — changed 2026-09-08. It used to
// auto-advance to the real page after TITLE_MS with nothing required; now it
// sits at "title" indefinitely once fully revealed, the way an old
// computer's boot screen waits at a "press any key" prompt. This exists
// specifically so background music (BackgroundMusic.tsx) reliably gets the
// user gesture every browser's autoplay policy requires before it can play
// — every visitor's first gesture now lands here, within the first few
// seconds, rather than "whenever they happen to click something else."
const BOOT_MS = 2400
const GROW_MS = 1200
const FADE_MS = 800

type Phase = 'boot' | 'grow' | 'title' | 'out'

const BOOT_LINES = [
  'CANDY-OS v1.0',
  'INITIALISING BOTTLE.IFF...',
  'MOUNTING GUMMY-METEOR.SPR, JAWBREAKER.SPR, SOUR-COMET.SPR...',
  'WORKBENCH READY.',
]

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('boot')

  useEffect(() => {
    // A forced multi-second animated intro is exactly what
    // prefers-reduced-motion asks to skip — straight to the real page.
    // Deliberately still bypasses the click requirement below too: forcing
    // an interaction with an animation this visitor explicitly opted out of
    // would be worse than occasionally missing the early-music guarantee.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }
    const toGrow = setTimeout(() => setPhase('grow'), BOOT_MS)
    const toTitle = setTimeout(() => setPhase('title'), BOOT_MS + GROW_MS)
    return () => {
      clearTimeout(toGrow)
      clearTimeout(toTitle)
    }
  }, [onDone])

  const booting = phase === 'boot'
  const grown = phase === 'grow' || phase === 'title' || phase === 'out'
  const titled = phase === 'title' || phase === 'out'

  // The only path to 'out': a real click/keypress, never a timer — see the
  // dismissal note above. Guarded against firing twice (e.g. a stray keydown
  // during the fade) since that would schedule two onDone calls.
  const handleDismiss = () => {
    if (phase === 'out') {
      return
    }
    setPhase('out')
    setTimeout(onDone, FADE_MS)
  }

  return (
    // Click, Enter, Space or Escape all dismiss — early (skipping the
    // animation) or once it's fully revealed (the only way past it now).
    <div
      role="button"
      tabIndex={0}
      onClick={handleDismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          handleDismiss()
        }
      }}
      aria-label="Enter site"
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-night-deep transition-opacity duration-700 ${
        phase === 'out' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(60%_60%_at_50%_45%,color-mix(in_srgb,var(--color-bubblegum)_20%,transparent)_0%,transparent_70%)]" />

      <div
        className={`absolute inset-x-0 top-0 flex flex-col justify-center gap-1.5 px-10 py-8 font-mono text-sm text-cream transition-opacity duration-500 ${
          booting ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ height: 'min(420px, 55vh)' }}
        aria-hidden="true"
      >
        {BOOT_LINES.map((line, i) => (
          <div
            key={line}
            className="max-w-[34ch] overflow-hidden whitespace-nowrap"
            style={
              booting
                ? {
                    width: 0,
                    animation: `boot-type 0.65s steps(24) forwards`,
                    animationDelay: `${i * 0.55}s`,
                  }
                : { width: '34ch' }
            }
          >
            {line}
          </div>
        ))}
      </div>

      <img
        src="/assets/site/bottle-960.webp"
        alt=""
        aria-hidden="true"
        className={`relative w-full max-w-[440px] px-10 transition-all duration-[1200ms] ease-out sm:max-w-[560px] ${
          grown ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />

      <div
        className={`relative mt-2 flex flex-col items-center text-center transition-all duration-700 ease-out ${
          titled
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <h1 className="font-display text-[clamp(2rem,7vw,3.75rem)] leading-[0.95] font-extrabold text-taffy">
          Candy <span className="text-sky-candy">Constellation</span>
        </h1>
        <span className="ribbon mt-4 inline-block bg-bubblegum px-5 py-1.5 font-body text-xs font-bold tracking-[0.28em] text-night uppercase">
          Space Exploration
        </span>

        {/* An explicit CTA, not just the whole-screen click — now that
            dismissal is required (see the note above), "click somewhere on
            this overlay" needed a real button to point at. Stops its click
            from also bubbling to the overlay's own onClick below, which
            would otherwise fire handleDismiss twice for one tap (harmless,
            but there's no reason to rely on that). */}
        <div className="mt-8" onClick={(e) => e.stopPropagation()}>
          <PlayButton onClick={handleDismiss}>Let&rsquo;s go!</PlayButton>
        </div>
      </div>

      <span className="absolute bottom-6 right-6 font-mono text-xs tracking-[0.12em] text-dim">
        CLICK TO ENTER →
      </span>
    </div>
  )
}
