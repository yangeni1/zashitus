export async function readLimitedText(response, limitBytes) {
  if (!response.body) {
    return ''
  }

  const chunks = []
  let total = 0

  for await (const chunk of response.body) {
    total += chunk.length

    if (total > limitBytes) {
      const error = new Error('External response is too large')
      error.statusCode = 502
      error.code = 'EXTERNAL_RESPONSE_TOO_LARGE'
      throw error
    }

    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

export async function readLimitedJson(response, limitBytes) {
  const body = await readLimitedText(response, limitBytes)
  return JSON.parse(body)
}
