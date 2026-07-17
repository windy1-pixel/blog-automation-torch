// This file MUST be the first import of the app.
// It loads .env and initializes Sentry before any other code runs,
// so Sentry can automatically capture errors from everything.
import "dotenv/config";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN, // if unset, Sentry is simply disabled
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 1.0, // capture performance traces for all requests (fine at our volume)
  enableLogs: true, // also send structured logs to Sentry's Logs view
});
