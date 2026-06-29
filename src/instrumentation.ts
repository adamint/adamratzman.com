export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const azureMonitor = await import('@azure/monitor-opentelemetry');
    azureMonitor.useAzureMonitor();
  }
}
