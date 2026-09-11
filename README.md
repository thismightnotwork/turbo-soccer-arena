# Turbo Soccer Arena (Fan Game)

A free, browser-based, 3D car-soccer game built with [Three.js](https://threejs.org/).
Drive, boost, jump, flip, and smash a giant ball into your opponent's goal.

**This is an unofficial fan tribute project. It is not affiliated with, endorsed by, or
sponsored by Psyonix, Epic Games, or the makers of Rocket League(R). "Rocket League" is a
registered trademark of Psyonix LLC. All game code, art, and physics in this repository are
original and were written from scratch for this project.**

## Play

Open `index.html` in a modern desktop browser, or visit the GitHub Pages deployment of this
repo once enabled (see below). No build step or install is required — it's a static site.

### Controls

| Action | Key |
| --- | --- |
| Drive forward / reverse | `W` / `S` or `Arrow Up` / `Arrow Down` |
| Steer | `A` / `D` or `Arrow Left` / `Arrow Right` |
| Jump / flip (tap Space twice) | `Space` |
| Boost | `Left Shift` |
| Powerslide (tighter turns) | `Left Ctrl` |
| Toggle ball cam | `C` |
| Reset ball to center | `R` |
| Pause | `Esc` |

## Features

- Original arcade-style car physics: acceleration, grip vs. powerslide drift, jump,
  double-jump, and directional flips.
- Boost meter with big/small boost pads scattered around the arena.
- Ball physics with gravity, bounce, spin-based rolling, and car-impact impulses.
- A basic AI opponent that chases the ball and shoots at your goal.
- Scoreboard, match timer, goal celebration banner, pause menu, and match-end screen.

## Running locally

Because the game uses ES module imports, most browsers require it to be served over
`http://` rather than opened as a raw `file://` path. From the project folder run:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying to GitHub Pages

1. Go to the repository's **Settings -> Pages**.
2. Under "Build and deployment", set **Source** to `Deploy from a branch`.
3. Choose the `main` branch and the `/ (root)` folder, then save.
4. GitHub will publish the site at `https://<username>.github.io/<repo-name>/` within a
   couple of minutes.

## Tech stack

- [Three.js](https://threejs.org/) (loaded via CDN import map, no build tooling needed)
- Plain HTML / CSS / JavaScript (ES modules)

## Disclaimer

Turbo Soccer Arena is a non-commercial, independent fan project made for fun and learning.
It does not use any assets, code, or trademarks from Rocket League or Psyonix. Any
resemblance in gameplay concept (cars playing soccer) is a genre tribute, similar to how many
independent "car soccer" games exist. If you are a rights holder with concerns, please open an
issue.
