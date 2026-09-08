// Audio data (see docs/game-design.md "Audio spec"). Adding a cue is adding a
// row here plus one line wherever it's played — never new loader plumbing.
// Being built up one sound at a time as the user sources real audio (the
// first attempt, entirely Kenney CC0, didn't sound right and was reverted —
// see the git history around 2026-09-08).

export interface AudioCue {
  key: string
  file: string
}

// `blaster-fire-loop` is a continuous rapid-fire loop, not a one-shot —
// played for as long as the fire key is held (see BlasterSystem.ts), not
// re-triggered per projectile. Source: user-supplied, audio/rapid_laser_loop_2.wav
// (swapped in 2026-09-08 in place of the first rapid_laser_loop.wav).
export const audioCues: AudioCue[] = [
  { key: 'blaster-fire-loop', file: 'blaster-fire-loop.wav' },
]

export function audioSourceUrl(file: string) {
  return `/assets/audio/${file}`
}
