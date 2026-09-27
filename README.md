# Sunfade Retro

A warm, retro-inspired color palette playground. Tune a palette, preview it across a component gallery, and export it for your projects.

Sunfade Retro is an independent palette inspired by the warm, earthy approach of [Gruvbox](https://github.com/morhetz/gruvbox). Its default colors are a distinct Sunfade palette.

## Run locally

Requirements: Node.js 22.12 or newer and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open <http://localhost:3100>.

## Commands

```sh
pnpm dev        # Start the Next.js development server
pnpm build      # Build the static site into out/
pnpm typecheck  # Check TypeScript types
pnpm test       # Run palette and serializer tests
```

The app is statically exported to `out/` and runs entirely in the browser, with no database or API server required. Deploy the contents of `out/` to any static web host. Palette editing and export are available locally; palette saving and version history are not implemented yet.

## Stack

- React 19 and TypeScript
- Next.js 16 App Router
- Material UI 9
- Vitest 5

## License

[ISC](LICENSE)
