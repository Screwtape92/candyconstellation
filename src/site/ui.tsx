import type { ReactNode } from 'react'

// Small shared pieces of the site's visual language. They exist so the label's
// devices — the letterspaced eyebrow, the ABV roundel, the pill button — are
// defined once rather than re-typed as a long utility string at every use.

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-bold tracking-[0.3em] text-taffy uppercase">
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string
  title: string
  lede?: string
}) {
  return (
    <div className="mb-10">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.6rem)] leading-[1.12] font-extrabold text-balance text-cream">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 max-w-[62ch] text-[1.3125rem] font-light text-dim">
          {lede}
        </p>
      )}
    </div>
  )
}

/** The bottle's ABV/IBU badge. Takes its colour from the surrounding text. */
export function Roundel({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="roundel flex h-[74px] w-[74px] shrink-0 flex-col items-center justify-center text-center">
      <b className="font-display text-xl font-extrabold">{value}</b>
      <span className="font-mono text-[0.5625rem] tracking-[0.1em] opacity-85">
        {unit}
      </span>
    </div>
  )
}

// Beveled, sharp-cornered "OS button" rather than a soft pill — raised by
// default (inset highlight top-left, shadow bottom-right), inverting to look
// pressed on :active. The retro-computer direction's own device
// (docs/asset-spec.md-style rationale: real window-chrome buttons are
// bevels, not drop shadows) replacing the earlier rounded/glow treatment.
const BUTTON_BASE =
  'inline-block cursor-pointer border-2 border-rim font-display font-extrabold tracking-[0.02em] transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0 shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.35),inset_2px_2px_0_rgba(255,255,255,0.18)] active:shadow-[inset_2px_2px_0_rgba(0,0,0,0.35),inset_-2px_-2px_0_rgba(255,255,255,0.18)]'

const BUTTON_VARIANT = {
  solid: 'bg-bubblegum px-10 py-3 text-lg text-night-deep',
  ghost: 'bg-panel px-8 py-3 text-base text-cream hover:border-taffy',
} as const

export function PlayButton({
  children,
  onClick,
  variant = 'solid',
}: {
  children: ReactNode
  onClick: () => void
  variant?: keyof typeof BUTTON_VARIANT
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]}`}
    >
      {children}
    </button>
  )
}

/**
 * Vintage-OS window chrome around a piece of art — a striped title bar with
 * two decorative corner controls and a filename-style label, in place of the
 * soft drop-shadowed rounded figure the candy-label direction used. Grounded
 * in the Amiga Workbench window convention (striped bar, inset controls),
 * per the approved mockup at
 * https://claude.ai/code/artifact/efd948a1-ea8e-4ad9-9d12-6fd388127e85 —
 * not an invented "retro-ish" shape.
 */
export function WindowFrame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <figure className="relative m-0 overflow-hidden border-2 border-rim bg-panel pt-[26px]">
      <div className="absolute inset-x-0 top-0 flex h-[26px] items-center gap-2 px-2 [background:repeating-linear-gradient(90deg,var(--color-bubblegum)_0_3px,var(--color-sky-candy)_3px_6px)]">
        <span className="h-3 w-3 shrink-0 bg-cream" aria-hidden="true" />
        <span className="flex-1 truncate bg-cream px-2 py-0.5 font-mono text-[0.625rem] text-night-deep">
          {title}
        </span>
        <span className="h-3 w-3 shrink-0 bg-cream" aria-hidden="true" />
      </div>
      {children}
    </figure>
  )
}

export function AnchorButton({
  children,
  href,
  variant = 'ghost',
}: {
  children: ReactNode
  href: string
  variant?: keyof typeof BUTTON_VARIANT
}) {
  return (
    <a href={href} className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]}`}>
      {children}
    </a>
  )
}
