# Knight Game — The Rosewood Rescue

A small, complete 2D browser adventure built with TypeScript, Canvas, and Vite. Defeat three dragons and rescue Princess Elowen in the enchanted grove.

## Run locally

With Node.js installed, run `npm ci` then `npm run dev`. This checkout also includes a portable Node runtime: use `.\npm-local.cmd run dev` on Windows. Open the localhost address printed by Vite.

- `npm run dev`: development server
- `npm run build`: TypeScript check and production build into `dist`
- `npm run preview`: serve the production build locally

## Controls and rules

- **WASD** (or arrow keys): move; diagonal speed stays consistent.
- **Space**: swing toward the direction you face. Each swing has a short cooldown.
- **Hold Shift**: raise your shield. It blocks frontal attacks, slows movement, and prevents sword attacks.
- Each dragon needs three sword hits. Dragons approach when you enter their detection range.
- You have three hearts. After taking damage, you briefly become invulnerable.
- Defeat all dragons to open the princess's rescue area, then walk to her to win.
- Losing all hearts ends the game. Use **Restart** or **Play again** to try again.

The game requires a desktop keyboard. It runs entirely in the browser; no backend, account, or downloaded artwork is required. Visuals are drawn with Canvas. The existing Phaser dependency from the starter is retained but unused.

## Structure

`src/main.ts` contains the compact game state, input, simulation, and rendering. `src/style.css` styles the surrounding page. Gameplay values are defined close to the small functions that use them.

GitHub repository: https://github.com/domino170/knight-game

## Version 2

Richer forest colors, layered characters, walking and breathing animations, fluttering cape, dragon wings and tail, shield glow, and drifting fireflies. Knight health appears as labeled hearts with a numeric count and an overhead health bar. Rescuing Elowen starts a 3.2-second celebration: she jumps and sends floating hearts, then the victory screen appears. Movement and combat stop during the celebration. Restart resets the whole sequence. The next stage is reserved for a future version.

## Version 3

Two stages: Rosewood Grove and the stone courtyard of Emberkeep Castle. Complete the first rescue celebration and select Next stage. Each stage starts with three hearts; Restart retries the current stage. Small green biters have 3 health and approach to bite. Large orange fire dragons have 5 health, bite at close range, and aim fireballs every 2.2 seconds within range. Dodge fireballs or face them while holding Shift; rocks and castle walls stop them.

In Emberkeep, defeat all four dragons and break the gate with five directional sword hits. The castle walls and intact gate block movement. Enter through the broken gate to reach Elowen. Her jumping and heart celebration precedes the final victory screen. Play again after the final victory starts at stage one.
