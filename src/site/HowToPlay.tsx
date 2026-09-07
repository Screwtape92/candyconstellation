import { MAX_HEALTH, INVULN_MS } from '../game/systems/HealthSystem'
import { SURVIVAL_POINTS_PER_SEC } from '../game/systems/ScoreSystem'
import { guideGroups, type GuideEntry } from './entityGuide'
import { Roundel, SectionHeading } from './ui'
import type { BakedSprites } from './useBakedSprites'
import { useReveal } from './useReveal'

// One scale for every sprite. A spinning entity's texture is padded around its
// art (see frameSize in src/game/spriteBaking.ts), so applying the same factor
// everywhere keeps the on-page sizes in true proportion to each other — the
// Jawbreaker really is the heavy one, and it should look it.
const ART_SCALE = 1.7

// Every ingredient row carries the same value, so the scoring line can quote it
// without implying the three differ.
const CANDY_VALUE = guideGroups[1].entries[0].stat.value

function Key({ children }: { children: string }) {
  return (
    <span className="min-w-9 rounded-md border border-b-[3px] border-rim bg-panel-hi px-2 py-1.5 text-center font-mono text-[0.8125rem] font-bold text-cream">
      {children}
    </span>
  )
}

function EntityCard({
  entry,
  sprite,
}: {
  entry: GuideEntry
  sprite: BakedSprites[string] | undefined
}) {
  return (
    <article className="flex flex-col bg-panel p-6 transition-colors duration-200 hover:bg-panel-hi">
      <div className="flex h-32 items-center justify-center max-sm:h-24">
        {sprite && (
          <img
            src={sprite.url}
            alt=""
            width={Math.round(sprite.w * ART_SCALE)}
            height={Math.round(sprite.h * ART_SCALE)}
          />
        )}
      </div>
      <div className="mt-2 flex items-center gap-4">
        <h3 className="flex-1 text-[1.3125rem] font-bold text-cream">
          {entry.name}
        </h3>
        <Roundel value={entry.stat.value} unit={entry.stat.unit} />
      </div>
      <p className="mt-3 text-[0.9375rem] font-light text-dim">
        {entry.description}
      </p>
    </article>
  )
}

export function HowToPlay({ sprites }: { sprites: BakedSprites | null }) {
  const [revealRef, revealClass] = useReveal<HTMLElement>()
  return (
    <section
      id="how"
      ref={revealRef}
      className={`mx-auto max-w-[1160px] border-t border-rim px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(3.5rem,8vw,5.75rem)] ${revealClass}`}
    >
      <SectionHeading
        eyebrow="Field manual"
        title="How to play"
        lede="Everything you need, in about twenty seconds. The opening ten seconds of every run are deliberately gentle — the belt only gets mean once you have the hang of it."
      />

      <div className="mb-10 flex flex-wrap gap-x-14 gap-y-8 border-b border-rim pb-10">
        <div>
          <p className="mb-3 font-mono text-[0.6875rem] tracking-[0.16em] text-dim">
            MOVE
          </p>
          <div className="flex gap-1.5">
            <Key>W</Key>
            <Key>A</Key>
            <Key>S</Key>
            <Key>D</Key>
          </div>
        </div>
        <div>
          <p className="mb-3 font-mono text-[0.6875rem] tracking-[0.16em] text-dim">
            OR
          </p>
          <div className="flex gap-1.5">
            <Key>↑</Key>
            <Key>←</Key>
            <Key>↓</Key>
            <Key>→</Key>
          </div>
        </div>
        <div>
          <p className="mb-3 font-mono text-[0.6875rem] tracking-[0.16em] text-dim">
            STAYING ALIVE
          </p>
          <p className="max-w-[32ch] text-[0.9375rem] font-light text-dim">
            You start with{' '}
            <strong className="font-bold text-cream">
              {MAX_HEALTH} health
            </strong>
            . A hit costs one or two, then you get{' '}
            <strong className="font-bold text-cream">
              {INVULN_MS / 1000} second
            </strong>{' '}
            of invulnerability to get clear.
          </p>
        </div>
      </div>

      {guideGroups.map((group) => (
        <div key={group.title} className="mt-10 first:mt-0">
          <p
            className={`rule-out mb-5 flex items-center gap-3 font-mono text-xs tracking-[0.16em] ${group.accent}`}
          >
            {group.title}
          </p>
          <div className="grid gap-px overflow-hidden rounded-[10px] border border-rim bg-rim sm:grid-cols-2 lg:grid-cols-3">
            {group.entries.map((entry) => (
              <EntityCard
                key={entry.key}
                entry={entry}
                sprite={sprites?.[entry.key]}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-[10px] border-2 border-gold bg-[color-mix(in_srgb,var(--color-gold)_7%,var(--color-panel))] px-8 py-6">
        <p className="font-mono text-[1.0625rem] font-bold text-cream">
          <b className="text-gold">SCORE</b> = {SURVIVAL_POINTS_PER_SEC} ×
          seconds survived + {CANDY_VALUE.replace('+', '')} per ingredient
        </p>
        <p className="max-w-[46ch] text-[0.9375rem] font-light text-dim">
          Surviving pays the rent, ingredients pay the bills. Turtling at the
          bottom of the screen will not get you onto the board — you have to go
          and get the candy.
        </p>
      </div>
    </section>
  )
}
