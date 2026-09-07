import { useEffect, useState } from 'react'

// Timings for the four-beat sequence: a typed boot log, then the bottle
// grows in, the wordmark settles over it, then the whole thing fades to
// reveal the real page underneath (which is already mounted the whole time —
// this is an overlay, not a separate route, so there's nothing to load once
// it clears). The boot beat is the retro-computer direction's own device —
// Poolsuite.net is the real, working precedent for "one typed boot-up
// moment, then everything settles and stays calm" (see the mockup at
// https://claude.ai/code/artifact/efd948a1-ea8e-4ad9-9d12-6fd388127e85).
const BOOT_MS = 1500
const GROW_MS = 900
const TITLE_MS = 1300
const FADE_MS = 700

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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }
    const toGrow = setTimeout(() => setPhase('grow'), BOOT_MS)
    const toTitle = setTimeout(() => setPhase('title'), BOOT_MS + GROW_MS)
    const toOut = setTimeout(
      () => setPhase('out'),
      BOOT_MS + GROW_MS + TITLE_MS,
    )
    const finish = setTimeout(
      onDone,
      BOOT_MS + GROW_MS + TITLE_MS + FADE_MS,
    )
    return () => {
      clearTimeout(toGrow)
      clearTimeout(toTitle)
      clearTimeout(toOut)
      clearTimeout(finish)
    }
  }, [onDone])

  const booting = phase === 'boot'
  const grown = phase === 'grow' || phase === 'title' || phase === 'out'
  const titled = phase === 'title' || phase === 'out'

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
                    animation: `boot-type 0.5s steps(24) forwards`,
                    animationDelay: `${i * 0.45}s`,
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
        className={`relative w-full max-w-[440px] px-10 transition-all duration-[900ms] ease-out sm:max-w-[560px] ${
          grown ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />

      <div
        className={`relative mt-2 flex flex-col items-center text-center transition-all duration-700 ease-out ${
          titled ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
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
