# adamratzman.com

This is my portfolio site, built as an Aspire-orchestrated TypeScript application:

- a Vite and React frontend in `apps/web`;
- a Fastify API in `services/api`;
- shared API contracts in `packages/contracts`;
- a TypeScript Aspire AppHost in `apphost.mts`.

## Run locally

Install Node.js 22 or later, the .NET 10 SDK, npm, and the Aspire CLI. Set
`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `KOMOOT_EMAIL`, and
`KOMOOT_PASSWORD`, then run:

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

## Agents

`.agents/skills` carries the Aspire skill set (`aspire`, `aspireify`,
`aspire-init`, `aspire-orchestration`, `aspire-deployment`, `aspire-monitoring`)
in the repository, so an agent working in this checkout picks up the AppHost
conventions and the deploy workflow without extra setup.

## Deploy

The AppHost is the single source of truth for the Azure topology, so deployment
goes through the Aspire CLI rather than a separate pipeline definition.

```sh
aspire publish -o ./artifacts   # generate Bicep only, no Azure calls
aspire deploy                   # build images, provision, and deploy to Azure
```

`aspire publish` writes the generated Bicep for every resource and touches
nothing in Azure, which makes it the safe way to review an infrastructure
change. `aspire deploy` runs the same model end to end: it builds the `api` and
`web` images, pushes them to the container registry, provisions any missing
resources, and rolls out new Azure Container Apps revisions.

Both commands read the target from the environment:

| Variable | Purpose |
| --- | --- |
| `Azure__SubscriptionId` | Target subscription |
| `Azure__ResourceGroup` | Target resource group |
| `Azure__Location` | Azure region |
| `AZURE_CONTAINER_REGISTRY_NAME` | Existing registry to reuse |
| `AZURE_APPLICATION_INSIGHTS_NAME` | Existing App Insights to reuse |
| `VITE_SPOTIFY_CLIENT_ID` | Spotify client id baked into the frontend |
| `SPOTIFY_CLIENT_SECRET` | Spotify client secret used by the API |
| `KOMOOT_EMAIL` / `KOMOOT_PASSWORD` | Komoot credentials for the activity service |
| `WEB_CUSTOM_DOMAIN` / `WEB_CUSTOM_DOMAIN_CERTIFICATE_NAME` | Apex hostname and its managed certificate |
| `WEB_WWW_CUSTOM_DOMAIN` / `WEB_WWW_CUSTOM_DOMAIN_CERTIFICATE_NAME` | `www` hostname and its managed certificate |

Deployment runs as the signed-in Azure CLI user. Aspire's credential has a short
shell timeout, so if `create-provisioning-context` fails with an authentication
timeout, run `az account get-access-token` once to warm the token cache and
retry.

### Hosting notes

The frontend image serves the built SPA with nginx rather than a static-site
host, because the SPA needs a filesystem fallback for deep links and a
same-origin `/api` proxy. Keeping the API same-origin is why the service needs
no CORS configuration.

Custom domains use Azure's free managed certificates. Those certificates require
DNS records that resolve directly to Azure, so the `adamratzman.com` records must
stay unproxied — routing them through an intermediate CNAME such as a Cloudflare
proxy blocks both issuance and renewal.

Custom domains are declared in the AppHost rather than bound only with
`az containerapp hostname bind`. Container Apps replaces the entire ingress
block on every deployment, so a hostname that exists only in Azure is dropped
the next time you deploy and the site starts failing TLS. Keeping the hostnames
in the model means `aspire deploy` re-asserts them every time.

Certificates are still created out of band, because Azure has to serve the
HTTP or CNAME validation challenge before a certificate exists to reference.
Bind a new hostname once, then set the matching `WEB_*_CUSTOM_DOMAIN` and
`WEB_*_CUSTOM_DOMAIN_CERTIFICATE_NAME` variables so future deploys keep it:

```sh
az containerapp hostname bind -n web -g personal-site-rg \
  --hostname adamratzman.com --certificate <certificate-id> \
  --validation-method HTTP
```

Apex domains validate with `HTTP` and need an `A` record pointing at the
environment's static IP; subdomains validate with `CNAME`. Both need an
`asuid` TXT record holding the environment's custom-domain verification ID.
