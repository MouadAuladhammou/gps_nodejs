const Sentry = require("@sentry/node");

const initSentry = (expressApp) => {
  Sentry.init({
    dsn: "https://ceea6eef768bf7368defd8c03169437a@o4505165383008256.ingest.sentry.io/4506593911898112",
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({
        // to trace all requests to the default router
        app: expressApp,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });

  return Sentry;
};

module.exports = initSentry;
