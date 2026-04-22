import http from 'node:http'

const port = Number(process.env.PORT || 3000)

const server = http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
