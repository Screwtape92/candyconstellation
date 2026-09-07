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

const BUTTON_BASE =
  'inline-block cursor-pointer rounded-full font-display font-extrabold tracking-[0.02em] transition-transform duration-100 hover:-translate-y-0.5'

const BUTTON_VARIANT = {
  solid:
    'bg-bubblegum px-10 py-3 text-lg text-night-deep hover:shadow-[0_12px_32px_-10px_var(--color-bubblegum)]',
  ghost:
    'border-2 border-rim px-8 py-3 text-base text-cream hover:border-taffy',
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
