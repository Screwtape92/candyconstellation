import Phaser from 'phaser'

import { BootScene } from './scenes/BootScene'
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
      debug: import.meta.env.DEV,
    },
  },
  scene: [BootScene, PreloadScene, PlayScene],
}
