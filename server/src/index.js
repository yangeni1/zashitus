import http from 'node:http'
import { config } from './config.js'
import { sendJson } from './http.js'
import { closeRouterResources, handleRequest } from './router.js'

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res)
  } catch (error) {
    const statusCode = error.statusCode || 500

    if (statusCode >= 500) {
      console.error(error.code || 'UNEXPECTED_ERROR', error.message)
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

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`)
})

function shutdown() {
  closeRouterResources()
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
