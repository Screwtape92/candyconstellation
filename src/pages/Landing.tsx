import { AleHero } from '../site/AleHero'
import { BeerfestSection } from '../site/BeerfestSection'
import { GameIntro } from '../site/GameIntro'
import { HowToPlay } from '../site/HowToPlay'
import { LeaderboardSection } from '../site/LeaderboardSection'
import { SiteFooter, SiteNav, SiteTaskbar } from '../site/SiteChrome'
import { useBakedSprites } from '../site/useBakedSprites'

interface LandingProps {
  onPlay: () => void
  onBuildStory: () => void
}

// Pre-game screen (docs/game-design.md state machine: React "Landing" -> Phaser
// BootScene). A single scrolling page in two acts: the ale and how it got here,
// then the game that fetched its ingredients.
//
// Sprites are baked once here and shared by both consumers below — the drifting
// field behind the game section and the how-to-play legend — rather than each
// re-decoding the same source PNGs.
export function Landing({ onPlay, onBuildStory }: LandingProps) {
  const sprites = useBakedSprites()

  return (
    <div className="h-full w-full overflow-y-auto">
      <SiteNav onPlay={onPlay} onBuildStory={onBuildStory} />
      <main>
        <AleHero />
        <GameIntro sprites={sprites} onPlay={onPlay} />
        <HowToPlay sprites={sprites} />
        <LeaderboardSection />
        <BeerfestSection onPlay={onPlay} />
      </main>
      <SiteFooter />
      <SiteTaskbar />
    </div>
  )
}
