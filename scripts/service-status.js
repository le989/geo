const { serviceStatus } = require('./service-lib');
serviceStatus().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
