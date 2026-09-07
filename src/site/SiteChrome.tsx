const NAV_LINKS = [
  { href: '#top', label: 'The ale' },
  { href: '#game', label: 'The game' },
  { href: '#how', label: 'How to play' },
  { href: '#board', label: 'Leaderboard' },
  { href: '#fest', label: 'The Beerfest' },
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

      <div className="ml-auto flex items-center gap-6 text-sm font-medium max-sm:hidden">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="border-b border-transparent pb-0.5 text-dim transition-colors hover:border-bubblegum hover:text-cream"
          >
            {link.label}
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={onPlay}
        className="cursor-pointer rounded-full bg-bubblegum px-6 py-1.5 font-display font-extrabold text-night-deep transition-transform duration-100 hover:-translate-y-0.5 max-sm:ml-auto"
      >
        Play
      </button>
    </nav>
  )
}

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[1160px] border-t border-rim px-[clamp(1.25rem,4vw,3.5rem)] pt-9 pb-14 text-[0.8125rem] text-dim">
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
