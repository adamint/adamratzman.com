# adamratzman.com

This is my portfolio site, built as an Aspire-orchestrated TypeScript application:

- a Vite and React frontend in `apps/web`;
- a Fastify API in `services/api`;
- shared API contracts in `packages/contracts`;
- a TypeScript Aspire AppHost in `apphost.mts`.

## Run locally

Install Node.js 22 or later, npm, and the Aspire CLI. Set `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`, and `BACKEND_SITE_ORIGIN`, then run:

```sh
npm install
npm run aspire:start
```

The Aspire dashboard provides the local frontend and API URLs.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The site includes a working Spotify PKCE authorization example.