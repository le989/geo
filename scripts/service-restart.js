const { stopService, startService } = require('./service-lib');
(async () => {
  await stopService().catch(() => undefined);
  await startService();
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
