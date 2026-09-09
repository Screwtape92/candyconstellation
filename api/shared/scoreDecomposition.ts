// Exact score-consistency check (docs/game-design.md "Score decomposition
// check", added 2026-09-09) — a stricter companion to antiCheat.ts's
// plausibility *ratio*. That check only bounds the total score from above;
// it can't tell a genuinely great run from a fabricated total picked to sit
// just under the ceiling. This check instead verifies the total is exactly
// reconstructible from the game's real, discrete scoring rules — something a
// fabricated number can only satisfy by reverse-engineering those rules, not
// by picking anything merely "plausible-looking".
//
// ScoreSystem.ts (src/game/systems/ScoreSystem.ts):
//   current = floor(SURVIVAL_POINTS_PER_SEC * elapsedSec + candyTally + killTally)
// candyTally is a running sum of collectible values (always COLLECTIBLE_VALUE
// each, see spawnTable.ts) and killTally a running sum of obstacle kill
// values (30/60/100, also spawnTable.ts) — both integers, so
// floor(A + integer) = floor(A) + integer lets the survival term be floored
// on its own here.
//
// submitScore now requires the client to report candyPoints/killPoints
// alongside score (PlayScene -> GameOverScene -> submitScore, same path as
// runToken) so this can be checked, not just inferred.

import { SURVIVAL_POINTS_PER_SEC, COLLECTIBLE_VALUE } from './antiCheat'

// Mirrors the three `killValue`s in src/game/data/spawnTable.ts
// (gummy-meteor 30, jawbreaker 100, sour-comet 60) — same MAINTENANCE HAZARD
// as antiCheat.ts's own mirrored constants: keep in sync if spawnTable.ts's
// kill values are retuned.
const OBSTACLE_KILL_VALUES = [30, 60, 100] as const
const JAWBREAKER_KILL_VALUE = 100 // the one value not a multiple of the other two

export function isValidCandyPoints(candyPoints: number): boolean {
  return (
    Number.isInteger(candyPoints) &&
    candyPoints >= 0 &&
    candyPoints % COLLECTIBLE_VALUE === 0
  )
}

// killPoints must be reachable as a non-negative integer combination of
// OBSTACLE_KILL_VALUES. 60 is a multiple of 30, so any non-negative multiple
// of 30 is already reachable using only gummy-meteor/sour-comet kills — the
// only real question is how many jawbreakers (100 each) the total needs, so
// trying each possible jawbreaker count and checking the remainder against
// 30 settles it in O(killPoints / 100) time, no general-purpose subset-sum
// DP needed for a 3-denomination, one-non-multiple set like this.
export function isValidKillPoints(killPoints: number): boolean {
  if (!Number.isInteger(killPoints) || killPoints < 0) {
    return false
  }
  const multipleOfOthers = Math.min(...OBSTACLE_KILL_VALUES.filter(
    (v) => v !== JAWBREAKER_KILL_VALUE,
  ))
  for (
    let jawbreakers = 0;
    jawbreakers * JAWBREAKER_KILL_VALUE <= killPoints;
    jawbreakers++
  ) {
    const remainder = killPoints - jawbreakers * JAWBREAKER_KILL_VALUE
    if (remainder % multipleOfOthers === 0) {
      return true
    }
  }
  return false
}

// The exact reconciliation: total score must equal the survival floor plus
// the reported candy and kill points, with nothing left unaccounted for.
export function isConsistentScore(
  score: number,
  elapsedSec: number,
  candyPoints: number,
  killPoints: number,
): boolean {
  const survivalFloor = Math.floor(SURVIVAL_POINTS_PER_SEC * elapsedSec)
  return score === survivalFloor + candyPoints + killPoints
}
