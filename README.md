# Bounded Rationality Snake Game

A classic Snake game built with plain HTML5 Canvas, CSS, and vanilla JavaScript (no frameworks, no build step), built first and foremost as a small, hands-on model of **bounded rationality**. It also ships with a Dockerfile so it can be run anywhere with a single command.

![License](https://img.shields.io/badge/license-MIT-green)

Repo: https://github.com/meparlak/bounded-rationality-snake-game

Play it live: https://meparlak.github.io/bounded-rationality-snake-game/

## Bounded Rationality

**Bounded rationality**, a concept introduced by Herbert Simon, describes how real decision-makers actually behave, in contrast to the "perfectly rational" agent assumed by classical economics and game theory. A perfectly rational agent has unlimited time, unlimited information, and unlimited computational power, and always picks the objectively optimal action. Real agents — human or artificial — never have this. They face:

- **Limited information** — they can't see the whole state of the world (in Snake: the player only sees the current board, not the full future path of the snake or where food will spawn next).
- **Limited time** — decisions must be made within a deadline (in Snake: the game tick forces a move before the "ideal" move can be fully computed).
- **Limited computational/cognitive capacity** — even with enough time, exhaustively evaluating every possible future is infeasible (in Snake: the number of possible future paths explodes combinatorially as the snake grows).

Because of these constraints, agents don't optimize — they **satisfice**: they pick the first option that is "good enough" against some threshold, rather than searching exhaustively for the best possible option. Snake is a particularly clean model of this because the rules are simple, the state is fully observable at each instant, yet the *decision problem* (avoid death, keep options open, reach the food efficiently) still forces the player into this satisficing behavior instead of true optimization. That combination of simplicity and forced-under-pressure decision-making is exactly why this project uses Snake as the vehicle for exploring the concept, and why it works well as a base for simple theoretical simulations — e.g. comparing a greedy/heuristic-driven snake agent against an ideal, fully-informed agent, or measuring how decision quality degrades as available "thinking time" per move shrinks.

### Tools used to overcome the limits of bounded rationality

Since bounded rationality can't be eliminated (the constraints are structural), decision-makers rely on a set of tools and mechanisms to work *within* it and still make reasonably good decisions. These are the classic tools studied in this space, and they map naturally onto how a Snake-playing agent (human or algorithmic) can be built:

- **Heuristics** — simple, fast rules of thumb that approximate a good decision without full search (e.g. "always move toward the food unless it's unsafe," "prefer moves that keep the most open space around the head"). Cheap to compute, no guarantee of optimality.
- **Satisficing thresholds** — instead of searching for the *best* move, define a "good enough" bar (e.g. "any move that doesn't trap the snake within the next N steps is acceptable") and stop searching once it's met.
- **Bounded/limited-depth search (lookahead)** — instead of exploring the full game tree, only look a few moves ahead (e.g. flood-fill/BFS a handful of steps to check for dead ends) — a direct, tunable knob for simulating "how much rationality" an agent has.
- **Pruning and abstraction** — reduce the state space before reasoning about it (e.g. treat the board as a coarser grid, or only reason about the snake's immediate neighborhood instead of the whole board) so the remaining search is tractable in the available time.
- **Checklists and decision rules** — codify frequently-needed judgment calls into an explicit, ordered rule list (e.g. "1. avoid immediate collision, 2. avoid trapping yourself, 3. move toward food") so decisions are made quickly and consistently instead of re-derived from scratch every tick.
- **Learning from experience / reinforcement** — instead of reasoning from first principles each time, let an agent improve its heuristics over repeated plays (e.g. a simple reinforcement-learning agent trained on many Snake games), which trades upfront computation for accumulated experience.
- **External memory and tools** — offload what would otherwise have to be held in working memory (e.g. the high score in `localStorage`, or a precomputed path/lookup table) so the decision-maker doesn't need to recompute or remember everything internally.

Because the Snake board is small, discrete, and fully observable, it's cheap to implement and compare several of these tools side by side — which is what makes it useful for simple theoretical simulations of bounded rationality rather than just a game.

## Features

- Smooth grid-based movement with keyboard (arrow keys / WASD), swipe gestures on the board, and on-screen touch controls for mobile
- Timed power-ups (fog dissipator, time slower, algorithmic compass) that pop up briefly at surprise spots on the map, vanish if not eaten, and respawn later
- Score and persistent high score (saved in `localStorage`)
- Increasing speed as your score grows
- Pause/resume with `Space`
- Zero dependencies — just static files served by nginx in Docker

## Play locally (no Docker)

Just open `index.html` in your browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Run with Docker

```bash
docker build -t snake-game .
docker run --rm -p 8080:80 snake-game
```

Then open http://localhost:8080 in your browser.

### Or with Docker Compose

```bash
docker compose up --build
```

## Controls

| Action        | Key(s)              |
|---------------|----------------------|
| Move          | Arrow keys / W A S D |
| Pause/Resume  | Space                |
| Move (mobile) | On-screen arrow buttons |

## Project structure

```
.
├── index.html          # page markup
├── style.css           # styling
├── game.js             # game logic (rendering, input, loop)
├── Dockerfile           # nginx-based image to serve the static files
├── docker-compose.yml   # convenience wrapper around the Dockerfile
└── LICENSE
```

## Contributing

Issues and pull requests are welcome. This is a small, dependency-free codebase, so feel free to fork and experiment.

## License

Released under the [MIT License](LICENSE).
