import { useEffect, useState } from 'react'

// Timings for the three-beat sequence: bottle grows in, the wordmark settles
// over it, then the whole thing fades to reveal the real page underneath
// (which is already mounted the whole time — this is an overlay, not a
// separate route, so there's nothing to load once it clears).
const GROW_MS = 900
const TITLE_MS = 1300
const FADE_MS = 700

type Phase = 'grow' | 'title' | 'out'

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('grow')

  useEffect(() => {
    // A forced multi-second animated intro is exactly what
    // prefers-reduced-motion asks to skip — straight to the real page.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }
    const toTitle = setTimeout(() => setPhase('title'), GROW_MS)
    const toOut = setTimeout(() => setPhase('out'), GROW_MS + TITLE_MS)
    const finish = setTimeout(
      onDone,
      GROW_MS + TITLE_MS + FADE_MS,
    )
    return () => {
      clearTimeout(toTitle)
      clearTimeout(toOut)
      clearTimeout(finish)
    }
  }, [onDone])

  const grown = phase !== 'grow'

  return (
    // Click, Enter or Escape all skip straight to the site — a one-time
    // flourish should never trap anyone who's already seen it.
    <div
      role="button"
      tabIndex={0}
      onClick={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          onDone()
        }
      }}
      aria-label="Skip intro"
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-night-deep transition-opacity duration-700 ${
        phase === 'out' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(60%_60%_at_50%_45%,color-mix(in_srgb,var(--color-bubblegum)_20%,transparent)_0%,transparent_70%)]" />

      <img
        src="/assets/site/bottle-960.webp"
        alt=""
        aria-hidden="true"
        className={`relative w-full max-w-[440px] px-10 transition-all duration-[900ms] ease-out sm:max-w-[560px] ${
          grown ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />

      <div
        className={`relative mt-2 flex flex-col items-center text-center transition-all duration-700 ease-out ${
          phase === 'title' || phase === 'out'
            ? 'translate-y-0 opacity-100'
            : 'translate-y-3 opacity-0'
        }`}
      >
        <h1 className="font-display text-[clamp(2rem,7vw,3.75rem)] leading-[0.95] font-extrabold text-taffy">
          Candy <span className="text-sky-candy">Constellation</span>
        </h1>
        <span className="ribbon mt-4 inline-block bg-bubblegum px-5 py-1.5 font-body text-xs font-bold tracking-[0.28em] text-night uppercase">
          Space Exploration
        </span>
      </div>

      <span className="absolute bottom-6 right-6 font-mono text-xs tracking-[0.12em] text-dim">
        SKIP →
      </span>
    </div>
  )
}
