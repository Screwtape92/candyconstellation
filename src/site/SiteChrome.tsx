import { useEffect, useState } from 'react'

// One taskbar button per section, in scroll order. Short pseudo-filenames
// match the window-chrome convention already used on the bottle/label frames
// (bottle.iff, label.iff) rather than plain nav-link words.
const SECTIONS = [
  { id: 'top', label: 'ALE.WIN' },
  { id: 'game', label: 'GAME.WIN' },
  { id: 'how', label: 'HOWTO.WIN' },
  { id: 'board', label: 'BOARD.WIN' },
  { id: 'fest', label: 'FEST.WIN' },
]

export function SiteNav({ onPlay }: { onPlay: () => void }) {
  return (
    <nav className="sticky top-0 z-20 flex items-center gap-5 border-b border-rim bg-[color-mix(in_srgb,var(--color-night-deep)_90%,transparent)] px-[clamp(1.25rem,4vw,3.5rem)] py-3 backdrop-blur-[10px]">
      <a
        href="#top"
        className="font-display text-lg font-extrabold whitespace-nowrap text-taffy"
      >
        Candy <b className="font-extrabold text-sky-candy">Constellation</b>
      </a>

      <button
        type="button"
        onClick={onPlay}
        className="ml-auto cursor-pointer border-2 border-rim bg-bubblegum px-6 py-1.5 font-display font-extrabold text-night-deep shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.35),inset_2px_2px_0_rgba(255,255,255,0.18)] transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_2px_2px_0_rgba(0,0,0,0.35),inset_-2px_-2px_0_rgba(255,255,255,0.18)]"
      >
        Play
      </button>
    </nav>
  )
}

/**
 * Replaces the old top-nav link list with a Windows-95-taskbar-style bar,
 * docked to the bottom of the viewport the whole time you're on the page —
 * a genuine layout change, not a re-skin. The real taskbar's own stated
 * design goal was switching between windows "as simple as changing channels
 * on a TV"; here each "window" is a page section, highlighted as you scroll
 * past it via IntersectionObserver rather than staying static like a plain
 * link list. Approved via the mockup at
 * https://claude.ai/code/artifact/efd948a1-ea8e-4ad9-9d12-6fd388127e85.
 */
export function SiteTaskbar() {
  const [active, setActive] = useState('top')
  const [clock, setClock] = useState('')

  useEffect(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    // Treats the vertical band around 40-45% down the viewport as "current" —
    // roughly where a reader's eye sits — rather than "any pixel visible",
    // which would flag two adjacent sections at once during a scroll.
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (mostVisible) {
          setActive(mostVisible.target.id)
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    targets.forEach((el) => {
      observer.observe(el)
    })
    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const updateClock = () => {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    updateClock()
    const intervalId = window.setInterval(updateClock, 30_000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <nav
      aria-label="Jump to section"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-1.5 overflow-x-auto border-t-2 border-rim bg-panel px-3 py-2"
    >
      {SECTIONS.map((section) => {
        const isActive = active === section.id
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={`shrink-0 border-2 border-rim px-3 py-1.5 font-mono text-[0.6875rem] whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-bubblegum text-night-deep shadow-[inset_1px_1px_0_rgba(0,0,0,0.35),inset_-1px_-1px_0_rgba(255,255,255,0.15)]'
                : 'bg-night-deep text-cream shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.35),inset_1px_1px_0_rgba(255,255,255,0.12)]'
            }`}
          >
            {section.label}
          </a>
        )
      })}
      <span className="ml-auto shrink-0 pl-2 font-mono text-[0.6875rem] text-dim">
        {clock}
      </span>
    </nav>
  )
}

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[1160px] border-t border-rim px-[clamp(1.25rem,4vw,3.5rem)] pt-9 pb-24 text-[0.8125rem] text-dim">
      <p>
        Candy Constellation — an AgileBridge birthday beerfest thing. Desktop
        only.
      </p>
      <p className="mt-1.5">
        Game sprites from Kenney.nl (CC0). Built with Phaser.
      </p>
    </footer>
  )
}
