# Contributing

Thanks for wanting to help. Bug reports, ideas and pull requests are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Keep the core promises: no accounts, no server that stores lists, nothing sent anywhere that could reveal a list's words or items. Changes that weaken these won't be merged.
- Security problems go through [SECURITY.md](SECURITY.md), not public issues.

## Setup

Node 22 or later.

```sh
npm install
npm run dev
```

Open http://localhost:5173/lemon.fork.bulb to try a list.

## Before opening a pull request

```sh
npm run format
npm run typecheck
npm test
npm run build
npm run test:e2e
```

CI runs the same checks. Add or update tests for behaviour you change: unit tests live in `tests/`, end-to-end tests (including two-device sync against a mock relay) in `e2e/`.

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
