# Knight game development starter

Open this folder in VS Code. In its terminal run:

    .\npm-local.cmd run dev

Open the localhost URL printed in the terminal. Stop with Ctrl+C.

Build for publishing:

    .\npm-local.cmd run build

The dist folder contains the built website. This starter verifies the tooling; gameplay is not implemented yet.

Node.js/npm are installed locally under tools/node. The npm-local.cmd wrapper makes them available without changing Windows settings. Phaser is the game framework; TypeScript checks the code; Vite serves and builds the project.

Dependencies are locked in package-lock.json. On another computer install Node.js LTS and run npm ci. The portable runtime, node_modules, and dist are ignored by Git.

A local Git repository is initialized. No GitHub remote or public deployment is configured yet.
