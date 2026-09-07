import Phaser from 'phaser'

import { BootScene } from './scenes/BootScene'
import { GameOverScene } from './scenes/GameOverScene'
import { PlayScene } from './scenes/PlayScene'
import { PreloadScene } from './scenes/PreloadScene'

export const GAME_WIDTH = 720
export const GAME_HEIGHT = 960

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b1020',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // Opt-in rather than always-on in dev: the body outlines were readable
      // over flat placeholder rectangles, but they cover the real art. Set
      // VITE_PHYSICS_DEBUG=true to get them back when tuning hitboxes.
      debug: import.meta.env.VITE_PHYSICS_DEBUG === 'true',
    },
  },
  scene: [BootScene, PreloadScene, PlayScene, GameOverScene],
}
