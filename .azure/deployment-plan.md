# Azure Deployment Plan

Status: Prepared for Aspire Deployment

## Goal

Migrate `adamratzman.com` from Vercel to Azure and add Aspire orchestration so the site can be run, evolved, and deployed consistently. Evaluate whether the NFC redirect/control-plane implementation should live in this app or a separate app.

## Requirements and assumptions

- **Classification**: Production personal site, cost-optimized for the free $150 Azure subscription.
- **Scale**: Small public website traffic, but should handle occasional spikes without manual ops.
- **Budget**: Minimize always-on cost where practical; avoid overbuilding.
- **Compliance**: No special compliance requirements identified.
- **Domain**: `adamratzman.com` currently points at Vercel and should move to Azure after deployment validation.
- **NFC goal**: Support programmable NFC sticker URLs later without requiring sticker rewrites.
- **Azure context**: Subscription, region, and policy constraints still need confirmation before provisioning.

## Workspace scan

| Item | Finding |
| --- | --- |
| Repository | `adamint/adamratzman.com` |
| Mode | MODERNIZE: existing non-Azure Next.js app moving from Vercel to Azure |
| Framework | Next.js 13.4 pages router, React 18, TypeScript |
| Package manager | Yarn (`yarn.lock`) |
| Runtime shape | SSR web app: has `getServerSideProps` pages and `src/pages/api/*` API routes |
| Existing Azure config | None found |
| Existing Aspire config | None found |
| Existing Docker config | None found |
| Secrets/config | Spotify server credentials via `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`; public Spotify client ID remains a build-time `NEXT_PUBLIC_*` value; backend host is server-side `BACKEND_SITE_ORIGIN` |

## Architecture decision

Use **Azure App Service through Aspire's Azure hosting integration** for the website rather than Azure Static Web Apps or hand-written AZD/Bicep.

Rationale:

- The app is not purely static: it has API routes and multiple `getServerSideProps` pages.
- Azure Static Web Apps would require accepting the current Next.js SSR limitations or changing the app shape.
- Azure App Service is the best fit for `adamratzman.com` as a public website: one stable HTTPS website, no scale-to-zero cold start, and a first-class Aspire `aspire deploy` path.
- Aspire's Azure App Service integration provisions the App Service plan, ACR, managed identity, website, dashboard, and deployment pipeline from the AppHost model.
- App Insights is modeled in Aspire and referenced by the web app so the deployed site receives `APPLICATIONINSIGHTS_CONNECTION_STRING`.
- Browser calls to the existing Komoot/activity backend go through a same-origin Next.js API proxy so backend origin configuration remains a deploy-time server setting instead of a build-time public value.
- The generated App Service plan is pinned to Basic B1 to keep the personal site cost-conscious while retaining stable App Service hosting for the SSR/API app.

Supporting Azure resources:

- Azure App Service environment for the Next.js app.
- Azure Container Registry for the generated standalone Next.js container image.
- Azure Application Insights and Log Analytics for diagnostics.
- Managed identity for App Service to pull from ACR.

## NFC recommendation

Add the NFC implementation as a **separate small service/app**, not directly inside the portfolio site.

Recommended shape:

- Keep `adamratzman.com` focused on the public personal site.
- Add a separate service later, for example `nfc.adamratzman.com`, with `/t/{tagId}` redirect/control-plane endpoints.
- Share the same Azure subscription/resource group strategy and Aspire orchestration if convenient, but keep code and deployment boundaries separate.

Why:

- NFC scans are an operational surface with redirects, analytics, admin state, and possibly private Mac mini webhooks.
- Keeping it separate avoids coupling the personal site’s availability/deployments to experiments with NFC automations.
- The tags can point to `https://nfc.adamratzman.com/t/<id>` from day one and remain reprogrammable server-side.

## Recipe

Use **Aspire-native Azure deployment**, not AZD.

Rationale:

- The user explicitly wants `aspire deploy`.
- The AppHost is now the source of truth for deployment.
- Generated Azure artifacts are a preview/handoff only; they should not be committed as primary infrastructure.
- Deployment command shape is `aspire deploy --environment Production --apphost apphost.cs` with Azure and parameter values supplied by environment variables.

## Planned changes after approval

1. Initialize Aspire in the existing repo with a C# file-based AppHost.
2. Wire the Next.js app with `AddNextJsApp`.
3. Configure Next.js standalone output for Aspire's generated production container.
4. Add Azure App Service and Application Insights hosting integrations.
5. Add a health endpoint for local and App Service health checks.
6. Validate with `yarn build`, `aspire start`, local health checks, and `aspire deploy --list-steps`.
7. Run `aspire deploy` only after real production parameter values are available.

## Deployment parameters

| Parameter | Secret | Purpose |
| --- | --- | --- |
| `spotifyClientId` | Yes | Server-side Spotify client credential for API routes |
| `spotifyClientSecret` | Yes | Server-side Spotify client secret for API routes |
| `backendSiteOrigin` | No | Existing backend origin or host used by Komoot/activity proxy routes |

`NEXT_PUBLIC_SPOTIFY_CLIENT_ID` remains the public browser-side Spotify PKCE client ID and is currently supplied from the tracked `.env` file at build time. Change that file and rebuild if the public Spotify app ID changes.

Suggested Production deployment context:

- `Azure__Location=westus2`
- `Azure__ResourceGroup=rg-adamratzman-com-prod`
- `Azure__SubscriptionId=<free-$150-subscription-id>`

## Phase 1 checklist

- [x] Analyze workspace
- [x] Gather requirements and assumptions
- [x] Scan codebase
- [x] Select deployment recipe
- [x] Plan architecture
- [x] Present plan for approval

## Phase 2 checklist

- [ ] Research selected Azure components
- [ ] Confirm Azure subscription and location
- [x] Generate Aspire and Azure-hosting AppHost artifacts
- [x] Harden security by keeping Spotify server credentials as Aspire secret parameters
- [x] Verify locally
- [ ] Run `aspire deploy` with real production parameter values
