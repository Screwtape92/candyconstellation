// Audio data (see docs/game-design.md "Audio spec"). Adding a cue is adding a
// row here plus one listener line in systems/AudioSystem.ts — never new
// playback plumbing, same "data-driven" convention as every other system in
// this game.
//
// Source is Kenney CC0 (kenney_interface-sounds, kenney_sci-fi-sounds,
// kenney_music-jingles — see public/assets/audio/LICENSE-kenney-*.txt),
// same license/source as the sprite art. music-loop.ogg is a short 8-bit
// jingle looped as the background track, not a long ambient bed — none of
// the supplied packs contain one, and a short chiptune phrase looping the
// whole run is itself the classic-arcade convention (many NES/Game Boy
// games loop an 8-16 second phrase for an entire level), not a compromise.

export interface AudioCue {
  key: string
  file: string
}

export const MUSIC_KEY = 'music-loop'

export const audioCues: AudioCue[] = [
  { key: 'candy-pickup', file: 'candy-pickup.ogg' },
  { key: 'obstacle-hit', file: 'obstacle-hit.ogg' },
  { key: 'powerup-activate', file: 'powerup-activate.ogg' },
  { key: 'game-over', file: 'game-over.ogg' },
  { key: 'ui-click', file: 'ui-click.ogg' },
  { key: 'blaster-fire', file: 'blaster-fire.ogg' },
  { key: 'obstacle-destroyed', file: 'obstacle-destroyed.ogg' },
  { key: MUSIC_KEY, file: 'music-loop.ogg' },
]

export function audioSourceUrl(file: string) {
  return `/assets/audio/${file}`
}
