const { PORT } = require('./service-lib');

(async () => {
  const url = process.argv[2] || `http://localhost:${PORT}`;
  try {
    const response = await fetch(url, { redirect: 'manual' });
    console.log(`${response.status} ${url}`);
    if (!response.ok) process.exit(1);
  } catch (error) {
    console.error(`Health check failed for ${url}`);
    console.error(error.message || error);
    process.exit(1);
  }
})();
