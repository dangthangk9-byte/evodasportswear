// Bước 1 của đăng nhập admin: chuyển người dùng sang trang cho phép của GitHub.
// Cần biến môi trường GITHUB_CLIENT_ID (đặt trong Cloudflare Pages > Settings > Variables).
export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response('Thiếu biến GITHUB_CLIENT_ID trong Cloudflare Pages.', { status: 500 });
  }
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', url.origin + '/oauth/callback');
  authorize.searchParams.set('scope', 'repo,user');
  authorize.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/oauth; Max-Age=600`,
    },
  });
}
