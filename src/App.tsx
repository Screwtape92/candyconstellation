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

// React owns the shell and switches between screens with plain state — there's
// one screen transitioning to another, not deep-linkable routes, so a router
// would be unwarranted (docs/architecture.md "React ⇄ Phaser integration").
type View = 'landing' | 'playing' | 'postgame' | 'leaderboard'

function App() {
  const [view, setView] = useState<View>('landing')
  const [lastRun, setLastRun] = useState<GameOverPayload | null>(null)

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

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-slate-950">
      {view === 'landing' && (
        <Landing
          onPlay={() => setView('playing')}
          onViewLeaderboard={() => setView('leaderboard')}
        />
      )}
      {/* PhaserGame is mounted only while playing, so navigating away genuinely
          unmounts and destroys the Phaser.Game instance. */}
      {view === 'playing' && <PhaserGame />}
      {view === 'postgame' && lastRun && (
        <PostGame run={lastRun} onSubmitted={() => setView('leaderboard')} />
      )}
      {view === 'leaderboard' && (
        <Leaderboard onBack={() => setView('landing')} />
      )}
    </div>
  )
}

export default App
