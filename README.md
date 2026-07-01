# Snake Game

A classic Snake game built with plain HTML5 Canvas, CSS, and vanilla JavaScript (no frameworks, no build step). Ships with a Dockerfile so it can be run anywhere with a single command.

![License](https://img.shields.io/badge/license-MIT-green)

Repo: https://github.com/meparlak/bounded-rationality-snake-game

## Features

- Smooth grid-based movement with keyboard (arrow keys / WASD) and on-screen touch controls for mobile
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
