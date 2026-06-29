#:package Aspire.Hosting.Azure.AppService@13.5.0-preview.1.26329.4
#:package Aspire.Hosting.Azure.ApplicationInsights@13.5.0-preview.1.26329.4
#:package Aspire.Hosting.JavaScript@13.5.0-preview.1.26329.4
#:sdk Aspire.AppHost.Sdk@13.5.0-preview.1.26329.4

using Azure.Provisioning.AppService;

#pragma warning disable ASPIREJAVASCRIPT001

var builder = DistributedApplication.CreateBuilder(args);

var spotifyClientId = builder.AddParameter("spotifyClientId", secret: true);
var spotifyClientSecret = builder.AddParameter("spotifyClientSecret", secret: true);
var backendSiteOrigin = builder.AddParameter("backendSiteOrigin");

var web = builder.AddNextJsApp("web", ".", "dev")
    .WithYarn()
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/api/health")
    .WithEnvironment("SPOTIFY_CLIENT_ID", spotifyClientId)
    .WithEnvironment("SPOTIFY_CLIENT_SECRET", spotifyClientSecret)
    .WithEnvironment("BACKEND_SITE_ORIGIN", backendSiteOrigin);

if (builder.ExecutionContext.IsPublishMode)
{
    builder.AddAzureAppServiceEnvironment("appservice")
        .ConfigureInfrastructure(infra =>
        {
            var plan = infra.GetProvisionableResources().OfType<AppServicePlan>().Single();
            plan.Sku = new AppServiceSkuDescription
            {
                Name = "B1",
                Tier = "Basic"
            };
        });

    var appInsights = builder.AddAzureApplicationInsights("appinsights");
    web.WithReference(appInsights)
        .PublishAsAzureAppServiceWebsite((_, site) =>
        {
            site.SiteConfig.NumberOfWorkers = 1;
        });
}

builder.Build().Run();