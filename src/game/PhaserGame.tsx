import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

import { gameConfig } from './config'

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const isFirstCleanup = useRef(true)

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: containerRef.current ?? undefined,
      })
      if (import.meta.env.DEV) {
        // Dev-only handle so the running game can be inspected from the browser
        // console (and by browser automation) while tuning. Stripped from the
        // production build — see docs/build-plan.md Phase 8's "debug tooling".
        ;(window as unknown as { __game?: Phaser.Game }).__game =
          gameRef.current
      }
    }

    return () => {
      if (isFirstCleanup.current) {
        // StrictMode's simulated unmount — skip destroy, keep the instance alive
        isFirstCleanup.current = false
        return
      }
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
