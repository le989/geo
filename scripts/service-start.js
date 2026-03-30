const { startService } = require('./service-lib');
startService().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
