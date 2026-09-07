// Visual-only sprite data (see docs/asset-spec.md). Deliberately separate from
// data/spawnTable.ts: that file owns *gameplay* data (weights, damage, value),
// this one owns how an entity looks. A spawn row's `spriteKey` is the join
// between them, so re-skinning an entity never touches balance data and vice
// versa.
//
// Source art is Kenney CC0 (kenney_space-shooter-extension +
// kenney_platformer-art-candy) rather than the bespoke PixelLab sprites
// docs/asset-spec.md originally specced — see that doc's "Art source" section
// for why and what it changes.
//
// Sources are raw pack PNGs with wildly different native sizes (70x70 candy
// tiles, 215px meteors, 126px ships) and a lot of transparent padding. Rather
// than hand-cropping each one, PreloadScene bakes every entry into a texture of
// exactly `w`x`h` at load: alpha-trim, aspect-preserving contain-fit, optional
// recolor. Downstream code keeps sizing its sprite and its physics body from
// the texture, exactly as it did with the Phase 2-4 placeholder rectangles, so
// the playtested footprints carry over unchanged.

export interface SpriteVisual {
  /** Texture key — matches a spawn row's `spriteKey`, or PLAYER_TEXTURE_KEY. */
  key: string
  /** File under public/assets/sprites/. Omitted for `draw` entries. */
  file?: string
  /** Baked texture size in canvas px — the on-screen footprint. */
  w: number
  h: number
  /**
   * Recolor to this hue, preserving the source art's shading (canvas 'color'
   * blend). Used where the right silhouette exists in a pack but the wrong
   * palette does — a brown rock becoming a pink gummy meteor.
   */
  tint?: number
  /**
   * Procedurally drawn instead of loaded: neither pack has a usable star or
   * magnet, and both read better as clean flat shapes at 24-32px than anything
   * that could be cropped out of the packs.
   */
  draw?: 'star' | 'magnet'
  /**
   * Composite a tapering motion tail above the art, for `sour-comet`'s
   * "trailing tail baked into the loop frames" (docs/asset-spec.md).
   */
  tail?: boolean
  /**
   * Idle spin, degrees/sec. Stands in for the 4-frame idle/loop animations the
   * spec assumed: the Kenney packs are static single-frame art, and a slow
   * rotation gives radially-symmetric entities the same "alive" read for free.
   * Omitted where the sprite has a fixed orientation (player, sour-comet).
   */
  spinDegPerSec?: number
  /**
   * Soft radial-gradient halo baked behind the art, in this colour. The
   * player-facing signal is deliberately binary: every collectible and
   * power-up glows, no obstacle does, so "does it glow" answers "is this safe
   * to grab" at a glance — added 2026-09-07 after a playtest report that
   * pickups didn't read as pickups. See docs/asset-spec.md's "Pickup glow"
   * section for the size bump that came with it.
   */
  glow?: number
}

export const PLAYER_TEXTURE_KEY = 'player'

// Sizes are docs/asset-spec.md's "Pixel dimensions" table, which was itself
// anchored to the Phase 4.3-playtested placeholder footprints. Only `player`
// differs (44x40, not 40x40) — the ship art is wider than tall, and squashing
// it to a square looked wrong; the extra 4px is width only.
export const spriteVisuals: SpriteVisual[] = [
  {
    key: PLAYER_TEXTURE_KEY,
    file: 'src_player.png',
    w: 44,
    h: 40,
  },
  // Obstacles — the size hierarchy from docs/asset-spec.md (jawbreaker heaviest
  // at 56, sour-comet a tall 24x64) is what keeps hazards reading as heavier
  // than the 24px candy pickups.
  {
    key: 'gummy-meteor',
    file: 'src_gummy-meteor.png',
    w: 40,
    h: 40,
    tint: 0xff5fa2,
    spinDegPerSec: 24,
  },
  {
    key: 'jawbreaker',
    file: 'src_jawbreaker.png',
    w: 56,
    h: 56,
    spinDegPerSec: 14,
  },
  {
    key: 'sour-comet',
    file: 'src_sour-comet.png',
    w: 24,
    h: 64,
    tail: true,
  },
  // Collectibles — three distinct silhouettes at 30px (soft puff / hard-edged
  // diamond / star) so they stay separable on a busy screen, per the visual
  // readability constraint in docs/game-design.md. Bumped from 24px and given
  // a glow 2026-09-07 (see docs/asset-spec.md "Pickup glow") after a playtest
  // report that pickups didn't read as pickups against the obstacles.
  {
    key: 'hop-nebula-dust',
    file: 'src_hop-nebula-dust.png',
    w: 30,
    h: 30,
    tint: 0x8fe36b,
    spinDegPerSec: 18,
    glow: 0x8fe36b,
  },
  {
    key: 'malt-meteorite',
    file: 'src_malt-meteorite.png',
    w: 30,
    h: 30,
    spinDegPerSec: 40,
    glow: 0xf0c46a,
  },
  {
    key: 'candy-star',
    draw: 'star',
    w: 30,
    h: 30,
    spinDegPerSec: 60,
    glow: 0xffd54a,
  },
  // Power-ups — both 38px (up from 32px, same 2026-09-07 pass), between the
  // collectibles and the obstacles, so the two read as one class
  // (docs/asset-spec.md).
  {
    key: 'candy-magnet',
    draw: 'magnet',
    w: 38,
    h: 38,
    spinDegPerSec: 20,
    glow: 0xff6b6b,
  },
  {
    key: 'candy-heart',
    file: 'src_candy-heart.png',
    w: 38,
    h: 38,
    glow: 0xf9b9d8,
  },
]

const visualsByKey = new Map(spriteVisuals.map((v) => [v.key, v]))

export function spriteVisual(key: string): SpriteVisual | undefined {
  return visualsByKey.get(key)
}

/** 0 when the entity has a fixed orientation or is unknown. */
export function spinFor(key: string): number {
  return visualsByKey.get(key)?.spinDegPerSec ?? 0
}

/**
 * The entity's art footprint. This is what a physics body should be sized to:
 * a spinning entity's *texture* is deliberately larger than its art (see
 * frameSize in src/game/textures.ts), so deriving a hitbox from the texture
 * would quietly inflate it.
 */
export function spriteArtSize(key: string) {
  const visual = visualsByKey.get(key)
  return visual ? { w: visual.w, h: visual.h } : undefined
}
