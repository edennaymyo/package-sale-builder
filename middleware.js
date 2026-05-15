export const config = {
  matcher: ['/builder', '/builder/:path*'],
}

const REALM = 'Package Builder'

function unauthorized() {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    },
  })
}

export default function middleware(request) {
  const username = process.env.BUILDER_USERNAME || 'admin'
  const password = process.env.BUILDER_PASSWORD

  if (!password) {
    return unauthorized()
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Basic ')) {
    return unauthorized()
  }

  try {
    const [providedUsername, providedPassword] = atob(authHeader.slice(6)).split(':')
    if (providedUsername === username && providedPassword === password) {
      return
    }
  } catch {
    return unauthorized()
  }

  return unauthorized()
}
