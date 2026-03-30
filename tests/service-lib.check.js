const assert = require('node:assert/strict');
const net = require('node:net');

const { isPortReachable } = require('../scripts/service-lib');

async function withServer(fn) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  try {
    const address = server.address();
    await fn(address.port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

(async () => {
  await withServer(async (port) => {
    assert.equal(await isPortReachable(port), true);
  });

  assert.equal(await isPortReachable(6553), false);
  console.log('service lib checks passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
