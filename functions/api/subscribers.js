// Trả danh sách email đăng ký nhận tin cho trang quản trị /quan-tri/.
// Chỉ người đăng nhập GitHub CÓ QUYỀN SỬA repo mới đọc được.
// Cần biến môi trường (Cloudflare Pages > Settings > Variables and Secrets):
//   SHEET_API_KEY  (Secret)  – trùng với ADMIN_KEY đặt trong Apps Script
// Tùy chọn: SHEET_API_URL (nếu đổi link Apps Script), GITHUB_REPO.
const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwQ1sR6K1Y2bf0bIg43FIqjqpZF5KQ9eNHt9jdCg3UBvz81d6SFszSBqUXkv4mkw-S5/exec';
const DEFAULT_REPO = 'dangthangk9-byte/evodasportswear';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.SHEET_API_KEY) return json({ ok: false, error: 'not_configured' }, 501);

  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  if (!m) return json({ ok: false, error: 'unauthorized' }, 401);

  // Kiểm tra token GitHub có quyền ghi vào repo không
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const gh = await fetch('https://api.github.com/repos/' + repo, {
    headers: { Authorization: 'Bearer ' + m[1], Accept: 'application/vnd.github+json', 'User-Agent': 'evoda-admin' },
  });
  if (!gh.ok) return json({ ok: false, error: 'unauthorized' }, 401);
  const info = await gh.json().catch(() => ({}));
  if (!info.permissions || !info.permissions.push) return json({ ok: false, error: 'forbidden' }, 403);

  // Lấy danh sách từ Google Sheet qua Apps Script
  const url = new URL(env.SHEET_API_URL || DEFAULT_SHEET_URL);
  url.searchParams.set('action', 'list');
  url.searchParams.set('key', env.SHEET_API_KEY);
  let data;
  try {
    const r = await fetch(url.toString(), { redirect: 'follow' });
    data = JSON.parse(await r.text());
  } catch (e) {
    return json({ ok: false, error: 'sheet_unreachable' }, 502);
  }
  if (!data || !data.ok) return json({ ok: false, error: (data && data.error) || 'sheet_error' }, 502);
  return json({ ok: true, rows: Array.isArray(data.rows) ? data.rows : [], sheetUrl: data.sheetUrl || '' });
}
