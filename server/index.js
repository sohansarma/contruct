import { connect } from './db.js';
import { assertProductionConfig, env } from './env.js';
import { createApp } from './app.js';

assertProductionConfig();
await connect();
createApp().listen(env.port, () => console.log(`BuildRun API on :${env.port}`));
