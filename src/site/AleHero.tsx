import { Eyebrow, Roundel } from './ui'

// Act one: the beer. It opens the page because the beer is the occasion — the
// game is how you get to it, not the other way round.

export function AleHero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-rim bg-night [background-image:radial-gradient(70%_55%_at_72%_42%,color-mix(in_srgb,var(--color-bubblegum)_22%,transparent)_0%,transparent_70%)]"
    >
      <div className="mx-auto grid max-w-[1160px] items-center gap-8 px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(3rem,7vw,5.5rem)] lg:grid-cols-[0.88fr_1.12fr] lg:gap-[clamp(2rem,4.5vw,3.75rem)]">
        <div>
          <Eyebrow>Explore. Taste. Discover.</Eyebrow>

          <h1 className="mt-3 font-display text-[clamp(2rem,4.2vw,3.05rem)] leading-[1.12] font-extrabold text-balance text-taffy">
            Nine thousand light-years for a decent beer.
          </h1>

          <div className="mt-5 flex max-w-[50ch] flex-col gap-4 font-light text-dim">
            <p>
              For a long time the{' '}
              <em className="font-bold text-taffy not-italic">
                Candy Constellation
              </em>{' '}
              was only a rumour among long-haul pilots — a belt of sugar and
              slow-turning meteors somewhere past the edge of the charts, where
              the nebulae came up bitter and the moons tasted faintly of malt.
            </p>
            <p>
              Most crews who went looking came back with dents. A few came back
              with cargo:{' '}
              <strong className="font-bold text-cream">hop dust</strong> scooped
              out of a green nebula,{' '}
              <strong className="font-bold text-cream">malt</strong> shaken
              loose from a meteorite, and the kind of{' '}
              <strong className="font-bold text-cream">sweetness</strong> that
              only turns up in orbit around a candy star. Somebody eventually
              did the obvious thing and fermented it.
            </p>
            <p>
              This is that beer. The flight out is still open, if you fancy it.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-4 text-gold">
            <Roundel value="4.5%" unit="ABV" />
            <Roundel value="25" unit="IBU" />
            <p className="font-display text-[1.3125rem] leading-tight font-bold text-cream">
              Sweet Lager
              <small className="block font-body text-sm font-light text-dim">
                Space Exploration Ale · small batch
              </small>
            </p>
          </div>

          <a
            href="#game"
            className="mt-9 inline-flex items-center gap-2 font-mono text-xs tracking-[0.12em] text-sky-candy hover:text-cream"
          >
            FLY IT YOURSELF{' '}
            <span className="cue-bob" aria-hidden="true">
              ↓
            </span>
          </a>
        </div>

        <figure className="relative m-0 max-w-[460px] overflow-hidden rounded-[18px] shadow-[0_0_0_1px_var(--color-rim),0_30px_90px_-30px_color-mix(in_srgb,var(--color-bubblegum)_70%,transparent)] max-lg:order-first max-lg:mx-auto lg:max-w-none">
          <img
            src="/assets/site/bottle-960.webp"
            srcSet="/assets/site/bottle-480.webp 480w, /assets/site/bottle-960.webp 960w"
            sizes="(max-width: 1023px) 460px, 46vw"
            width={960}
            height={960}
            alt="A bottle of Candy Constellation Space Exploration Ale, surrounded by lollipops, gummy bears, astronauts and pastel planets."
            className="block w-full"
          />
          {/* The render is a square with its own hard edge; a faint inward
              vignette stops it reading as a screenshot pasted onto the page. */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_10px_color-mix(in_srgb,var(--color-night)_55%,transparent)]" />
        </figure>
      </div>
    </section>
  )
}
