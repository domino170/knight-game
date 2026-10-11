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
