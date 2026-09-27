# Sunfade Retro

A warm, retro-inspired color palette playground. Tune a palette, preview it across a component gallery, and export it for your projects.

Sunfade Retro is an independent palette inspired by the warm, earthy approach of [Gruvbox](https://github.com/morhetz/gruvbox). Its default colors are a distinct Sunfade palette.

## Run locally

Requirements: Node.js 22 or newer and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite (by default, <http://localhost:3100>).

## Commands

```sh
pnpm dev        # Start the local Vite development server
pnpm build      # Build the static app into dist/
pnpm preview    # Preview the production build locally
pnpm typecheck  # Check TypeScript types
pnpm test       # Run palette and serializer tests
```

The app runs entirely in the browser and requires no database or API server. Palette editing and export are available locally; palette saving and version history are not implemented yet.

## Stack

- React 19 and TypeScript
- Vite 8
- Material UI 7
- Vitest

## License

[ISC](LICENSE)
