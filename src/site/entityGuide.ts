import {
  CANDY_HEART_RESTORE,
  CANDY_MAGNET_DURATION_MS,
} from '../game/data/powerUps'
import { spawnTable } from '../game/data/spawnTable'

// What the how-to-play legend says about each entity. Prose lives here; every
// *number* is read back out of the game's own data tables, so a balance change
// in src/game/data/ can't leave the page quoting a value the game no longer
// uses.

export interface GuideEntry {
  key: string
  name: string
  description: string
  stat: { value: string; unit: string }
}

export interface GuideGroup {
  title: string
  accent: string
  entries: GuideEntry[]
}

function row(id: string) {
  const entry = spawnTable.find((candidate) => candidate.id === id)
  if (!entry) {
    throw new Error(`No spawn-table row for "${id}"`)
  }
  return entry
}

function damage(id: string) {
  return { value: String(row(id).damage ?? 0), unit: 'DAMAGE' }
}

function points(id: string) {
  return { value: `+${row(id).value ?? 0}`, unit: 'POINTS' }
}

export const guideGroups: GuideGroup[] = [
  {
    title: 'HAZARDS — DODGE THESE',
    accent: 'text-bubblegum',
    entries: [
      {
        key: 'gummy-meteor',
        name: 'Gummy Meteor',
        description:
          'The baseline nuisance. Most of what you dodge is one of these.',
        stat: damage('gummy-meteor'),
      },
      {
        key: 'jawbreaker',
        name: 'Jawbreaker',
        description:
          'Big, heavy, drifts down lazily — and takes two health off you if you clip it.',
        stat: damage('jawbreaker'),
      },
      {
        key: 'sour-comet',
        name: 'Sour Comet',
        description:
          'Rare and fast, tail streaming behind it. Gone before you finish reacting.',
        stat: damage('sour-comet'),
      },
    ],
  },
  {
    title: 'INGREDIENTS — GRAB THESE',
    accent: 'text-sky-candy',
    entries: [
      {
        key: 'hop-nebula-dust',
        name: 'Hop Nebula Dust',
        description: 'The bitterness, harvested from a cloud.',
        stat: points('hop-nebula-dust'),
      },
      {
        key: 'malt-meteorite',
        name: 'Malt Meteorite',
        description: 'The body of the brew, in biscuit form.',
        stat: points('malt-meteorite'),
      },
      {
        key: 'candy-star',
        name: 'Candy Star',
        description: 'The sweetness. Worth the detour.',
        stat: points('candy-star'),
      },
    ],
  },
  {
    title: 'BOOSTS — RARE',
    accent: 'text-gold',
    entries: [
      {
        key: 'candy-magnet',
        name: 'Candy Magnet',
        description:
          'Drags every ingredient nearby straight to you. Take risks while it lasts.',
        stat: {
          value: String(CANDY_MAGNET_DURATION_MS / 1000),
          unit: 'SECONDS',
        },
      },
      {
        key: 'candy-heart',
        name: 'Candy Heart',
        description:
          'Instant, one time, capped at three. The only way back from a bad clip.',
        stat: { value: `+${CANDY_HEART_RESTORE}`, unit: 'HEALTH' },
      },
    ],
  },
]
