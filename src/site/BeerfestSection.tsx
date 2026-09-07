import { PlayButton, SectionHeading } from './ui'

// The occasion. Deliberately not an information panel — the audience already
// knows the date, time and venue, so the section's job is to hand people back
// to the game rather than tell them what they know.

export function BeerfestSection({ onPlay }: { onPlay: () => void }) {
  return (
    <section
      id="fest"
      className="mx-auto max-w-[1160px] border-t border-rim px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(3.5rem,8vw,5.75rem)]"
    >
      <SectionHeading
        eyebrow="The occasion"
        title="The Beerfest"
        lede="The belt is fiction. The birthday is not, and neither is the beer."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_0.8fr] lg:gap-[clamp(2rem,5vw,4rem)]">
        <div>
          <p className="font-display text-[clamp(1.75rem,3.6vw,2.6rem)] leading-[1.1] font-extrabold text-gold">
            Friday 11 September
          </p>
          <p className="mt-4 max-w-[46ch] font-light text-dim">
            You know where, and you know when. What is not settled yet is{' '}
            <strong className="font-bold text-cream">
              whose name is at the top of the board
            </strong>{' '}
            when we get there — so there is still time to do something about
            that.
          </p>
          <div className="mt-8">
            <PlayButton onClick={onPlay}>Fly a run</PlayButton>
          </div>
        </div>

        <figure className="m-0 overflow-hidden rounded-xl border border-rim">
          <img
            src="/assets/site/label-720.webp"
            srcSet="/assets/site/label-360.webp 360w, /assets/site/label-720.webp 720w"
            sizes="(max-width: 1023px) 100vw, 44vw"
            width={720}
            height={720}
            alt="The Candy Constellation bottle label: an astronaut planting a flag on a pink candy moon, with signposts to Gummy Nebula, Lollipop Lane and Marshmallow Moon."
            className="block w-full"
          />
        </figure>
      </div>
    </section>
  )
}
