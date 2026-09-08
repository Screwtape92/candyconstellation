import type { ReactNode } from 'react'

import {
  Eyebrow,
  PlayButton,
  Roundel,
  SectionHeading,
  WindowFrame,
} from '../site/ui'
import { useReveal } from '../site/useReveal'

interface BuildStoryProps {
  onPlay: () => void
  onBackToHome: () => void
}

const AGENTS = [
  {
    file: 'game-designer.agent',
    role: 'Gameplay & tuning',
    does: 'Difficulty curve, spawn tables, power-ups, health, scoring — every number that decides how the run feels.',
  },
  {
    file: 'sprite-integrator.agent',
    role: 'Art pipeline',
    does: 'Imports and bakes sprite art into game-ready textures, measures real hitboxes from the actual art.',
  },
  {
    file: 'azure-infra.agent',
    role: 'Backend & deploy',
    does: 'Azure Functions, Table Storage, the leaderboard API, CI/CD — everything off the game canvas.',
  },
  {
    file: 'qa-tester.agent',
    role: 'Independent verification',
    does: 'Drives the actual game in a real browser and checks it against the spec — never trusts a implementer’s own word.',
  },
  {
    file: 'code-reviewer.agent',
    role: 'Code quality',
    does: 'Clean Code review only — naming, function size, dead code. Doesn’t write features, just grades them.',
  },
]

const PHASES = [
  'Scaffold — project setup, tooling, one early smoke-deploy',
  'Core vertical slice — movement, one obstacle, health, game over',
  'Data-driven systems — spawn table, difficulty curve, power-ups, scoring',
  'Feel & experience — juice, onboarding, first playtest round',
  'Backend — Functions, Table Storage, the score API',
  'Score submission — free-text names, retry queue, live leaderboard',
  'Real assets — sprites, backgrounds, the visual pass',
  'Launch readiness — perf budget, repeat-play stability, CI',
  'Playtesting & freeze — final tuning, final checks, ship it',
]

const BUGS = [
  {
    title: 'Meteors flew as crescents',
    body: 'Typecheck, lint and a full build all passed clean. The rotating sprites still rendered as clipped wedges — a texture-frame padding bug invisible at 0/45/90°, caught only by looking at real rendered frames.',
  },
  {
    title: 'Difficulty that never reset',
    body: '"Play again" quietly inherited the previous run’s difficulty. Root cause: reading a Phaser clock field that’s stale for one frame at scene start — invisible on a fresh page load, broke on every replay.',
  },
  {
    title: 'The canvas itself was wrong',
    body: 'Planned as 960×540 landscape. The first time it was actually played, the dodging felt wrong — switched to 720×960 portrait the same day, before anything else got built on top of it.',
  },
]

const PLAYTEST_ROUNDS = [
  {
    who: 'The developer, solo',
    found: 'Does dodging feel physically satisfying at all?',
  },
  {
    who: '3-5 colleagues, individually, unaided',
    found:
      'Movement felt sluggish; the difficulty ramp barely registered in a short session.',
  },
  {
    who: '8-10+ people, mixed familiarity',
    found: 'Repeat-replay stability, whether the tuning holds up broadly.',
  },
  {
    who: 'Final smoke test before freeze',
    found: 'Not feedback — just "does the frozen build actually work."',
  },
]

function LogWindow({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <WindowFrame title={title}>
      <div className="p-6">{children}</div>
    </WindowFrame>
  )
}

export function BuildStory({ onPlay, onBackToHome }: BuildStoryProps) {
  const [heroRef, heroReveal] = useReveal<HTMLElement>()
  const [planRef, planReveal] = useReveal<HTMLElement>()
  const [agentsRef, agentsReveal] = useReveal<HTMLElement>()
  const [phasesRef, phasesReveal] = useReveal<HTMLElement>()
  const [bugsRef, bugsReveal] = useReveal<HTMLElement>()
  const [testRef, testReveal] = useReveal<HTMLElement>()
  const [closeRef, closeReveal] = useReveal<HTMLElement>()

  return (
    <div className="h-full w-full overflow-y-auto">
      <nav className="sticky top-0 z-20 flex items-center gap-5 border-b border-rim bg-[color-mix(in_srgb,var(--color-night-deep)_90%,transparent)] px-[clamp(1.25rem,4vw,3.5rem)] py-3 backdrop-blur-[10px]">
        <button
          type="button"
          onClick={onBackToHome}
          className="font-display text-lg font-extrabold whitespace-nowrap text-taffy"
        >
          Candy <b className="font-extrabold text-sky-candy">Constellation</b>
        </button>
        <PlayButton onClick={onBackToHome} variant="ghost">
          ← Back to home
        </PlayButton>
      </nav>

      <main className="mx-auto max-w-[1160px] px-[clamp(1.25rem,4vw,3.5rem)]">
        <section
          ref={heroRef}
          className={`py-[clamp(3.5rem,9vw,6.5rem)] ${heroReveal}`}
        >
          <Eyebrow>AgileBridge — Build with AI, 2026</Eyebrow>
          <h1 className="mt-3 max-w-[16ch] font-display text-[clamp(2.25rem,7vw,4rem)] leading-[0.98] font-extrabold text-cream text-balance">
            How this game got built
          </h1>
          <p className="mt-6 max-w-[62ch] text-[1.3125rem] font-light text-dim">
            This year&rsquo;s theme is{' '}
            <strong className="font-bold text-cream">Build with AI</strong>.
            Candy Constellation is the receipts: every system below, the
            backend, the docs, this page you&rsquo;re reading — all written by{' '}
            <strong className="font-bold text-cream">Claude Code</strong>, an AI
            coding agent, working from a spec instead of a vague brief. A human
            directed it the whole way — reviewing, playtesting, and signing off
            at every real decision — but didn&rsquo;t hand-type the code.
          </p>
        </section>

        <section
          id="plan"
          ref={planRef}
          className={`border-t border-rim py-[clamp(3.5rem,8vw,5.75rem)] ${planReveal}`}
        >
          <SectionHeading
            eyebrow="Step one"
            title="Plan first, code second"
            lede="Before a single system was built, seven ground-truth docs pinned down what this game actually is — and got a real sign-off before implementation started."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <LogWindow title="planning-signoff.md">
              <p className="text-[0.9375rem] font-light text-dim">
                Tracks review/approval status of every decision across the other
                docs, plus any open gap not yet covered. Planning was marked{' '}
                <strong className="font-bold text-cream">
                  signed off on 2026-07-15
                </strong>{' '}
                — only then did build-plan.md&rsquo;s phases start.
              </p>
            </LogWindow>
            <LogWindow title="game-design.md · architecture.md · asset-spec.md">
              <p className="text-[0.9375rem] font-light text-dim">
                The state machine, difficulty curve, health/power-up/spawn
                systems, Table Storage schema, sprite naming convention — the
                steady-state spec every system still has to match today.
              </p>
            </LogWindow>
            <LogWindow title="planning-log.md">
              <p className="text-[0.9375rem] font-light text-dim">
                The reasoning trail, not the source of truth: why sign-in got
                dropped for free-text names, why the canvas flipped from
                landscape to portrait, why a gravity-well obstacle idea got
                bumped to a &ldquo;maybe later&rdquo; backlog instead of built.
              </p>
            </LogWindow>
            <LogWindow title="dev-standards.md · build-plan.md">
              <p className="text-[0.9375rem] font-light text-dim">
                Code quality, testing and git conventions, plus the phased build
                order — chosen to de-risk the biggest unknown first, not just
                &ldquo;build the fun part first.&rdquo;
              </p>
            </LogWindow>
          </div>
        </section>

        <section
          id="agents"
          ref={agentsRef}
          className={`border-t border-rim py-[clamp(3.5rem,8vw,5.75rem)] ${agentsReveal}`}
        >
          <SectionHeading
            eyebrow="Step two"
            title="A team of specialists, not one generalist"
            lede="Five specialized agents, each with one narrow domain and its own brief — the same way a real team splits work, rather than one model doing everything in one context."
          />
          <div className="grid gap-px overflow-hidden border-2 border-rim bg-rim sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map((agent) => (
              <article
                key={agent.file}
                className="flex flex-col bg-panel p-6 shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.35),inset_2px_2px_0_rgba(255,255,255,0.08)]"
              >
                <p className="font-mono text-[0.75rem] text-sky-candy">
                  {agent.file}
                </p>
                <h3 className="mt-2 text-[1.0625rem] font-bold text-cream">
                  {agent.role}
                </h3>
                <p className="mt-3 text-[0.9375rem] font-light text-dim">
                  {agent.does}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-[68ch] text-[0.9375rem] font-light text-dim">
            The standing rule across all five:{' '}
            <strong className="font-bold text-cream">
              escalate, don&rsquo;t improvise.
            </strong>{' '}
            When an agent hits a real unknown — an undecided name, a design call
            outside its own lane — it stops and hands back a question instead of
            guessing and continuing. A human answers, and the same agent resumes
            with full context, rather than a fresh one redoing the work.
          </p>
        </section>

        <section
          id="phases"
          ref={phasesRef}
          className={`border-t border-rim py-[clamp(3.5rem,8vw,5.75rem)] ${phasesReveal}`}
        >
          <SectionHeading
            eyebrow="Step three"
            title="Nine phases, verified live every time"
            lede="Chosen to surface the biggest unknown first, not to build the fun part first. Every phase closed with the game actually being played in a real browser — not just a green typecheck."
          />
          <LogWindow title="build-plan.md — 9 phases">
            <ol className="grid gap-3 sm:grid-cols-2">
              {PHASES.map((phase, i) => (
                <li key={phase} className="flex gap-3 text-[0.9375rem]">
                  <span className="shrink-0 font-mono text-dim">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-light text-cream">{phase}</span>
                </li>
              ))}
            </ol>
          </LogWindow>
        </section>

        <section
          id="bugs"
          ref={bugsRef}
          className={`border-t border-rim py-[clamp(3.5rem,8vw,5.75rem)] ${bugsReveal}`}
        >
          <SectionHeading
            eyebrow="Step four"
            title="Real bugs, caught for real"
            lede="A clean typecheck, lint, and build never once meant the game actually worked. All three of these passed every automated gate — and were still broken."
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {BUGS.map((bug) => (
              <article
                key={bug.title}
                className="border-2 border-rim bg-panel p-6 shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.35),inset_2px_2px_0_rgba(255,255,255,0.08)]"
              >
                <h3 className="font-display text-[1.0625rem] font-extrabold text-bubblegum">
                  {bug.title}
                </h3>
                <p className="mt-3 text-[0.9375rem] font-light text-dim">
                  {bug.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="playtest"
          ref={testRef}
          className={`border-t border-rim py-[clamp(3.5rem,8vw,5.75rem)] ${testReveal}`}
        >
          <SectionHeading
            eyebrow="Step five"
            title="Tested by actual humans"
            lede="Four escalating rounds, each validating something the last one couldn't — none of it skipped, none of it simulated."
          />
          <LogWindow title="playtesting-loop.log">
            <div className="flex flex-col divide-y divide-rim">
              {PLAYTEST_ROUNDS.map((round) => (
                <div
                  key={round.who}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <span className="shrink-0 font-mono text-[0.8125rem] text-sky-candy sm:w-[15ch]">
                    {round.who}
                  </span>
                  <span className="text-[0.9375rem] font-light text-dim">
                    {round.found}
                  </span>
                </div>
              ))}
            </div>
          </LogWindow>
        </section>

        <section
          ref={closeRef}
          className={`border-t border-rim py-[clamp(3.5rem,8vw,5.75rem)] ${closeReveal}`}
        >
          <div className="flex flex-wrap items-center gap-8">
            <Roundel value="7" unit="PLANNING DOCS" />
            <Roundel value="5" unit="SPECIALIST AGENTS" />
            <Roundel value="9" unit="BUILD PHASES" />
            <Roundel value="100%" unit="AI-WRITTEN CODE" />
          </div>
          <p className="mt-8 max-w-[62ch] text-[1.0625rem] font-light text-dim">
            None of this shipped because it was pointed at a fun idea and left
            alone. It shipped because every step — the spec, the build order,
            the bugs, the playtesting — got the same rigor a human team would
            apply to itself. That&rsquo;s what &ldquo;build with AI&rdquo;
            actually looked like this year.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <PlayButton onClick={onPlay}>Play the game</PlayButton>
            <PlayButton onClick={onBackToHome} variant="ghost">
              Back to home
            </PlayButton>
          </div>
        </section>
      </main>
    </div>
  )
}
