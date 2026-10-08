// Bước 2: GitHub gọi lại đây kèm mã "code"; đổi mã đó lấy token rồi trả cho trang /admin/.
// Cần biến môi trường GITHUB_CLIENT_ID và GITHUB_CLIENT_SECRET.
function page(origin, status, content) {
  const msg = 'authorization:github:' + status + ':' + JSON.stringify(content);
  const html = `<!doctype html><html><body><script>
(function () {
  var msg = ${JSON.stringify(msg)};
  var origin = ${JSON.stringify(origin)};
  function receive(e) {
    if (e.origin !== origin) return;
    window.opener.postMessage(msg, e.origin);
    window.removeEventListener('message', receive, false);
    window.close();
  }
  window.addEventListener('message', receive, false);
  window.opener.postMessage('authorizing:github', origin);
})();
</script><p>Đang đăng nhập...</p></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/oauth; Max-Age=0',
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = request.headers.get('Cookie') || '';
  const saved = (cookie.match(/(?:^|;\s*)oauth_state=([^;]+)/) || [])[1];

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return page(origin, 'error', { message: 'Thiếu GITHUB_CLIENT_ID hoặc GITHUB_CLIENT_SECRET trong Cloudflare Pages.' });
  }
  if (!code || !state || !saved || state !== saved) {
    return page(origin, 'error', { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Hãy thử lại.' });
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'evoda-cms-oauth' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: origin + '/oauth/callback',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) {
    return page(origin, 'error', { message: data.error_description || data.error || 'GitHub không trả về token.' });
  }
  return page(origin, 'success', { token: data.access_token, provider: 'github' });
}
