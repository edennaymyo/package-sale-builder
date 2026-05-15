const STORAGE_KEY = 'modern-science-packages'

function send(res, status, body) {
  res.setHeader('cache-control', 'no-store')
  return res.status(status).json(body)
}

function isAuthorized(req) {
  const username = process.env.BUILDER_USERNAME || 'admin'
  const password = process.env.BUILDER_PASSWORD
  const authHeader = req.headers.authorization

  if (!password || !authHeader?.startsWith('Basic ')) {
    return false
  }

  try {
    const [providedUsername, providedPassword] = Buffer
      .from(authHeader.slice(6), 'base64')
      .toString('utf8')
      .split(':')

    return providedUsername === username && providedPassword === password
  } catch {
    return false
  }
}

async function kvRequest(command) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    throw new Error('Missing KV_REST_API_URL or KV_REST_API_TOKEN')
  }

  const response = await fetch(`${url}/${command}`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`KV request failed with ${response.status}`)
  }

  return response.json()
}

async function readPackages() {
  const data = await kvRequest(`get/${STORAGE_KEY}`)
  if (!data.result) return []
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result
}

async function writePackages(packages) {
  await kvRequest(`set/${STORAGE_KEY}/${encodeURIComponent(JSON.stringify(packages))}`)
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return send(res, 200, await readPackages())
    }

    if (!isAuthorized(req)) {
      return send(res, 401, { error: 'Authentication required' })
    }

    if (req.method === 'PUT') {
      const packages = req.body
      if (!Array.isArray(packages)) {
        return send(res, 400, { error: 'Expected package array' })
      }

      await writePackages(packages)
      return send(res, 200, packages)
    }

    return send(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : 'Storage error' })
  }
}
