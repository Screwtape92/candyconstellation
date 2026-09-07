import { useEffect, useRef, useState } from 'react'

/**
 * One-time fade-and-rise as an element scrolls into view, paired with the
 * `.reveal` / `.reveal-in` classes in src/index.css. Content starts visible
 * (`.reveal` only sets opacity via a transition, never `display`/`visibility`),
 * so a slow or failed observer just leaves it at its resting, fully-opaque
 * state a beat later rather than hiding it — nothing here can strand real
 * content invisible.
 *
 * Fires once and disconnects: this is a page-load flourish, not a repeating
 * effect that replays every time a section scrolls past.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  // Lazy initializer, not a setState call inside the effect below: a browser
  // without IntersectionObserver starts already-revealed, computed once at
  // first render rather than flipped a tick later.
  const [revealed, setRevealed] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const el = ref.current
    if (!el || revealed) {
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
    }
  }, [revealed])

  // A tuple, not `{ ref, className }`: the lint rule guarding against reading
  // `.current` mid-render pattern-matches on a property literally named
  // `ref` and flags every read of it, even the ordinary `ref={...}` JSX
  // attribute this is meant for.
  return [ref, `reveal ${revealed ? 'reveal-in' : ''}`] as const
}
