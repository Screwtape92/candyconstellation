import { useEffect, useState } from 'react'

import {
  BLASTER_READY_EVENT,
  eventBus,
  HUD_UPDATE_EVENT,
  type HudState,
} from './eventBus'
import { MAX_HEALTH } from './systems/HealthSystem'

// How long the "SPACE TO SHOOT!" flash stays up after a Sour Blaster pickup
// (docs/game-design.md, playtest feedback 2026-09-08) — long enough to
// register without lingering once the player's already firing.
const BLASTER_FLASH_MS = 3000

const INITIAL_HUD: HudState = {
  health: MAX_HEALTH,
  maxHealth: MAX_HEALTH,
  score: 0,
  powerUps: [],
}

/**
 * Subscribes to the live Phaser->React HUD crossing (eventBus.ts) for the
 * large side-panel status readout (PlaySidePanels.tsx). One subscription per
 * mount — PlaySidePanels only exists while `view === 'playing'`, so this
 * naturally resets to INITIAL_HUD on every fresh run rather than needing
 * explicit reset logic.
 */
export function useHudState() {
  const [hud, setHud] = useState<HudState>(INITIAL_HUD)
  const [blasterFlash, setBlasterFlash] = useState(false)

  useEffect(() => {
    let flashTimer: number | undefined

    const onHudUpdate = (state: HudState) => {
      setHud(state)
    }
    const onBlasterReady = () => {
      setBlasterFlash(true)
      window.clearTimeout(flashTimer)
      flashTimer = window.setTimeout(() => {
        setBlasterFlash(false)
      }, BLASTER_FLASH_MS)
    }

    eventBus.on(HUD_UPDATE_EVENT, onHudUpdate)
    eventBus.on(BLASTER_READY_EVENT, onBlasterReady)
    return () => {
      eventBus.off(HUD_UPDATE_EVENT, onHudUpdate)
      eventBus.off(BLASTER_READY_EVENT, onBlasterReady)
      window.clearTimeout(flashTimer)
    }
  }, [])

  return { hud, blasterFlash }
}
