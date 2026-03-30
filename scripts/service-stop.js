const { stopService } = require('./service-lib');
stopService().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
