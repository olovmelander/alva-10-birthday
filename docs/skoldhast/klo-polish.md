# Professor Klo: animation and the research-joke toy

29 September 2026. Implementation: `src/klo.mjs`, `story.mjs`, `input.mjs`,
`scripts/skoldhast-art/npcs.mjs`; integration in `view.mjs` and `main.mjs`.

## Audit and changes

The baseline switched two idle pictures and four walking pictures. Klo never
actually called the story walking action; entering the hole teleported him. His
eyes and claws could not move independently. The stick band intercepted taps,
and Klo had neither an input target nor a nonblocking reaction.

The new rig reuses the original coloured-pencil body, legs, eye stalks, claws,
stopwatch, notebook and pencil as separately drawn atlas parts. A distance-driven
sideways cycle animates the legs; a short eased scuttle replaces the hole
teleport. Local body motion adds soft breathing, small idle side steps, a hop and
claw wave on a tap, speaking gestures, blinks, glances and alternating instrument
checks. The body sinks into the hole while the eyes remain above its opening,
and emerges smoothly. Underwater he bobs and waves his claws gently. A layered
ellipse shadow uses no blur or other filter. Reduced motion suppresses the
largest movements.

The sign and map-corner story pictures remain whole and always have positive
horizontal scale. Their lettering cannot be mirrored by a turn.

Touch and mouse use the same small Klo hit target, including through the stick
band. K is the keyboard shortcut. A valid tap plays `crabclick`, animates Klo and
shows one of 36 Swedish research jokes in the existing nonblocking hint bubble.
A shuffled bag exhausts every line before repeating and avoids an immediate
repeat between bags. The cooldown is 5.2 seconds. Hidden, offscreen, emerging,
cutscene, dialogue and menu states reject taps without consuming a joke.

Pointer cancellation now clears a potential character tap instead of producing
an accidental Gnägg. A movement drag still drives the stick; tapping the hero
still neighs. The optional Följ fingret mode also routes touches through the
left control band. Canceled touches release steering and cannot latch a gallop.

## Checks and places to look

- `node --test tests/skoldhast-klo.test.mjs`: shuffled rounds, interaction gates,
  eased endpoint/ground tracking, world-coordinate independence, lettered poses,
  and actual input event listeners including follow-finger routing and cancellation.
- `node tests/browser/skoldhast-klo.mjs 844x390` and the same with `390x844`:
  stamped touch in the stick band, mouse, K, cooldown and scene/UI guards; then
  Gnägg and stick movement, followed by a touch/cancel test with Följ fingret.
- The robot's initial gallop: Klo scuttles to the hole before disappearing.
- Hide beside the hole: his eyes rise before his shell fully appears.
- Stop near him for 15 seconds: watch his eyes, stopwatch and notebook.
- Tap him: a small hop/claw wave and a research joke, with play still responsive.
- Kapitel 2: he floats gently in Kelpskogen.
- The map and finale: check the signs while he faces both directions.

Only about 11 KB was added to the NPC atlas. The combined first-playable build
measured 2.58 MB after this rebuild, below the 3 MB limit. Real-phone frame pacing
still requires a device check; the rig uses reusable sprites and no heavy effects.
