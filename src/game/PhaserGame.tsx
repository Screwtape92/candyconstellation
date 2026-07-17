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

  return <div ref={containerRef} />
}
