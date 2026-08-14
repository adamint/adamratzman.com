import { buildApp } from './app.js';
import { readServerConfig } from './config.js';

const config = readServerConfig();
const app = buildApp();

await app.listen({ host: config.HOST, port: config.PORT });
