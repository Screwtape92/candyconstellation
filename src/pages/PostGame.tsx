import { useState, type FormEvent } from 'react'

import { submitScore } from '../api-client/submitScore'
import type { GameOverPayload } from '../game/eventBus'

// MUST stay in sync with MAX_NAME_LENGTH in api/shared/inputValidation.ts —
// same mirrored-constant desync risk the backend already flags for its own
// constants. Enforced client-side so a real player never types something the
// server will just reject.
const MAX_NAME_LENGTH = 24

interface PostGameProps {
  run: GameOverPayload
  onSubmitted: () => void
}

// Post-game screen (docs/game-design.md state machine: GameOverScene -> React
// "Post-game (name entry + score submission)"). Shows the final score and a
// free-text name entry, then hands off to the Leaderboard.
export function PostGame({ run, onSubmitted }: PostGameProps) {
  const [name, setName] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Fire-and-forget (docs/architecture.md "Score-submission resilience": the
    // UI proceeds optimistically without awaiting the POST). submissionGuid is
    // generated once per submission and would be reused across retries once the
    // Phase 6.3 retry queue lands — until then, a failed submission is only
    // logged, not recovered.
    void submitScore({
      name: name.trim(),
      score: run.score,
      elapsedSec: run.elapsedSec,
      submissionGuid: crypto.randomUUID(),
    }).catch((err) => {
      console.error('submitScore failed', err)
    })
    onSubmitted()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center gap-6 text-center text-white"
    >
      <h1 className="text-4xl font-bold text-red-400">Game Over</h1>
      <p className="text-2xl">Final Score: {run.score}</p>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={MAX_NAME_LENGTH}
        placeholder="Enter your name"
        autoFocus
        className="w-72 rounded-lg bg-slate-800 px-4 py-2 text-center text-lg outline-none ring-1 ring-slate-600 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={name.trim().length === 0}
        className="rounded-lg bg-indigo-600 px-8 py-3 text-xl font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit
      </button>
    </form>
  )
}
