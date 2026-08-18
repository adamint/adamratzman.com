# adamratzman.com

This is my portfolio site, built as an Aspire-orchestrated application:

- a Vite and React frontend in `apps/web`;
- a Fastify API in `services/api`;
- an ASP.NET Core activity service in `services/activity`, which mirrors Komoot;
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

Export every secret variable before deploying, not just the ones you changed.
Each is declared as `value: process.env.<NAME>` in the AppHost, so an unset
variable does not preserve whatever is already live in Azure — Aspire falls back
to prompting, and the deployment overwrites the running secret with the answer.
That is how `SPOTIFY_CLIENT_SECRET` reached production as the literal string
`y`: a prompt got answered as though it were a yes/no confirmation. The failure
is quiet, because a one-character secret passes validation and only fails later,
against Spotify.

Changing a secret out of band takes two steps, not one. Container Apps injects
secrets when a container starts, so `az containerapp secret set` alone updates
the stored value while the running replicas keep serving the old one. The
obvious follow-up, `az containerapp update` with no other arguments, does not
help: with nothing to change it is a no-op and creates no revision. Restart the
active revision instead, then poll until the endpoint recovers:

```sh
az containerapp secret set -n api -g personal-site-rg \
  --secrets spotify-client-secret=<value>
az containerapp revision restart -n api -g personal-site-rg \
  --revision "$(az containerapp show -n api -g personal-site-rg \
    --query properties.latestRevisionName -o tsv)"
```

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

### The activity service

The activity service mirrors Komoot rather than proxying it. Komoot has no
public API, no webhooks, and rate limits that a per-request proxy would hit, so
the service authenticates once, crawls the full tour list on a timer, and holds
an immutable snapshot in memory. A failed refresh keeps the previous snapshot,
so a Komoot outage shows stale data instead of an empty page.

It runs with internal-only ingress and is reached solely through the API's
`/api/komoot` proxy, which allowlists two paths. Its startup probe reports
healthy only once the first crawl has completed, which is what lets a new
revision roll out without ever serving an empty response. There is deliberately
no readiness probe: readiness is a monotonic latch, so once the startup probe
passes it could never fail, and liveness watches `/health` instead. Pointing
liveness at `/ready` would kill the container during its own cold start.

This replaced a Kotlin service that ran on a separate App Service in a different
subscription. The port was verified by diffing every endpoint against the live
Kotlin service: the month endpoint matches on all 58 months and 1682 tours, with
no value differences.

Three behaviours were deliberately **preserved** rather than corrected, because
the frontend already depends on them:

- Tours are bucketed in UTC rather than a local timezone, because UTC was the
  Kotlin container's system default.
- Komoot's `hike` sport is reported as `Other`, because the original only ever
  matched the string `hiking`. `mtb` is `Other` for the same reason.
- Month names are emitted as numbers (`"8"`, not `"August"`). The Kotlin asked
  the JDK for a stand-alone month name, and because CLDR has no distinct
  stand-alone month names for English, the JDK falls back to the number. Day
  names are unaffected and are still full English words, because CLDR *does*
  have stand-alone day names. Changing this is a one-line change, but it is a
  product decision rather than a migration one.

Three were deliberately **changed**, and one of them is visible:

- Weeks now run Monday to Sunday. The Kotlin bucketed Sunday to Saturday, so
  historical weekly charts shift: activity recorded on a Sunday moves into the
  following week's bucket.
- Week boundaries are true local midnight. The Kotlin's were 380 seconds before
  midnight, from an arithmetic bug.
- The oldest week is no longer dropped, so the week endpoint returns 439 buckets
  where the Kotlin returned 438.
- Pagination clamps when `offset + limit` exceeds the total. The Kotlin threw
  and returned a 500.

The App Service was kept running through the cutover as a live rollback target,
and has since been deleted along with its B3 plan, its `appserviceacr5pjadlrxljbbk`
registry, and the abandoned `appserviceacrqt7xxbcrr5sgc` registry left behind by
an earlier App Service publish attempt. Nothing references
`adamratzmancombackend.azurewebsites.net` any more.

Rollback is therefore no longer a traffic switch. Reverting means reverting the
commit and redeploying, which rebuilds the service from source rather than
falling back to a still-warm instance.
