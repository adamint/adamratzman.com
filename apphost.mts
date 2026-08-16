// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { createBuilder } from './.aspire/modules/aspire.mjs';

const builder = await createBuilder();

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

const api = await builder.addJavaScriptApp(
  'api',
  './services/api',
  { runScriptName: 'dev' },
);
api.withHttpEndpoint({ env: 'PORT', name: 'http' });
api.withExternalHttpEndpoints();
api.withHttpHealthCheck({ path: '/api/health' });
api.withEnvironment('HOST', '0.0.0.0');
api.withEnvironment('SPOTIFY_CLIENT_ID', spotifyClientId);
api.withEnvironment('SPOTIFY_CLIENT_SECRET', spotifyClientSecret);
api.withEnvironment('BACKEND_SITE_ORIGIN', backendSiteOrigin);
api.publishAsPackageScript({ scriptName: 'start' });

const web = await builder.addViteApp('web', './apps/web');
web.withEnvironment('API_HTTP', api.getEndpoint('http'));
web.withEnvironment('BROWSER', 'none');
web.withEnvironment('VITE_SPOTIFY_CLIENT_ID', spotifyClientId);
web.withExternalHttpEndpoints();
web.waitFor(api);
web.publishAsStaticWebsite({
  apiPath: '/api',
  apiTarget: api,
  outputPath: 'dist',
  targetEndpointName: 'http',
});

if (await builder.executionContext().isPublishMode()) {
  const appService = await builder.addAzureAppServiceEnvironment('appservice');
  appService.withDashboard({ enable: false });

  const appInsights = await builder.addAzureApplicationInsights('appinsights');
  appService.withAzureApplicationInsights({ applicationInsights: appInsights });
}

await builder.build().run();
