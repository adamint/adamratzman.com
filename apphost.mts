// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder, ProbeType } from './.aspire/modules/aspire.mjs';

const builder = await createBuilder();
const isPublishMode = await builder.executionContext().isPublishMode();

const spotifyClientId = await builder.addParameter(
  'spotify-client-id',
  {
    value: process.env.VITE_SPOTIFY_CLIENT_ID
      ?? process.env.SPOTIFY_CLIENT_ID,
  },
);
const spotifyClientSecret = await builder.addParameter(
  'spotify-client-secret',
  {
    secret: true,
    value: process.env.SPOTIFY_CLIENT_SECRET,
  },
);
const backendSiteOrigin = await builder.addParameter(
  'backend-site-origin',
  {
    value: process.env.BACKEND_SITE_ORIGIN,
  },
);
const komootEmail = await builder.addParameter(
  'komoot-email',
  {
    secret: true,
    value: process.env.KOMOOT_EMAIL,
  },
);
const komootPassword = await builder.addParameter(
  'komoot-password',
  {
    secret: true,
    value: process.env.KOMOOT_PASSWORD,
  },
);

// Custom domains have to live in the app model. Azure Container Apps replaces
// the whole ingress block on every deployment, so a hostname bound only with
// `az containerapp hostname bind` is silently dropped the next time we deploy
// and the site starts failing TLS until someone rebinds it by hand.
//
// Each entry pairs the hostname with the name of an existing managed
// certificate in the Container Apps environment. Certificates are still
// created out of band, because Azure has to serve the HTTP/CNAME validation
// challenge before a certificate exists to reference.
const webCustomDomains = [
  {
    key: 'apex',
    domain: process.env.WEB_CUSTOM_DOMAIN,
    certificate: process.env.WEB_CUSTOM_DOMAIN_CERTIFICATE_NAME,
  },
  {
    key: 'www',
    domain: process.env.WEB_WWW_CUSTOM_DOMAIN,
    certificate: process.env.WEB_WWW_CUSTOM_DOMAIN_CERTIFICATE_NAME,
  },
].filter((entry): entry is { key: string; domain: string; certificate: string } =>
  Boolean(entry.domain && entry.certificate));

// Replaces the standalone Kotlin App Service at adamratzmancombackend.azurewebsites.net.
// Deployed with no external ingress: only `api` talks to it, over the Container Apps
// environment's internal network.
const activity = await builder.addProject(
  'activity',
  'services/activity/AdamRatzman.Activity/AdamRatzman.Activity.csproj',
);
await activity.withEnvironment('Activity__KomootEmail', komootEmail);
await activity.withEnvironment('Activity__KomootPassword', komootPassword);

// Startup watches /ready, which only returns 200 once the first Komoot crawl has produced
// a snapshot, so Container Apps holds traffic off the revision for the whole ~50s cold
// start. There is deliberately no readiness probe: IsReady is a monotonic latch, so a
// readiness probe on /ready could never fail once startup passed, and Aspire rejects two
// probes sharing a path anyway. Liveness watches /health, which is process-alive only -
// pointing liveness at /ready would kill the container mid-crawl and it would never boot.
await activity.withHttpProbe(ProbeType.Startup, {
  path: '/ready',
  initialDelaySeconds: 5,
  periodSeconds: 5,
  timeoutSeconds: 5,
  failureThreshold: 60,
});
await activity.withHttpProbe(ProbeType.Liveness, {
  path: '/health',
  initialDelaySeconds: 10,
  periodSeconds: 30,
  timeoutSeconds: 5,
  failureThreshold: 5,
});

// Deliberately no `api.waitFor(activity)`. It has no effect on the Container Apps
// rollout (which is why the cutover is two deploys), and in run mode it would block
// the whole site's API on a ~50s Komoot crawl - and fail outright for anyone without
// Komoot credentials. A cold `activity` just 503s the /activity route instead.
const api = await builder.addJavaScriptApp(
  'api',
  '.',
  { runScriptName: 'dev:api' },
);
api.withBuildScript('build:api');
api.withHttpEndpoint({ env: 'PORT', name: 'http' });
api.withExternalHttpEndpoints();
api.withHttpHealthCheck({ path: '/api/health' });
api.withEnvironment('HOST', '0.0.0.0');
api.withEnvironment('SPOTIFY_CLIENT_ID', spotifyClientId);
api.withEnvironment('SPOTIFY_CLIENT_SECRET', spotifyClientSecret);
api.withEnvironment('BACKEND_SITE_ORIGIN', backendSiteOrigin);
api.publishAsPackageScript({ scriptName: 'start:api' });
if (isPublishMode) {
  await api.publishAsDockerFile(async (container) => {
    await container
      .withBuildArg('TARGET', 'api-runtime')
      .withEntrypoint('node')
      .withArgs(['--enable-source-maps', 'dist/server.js']);
  });
}

const web = await builder.addViteApp(
  'web',
  '.',
  { runScriptName: 'dev:web' },
);
web.withBuildScript('build:web');
web.withEnvironment('API_HTTP', api.getEndpoint('http'));
web.withEnvironment('BROWSER', 'none');
web.withEnvironment('VITE_SPOTIFY_CLIENT_ID', spotifyClientId);
web.withExternalHttpEndpoints();
web.waitFor(api);
if (isPublishMode) {
  await web.publishAsDockerFile(async (container) => {
    await container
      .withBuildArg('TARGET', 'web-runtime')
      .withEntrypoint('/docker-entrypoint.sh')
      .withArgs(['nginx', '-g', 'daemon off;']);
  });

  if (webCustomDomains.length > 0) {
    const domainParameters = await Promise.all(
      webCustomDomains.map(async (entry) => ({
        domain: await builder.addParameter(
          `web-custom-domain-${entry.key}`,
          { value: entry.domain },
        ),
        certificate: await builder.addParameter(
          `web-custom-domain-certificate-${entry.key}`,
          { value: entry.certificate },
        ),
      })),
    );

    await web.publishAsAzureContainerApp(async (_infrastructure, containerApp) => {
      for (const parameter of domainParameters) {
        await containerApp.configureCustomDomain(parameter.domain, parameter.certificate);
      }
    });
  }
}

if (isPublishMode) {
  const appInsights = await builder.addAzureApplicationInsights('appinsights');
  const existingAppInsightsName = process.env.AZURE_APPLICATION_INSIGHTS_NAME;
  if (existingAppInsightsName) {
    await appInsights.publishAsExisting(
      existingAppInsightsName,
      { resourceGroup: process.env.Azure__ResourceGroup },
    );
  }
  await api.withReference(appInsights);
  await activity.withReference(appInsights);

  const containerApps = await builder.addAzureContainerAppEnvironment('aca');
  await containerApps.withDashboard({ enable: false });

  const existingRegistryName = process.env.AZURE_CONTAINER_REGISTRY_NAME;
  if (existingRegistryName) {
    const registry = await builder.addAzureContainerRegistry('registry');
    await registry.publishAsExisting(
      existingRegistryName,
      { resourceGroup: process.env.Azure__ResourceGroup },
    );
    await containerApps.withAzureContainerRegistry(registry);
  }
}

await builder.build().run();
