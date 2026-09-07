import { CandyField } from './CandyField'
import { AnchorButton, Eyebrow, PlayButton } from './ui'
import type { BakedSprites } from './useBakedSprites'

// Act two: the game, with the real field drifting behind it.

export function GameIntro({
  sprites,
  onPlay,
}: {
  sprites: BakedSprites | null
  onPlay: () => void
}) {
  return (
    <section
      id="game"
      className="relative overflow-hidden border-b border-rim bg-night"
    >
      <CandyField sprites={sprites} />

      {/* Darkens the copy side only, so the field stays visible on the right. */}
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(100deg,var(--color-night)_0%,color-mix(in_srgb,var(--color-night)_80%,transparent)_40%,transparent_70%),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-night-deep)_70%,transparent)_0%,transparent_22%,transparent_70%,var(--color-night-deep)_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1160px] px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(3.5rem,9vw,6.5rem)]">
        <Eyebrow>The run</Eyebrow>

        <h2 className="mt-3 mb-5 max-w-[12ch] font-display text-[clamp(2.5rem,8vw,5.25rem)] leading-[0.92] font-extrabold text-taffy [text-shadow:0_4px_0_color-mix(in_srgb,var(--color-night-deep)_60%,transparent)]">
          Candy <span className="block text-sky-candy">Constellation</span>
        </h2>

        <span className="ribbon inline-block bg-bubblegum px-6 py-1.5 font-body text-[0.8125rem] font-bold tracking-[0.22em] text-night uppercase">
          Space Dodger
        </span>

        <p className="mt-6 max-w-[44ch] text-[1.3125rem] font-light text-cream">
          Fly the belt yourself. Dodge what bites, scoop up what brews, and find
          out how far you get before the candy wins.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <PlayButton onClick={onPlay}>Play now</PlayButton>
          <AnchorButton href="#board">See the board</AnchorButton>
          <span className="font-mono text-xs text-dim">
            Desktop &amp; keyboard · no sign-in · ~2 min a run
          </span>
        </div>
      </div>
    </section>
  )
}
