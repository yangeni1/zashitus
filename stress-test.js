async function stressTest() {
  for (let i = 0; i < 5; i++) {
    console.log(`Request ${i + 1}...`)
    try {
      const start = Date.now()
      const response = await fetch('http://localhost:3000/api/password/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'Password' + i + '!' })
      })
      const data = await response.json()
      console.log(`Response ${i + 1} (${Date.now() - start}ms):`, data.ai.status, data.ai.reason || '')
    } catch (e) {
      console.error(`Request ${i + 1} failed:`, e.message)
    }
  }
}

stressTest()
