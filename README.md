# alva-10-birthday

## Games on the golden ticket

- **Alva's Space Jump** – the original minigame (inside `index.html`).
- **Super Alva Galaxy** – Alva's platformer through ten galaxies (`super-alva-galaxy.js`).
- **Miras Stjärnsafari** – Mira's own game (`mira/`): a photo safari in a
  tiger-striped gondola across seven floating islands, helping the lost tiger
  cub Nova find her mum and dad, the Star Tigers.

## Miras Stjärnsafari

The game is only downloaded when its button is pressed (see the small loader at
the end of `index.html`).

| File | What it does |
| --- | --- |
| `mira/mira-core.js` | helpers, sprite atlas, the pixel canvas, particles, saving |
| `mira/mira-content.js` | animals, fish, islands, story texts (all in Swedish) |
| `mira/mira-world.js` | skies, floating islands, water, the cable and the gondola |
| `mira/mira-audio.js` | synthesized music, ambience and sound effects |
| `mira/mira-ride.js` | the gondola ride: animals, photos, apples, flute, bubbles |
| `mira/mira-fishing.js` | fishing at the dock and through the ice |
| `mira/mira-story.js` | title screen, prologue, finale and epilogue |
| `mira/mira-ui.js` | menus, HUD, album and the game controller |
| `mira/mira-safari.css` | the game's interface styles |
| `mira/sprites/` | generated sprite sheets (PNG) and `atlas.js` |

### Sprite sheets

All pixel art is drawn in code in `scripts/mira-art/` and packed into PNG sheets:

```sh
npm install
npm run build:mira-sprites
```

Preview one module as a zoomed contact sheet while drawing:

```sh
node scripts/build-mira-sprites.mjs --preview animals-meadow --out preview.png --scale 4
```
