import http from 'node:http'
import { config } from './config.js'
import { sendJson } from './http.js'
import { closeRouterResources, handleRequest } from './router.js'

console.log("Starting Zashitus Server...");
console.log("CWD:", process.cwd());
console.log("Port:", config.port);

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res)
  } catch (error) {
    const statusCode = error.statusCode || 500

    if (statusCode >= 500) {
      console.error(error.code || 'UNEXPECTED_ERROR', error.message);
      if (error.stack) console.error(error.stack);
    }

    if (!res.headersSent) {
      sendJson(res, statusCode, {
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: statusCode >= 500 ? 'Internal server error' : error.message,
        },
      })
    } else {
      res.end()
    }
  }
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Error: Port ${config.port} is already in use.`);
  } else {
    console.error("Server error:", e);
  }
  process.exit(1);
});

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`)
})

function shutdown() {
  console.log("Shutting down...");
  closeRouterResources()
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
