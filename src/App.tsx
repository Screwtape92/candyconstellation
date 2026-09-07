import { useEffect, useState } from 'react'

import { drainQueue, RETRY_INTERVAL_MS } from './api-client/retryQueue'
import {
  eventBus,
  GAME_OVER_EVENT,
  type GameOverPayload,
} from './game/eventBus'
import { PhaserGame } from './game/PhaserGame'
import { Landing } from './pages/Landing'
import { Leaderboard } from './pages/Leaderboard'
import { PostGame } from './pages/PostGame'
import { IntroSplash } from './site/IntroSplash'

// React owns the shell and switches between screens with plain state — there's
// one screen transitioning to another, not deep-linkable routes, so a router
// would be unwarranted (docs/architecture.md "React ⇄ Phaser integration").
type View = 'landing' | 'playing' | 'postgame' | 'leaderboard'

// Landing scrolls a full page (the ale, the game, how to play, the board); the
// other three are single-screen and want their content centered instead. One
// shell, two layout modes, rather than every screen re-deciding its own outer
// container.
const SCROLLING_VIEWS: View[] = ['landing', 'leaderboard']

function App() {
  const [view, setView] = useState<View>('landing')
  const [lastRun, setLastRun] = useState<GameOverPayload | null>(null)
  // Landing is already mounted underneath the whole time — this is a
  // full-screen overlay that clears, not a route the real page waits behind.
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // The single Phaser->React crossing: GameOverScene emits once per run. Swap
    // the (now-unmounting) game out for the post-game screen.
    const onGameOver = (payload: GameOverPayload) => {
      setLastRun(payload)
      setView('postgame')
    }
    eventBus.on(GAME_OVER_EVENT, onGameOver)
    return () => {
      eventBus.off(GAME_OVER_EVENT, onGameOver)
    }
  }, [])

  useEffect(() => {
    // Drain any submissions left pending from a previous session on load, then
    // keep retrying on an interval while the app stays open (docs/architecture.md
    // "Score-submission resilience": retried "on next load or on an interval").
    // These are background fetches with no UI state gating on them, so they
    // never block starting a run or navigating the menu.
    void drainQueue()
    const intervalId = window.setInterval(() => {
      void drainQueue()
    }, RETRY_INTERVAL_MS)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const scrolling = SCROLLING_VIEWS.includes(view)

  return (
    <div
      className={`h-screen w-full bg-night-deep text-cream ${
        scrolling ? '' : 'flex items-center justify-center overflow-hidden'
      }`}
    >
      {view === 'landing' && <Landing onPlay={() => setView('playing')} />}
      {/* PhaserGame is mounted only while playing, so navigating away genuinely
          unmounts and destroys the Phaser.Game instance. */}
      {view === 'playing' && <PhaserGame />}
      {view === 'postgame' && lastRun && (
        <PostGame run={lastRun} onSubmitted={() => setView('leaderboard')} />
      )}
      {view === 'leaderboard' && (
        <Leaderboard
          onPlayAgain={() => setView('playing')}
          onBackToHome={() => setView('landing')}
        />
      )}
      {showSplash && <IntroSplash onDone={() => setShowSplash(false)} />}
    </div>
  )
}

export default App
