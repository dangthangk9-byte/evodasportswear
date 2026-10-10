/* EVODA Admin – trang quản trị nội dung (đọc/ghi dữ liệu qua GitHub API).
 * Đăng nhập: GitHub OAuth qua /oauth/auth (Cloudflare Pages Functions).
 * Mọi chỉnh sửa được giữ trong trình duyệt, bấm "Xuất bản" thì gộp thành 1 commit.
 */
(function () {
  'use strict';

  var CFG = {
    owner: 'dangthangk9-byte',
    repo: 'evodasportswear',
    branch: 'main',
    site: '',
    uploadDir: 'assets/images/khac',
    files: {
      products: { path: 'data/products.json', root: 'products', label: 'Sản phẩm' },
      collections: { path: 'data/collections.json', root: 'collections', label: 'Bộ sưu tập' },
      news: { path: 'data/news.json', root: 'news', label: 'Tin tức' }
    }
  };
  var TOKEN_KEY = 'evoda_admin_token';
  var API = 'https://api.github.com';
  var REPO = '/repos/' + CFG.owner + '/' + CFG.repo;

  var S = {
    token: null, user: null, files: {}, uploads: {}, newItems: new WeakSet(),
    ui: { prodFilter: 'all', prodQuery: '', newsQuery: '', colQuery: '', subQuery: '', picker: null, mdPreview: false },
    subs: null, subsState: 'idle', subsError: '', publishing: false, pick: null
  };
  var app = document.getElementById('app');

  /* ===================== Tiện ích ===================== */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function vnd(n) { var x = Number(n); return isFinite(x) ? x.toLocaleString('vi-VN') + 'đ' : '—'; }
  function slugify(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function store(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { } }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function P(str) { return str.split('|').map(function (x) { return /^\d+$/.test(x) ? Number(x) : x; }); }
  function getAt(obj, path) { return path.reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function setAt(obj, path, val) { var o = getAt(obj, path.slice(0, -1)); if (o != null) o[path[path.length - 1]] = val; }
  function rootObj(path) { return S.files[path[0]].data; }
  function getP(path) { return getAt(rootObj(path), path.slice(1)); }
  function setP(path, v) { setAt(rootObj(path), path.slice(1), v); }
  function arr(key) { var f = S.files[key]; return f ? f.data[CFG.files[key].root] : []; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function isoToDisplay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function imgSrc(v) { if (!v) return ''; var p = String(v).replace(/^\//, ''); return S.uploads[p] ? S.uploads[p].url : v; }
  function icon(name) {
    var d = {
      grid: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
      box: '<path d="M20.4 7.2 12 3 3.6 7.2 12 11.4z"/><path d="M3.6 7.2v9.6L12 21l8.4-4.2V7.2"/><path d="M12 11.4V21"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
      doc: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 18h5"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      ext: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
      out: '<path d="M15 4h4v16h-4"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>',
      down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
      sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
      upload: '<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>',
      old: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'
    }[name] || '';
    return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  }
  var toastTimer;
  function toast(msg, bad) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = 'toast' + (bad ? ' bad' : ''); }, bad ? 6000 : 3200);
  }
  function overlay(title, sub) {
    var o = document.getElementById('overlay');
    if (!title) { if (o) o.remove(); return; }
    if (!o) { o = document.createElement('div'); o.id = 'overlay'; o.className = 'overlay'; document.body.appendChild(o); }
    o.innerHTML = '<div class="card"><div class="spinner"></div><b>' + esc(title) + '</b><span class="muted">' + esc(sub || '') + '</span></div>';
  }
  function b64ToUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  // Mã SHA của tệp theo cách Git tính ("blob <độ dài>\0<nội dung>")
  function gitBlobSha(text) {
    var body = new TextEncoder().encode(text), head = new TextEncoder().encode('blob ' + body.length + '\0');
    var all = new Uint8Array(head.length + body.length); all.set(head, 0); all.set(body, head.length);
    return crypto.subtle.digest('SHA-1', all).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = function () { rej(new Error('Không đọc được tệp')); };
      r.readAsDataURL(blob);
    });
  }

  /* ===================== GitHub API ===================== */
  function gh(path, opts) {
    opts = opts || {};
    var headers = { 'Authorization': 'Bearer ' + S.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
      .then(function (res) {
        if (res.status === 401) { logout('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'); var e1 = new Error('401'); e1.status = 401; throw e1; }
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (j) {
            var e = new Error(j.message || ('GitHub báo lỗi ' + res.status)); e.status = res.status; throw e;
          });
        }
        return res.status === 204 ? null : res.json();
      });
  }
  function loadFile(key) {
    var c = CFG.files[key];
    return gh(REPO + '/contents/' + c.path + '?ref=' + CFG.branch).then(function (r) {
      var data = JSON.parse(b64ToUtf8(r.content));
      if (!Array.isArray(data[c.root])) data[c.root] = [];
      S.files[key] = { path: c.path, sha: r.sha, data: data, base: JSON.stringify(data, null, 2) };
    });
  }

  /* ===================== Đăng nhập ===================== */
  function setToken(t) { S.token = t; store(TOKEN_KEY, t); }
  function logout(msg) {
    S.token = null; S.user = null; S.files = {}; S.subs = null; S.subsState = 'idle';
    store(TOKEN_KEY, null); renderLogin(msg || '');
  }
  function startLogin() {
    var w = 600, h = 720;
    var left = (window.screenX || 0) + Math.max(0, ((window.outerWidth || w) - w) / 2);
    var top = (window.screenY || 0) + Math.max(0, ((window.outerHeight || h) - h) / 2);
    var pop = window.open('/oauth/auth?provider=github', 'evoda-github-login', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top);
    if (!pop) renderLogin('Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên (pop-up) cho trang này rồi thử lại.');
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || typeof e.data !== 'string') return;
    var d = e.data, okP = 'authorization:github:success:', badP = 'authorization:github:error:';
    if (d === 'authorizing:github') { if (e.source) e.source.postMessage('authorizing:github', e.origin); return; }
    if (d.indexOf(okP) === 0) {
      try { var p = JSON.parse(d.slice(okP.length)); if (p.token) { setToken(p.token); boot(); } } catch (x) { renderLogin('Không đọc được kết quả đăng nhập.'); }
    } else if (d.indexOf(badP) === 0) {
      var m = 'Đăng nhập thất bại.'; try { m = JSON.parse(d.slice(badP.length)).message || m; } catch (x) { }
      renderLogin(m);
    }
  });

  function renderLogin(msg) {
    app.innerHTML =
      '<div class="center"><div class="card login">' +
      '<div class="brand-mark">E</div>' +
      '<div><div class="eyebrow">Evoda Sportswear</div><h1>Trang quản trị</h1></div>' +
      '<p class="muted" style="margin:0">Đăng nhập bằng tài khoản GitHub đã được thêm vào dự án để sửa sản phẩm, bộ sưu tập, bài viết và xem danh sách đăng ký nhận tin.</p>' +
      (msg ? '<p class="err" role="alert" style="margin:0">' + esc(msg) + '</p>' : '') +
      '<button type="button" class="btn dark" data-a="login" style="width:100%">' +
      '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>' +
      'Đăng nhập bằng GitHub</button>' +
      '<a class="hint" href="/">← Về trang web</a>' +
      '</div></div>';
  }
  function renderLoading(msg) {
    app.innerHTML = '<div class="center"><div style="display:flex;flex-direction:column;align-items:center;gap:14px"><div class="spinner"></div><span class="muted">' + esc(msg) + '</span></div></div>';
  }

  function boot() {
    renderLoading('Đang kiểm tra tài khoản…');
    gh('/user').then(function (u) {
      S.user = u;
      return gh(REPO);
    }).then(function (repo) {
      if (!repo.permissions || !repo.permissions.push) {
        var who = S.user ? S.user.login : '';
        S.token = null; store(TOKEN_KEY, null);
        renderLogin('Tài khoản GitHub "' + who + '" chưa có quyền sửa dự án này. Nhờ chủ repo thêm bạn làm Collaborator rồi đăng nhập lại.');
        return null;
      }
      renderLoading('Đang tải dữ liệu…');
      return Promise.all(Object.keys(CFG.files).map(loadFile)).then(function () {
        render();
        loadSubs();
      });
    }).catch(function (e) {
      if (e && e.status === 401) return;
      renderLogin('Không tải được dữ liệu: ' + (e && e.message ? e.message : e));
    });
  }

  /* ===================== Trạng thái thay đổi ===================== */
  function isDirty(key) { var f = S.files[key]; return !!f && JSON.stringify(f.data, null, 2) !== f.base; }
  function dirtyKeys() { return Object.keys(S.files).filter(isDirty); }
  function pendingUploads() {
    var all = Object.keys(S.files).map(function (k) { return JSON.stringify(S.files[k].data); }).join('\n');
    return Object.keys(S.uploads).filter(function (p) { return !S.uploads[p].published && all.indexOf('/' + p) !== -1; });
  }
  function changeCount() { return dirtyKeys().length + pendingUploads().length; }
  window.addEventListener('beforeunload', function (e) {
    if (S.token && changeCount()) { e.preventDefault(); e.returnValue = ''; }
  });
  function pubbarHTML() {
    var keys = dirtyKeys(), ups = pendingUploads();
    if (!keys.length && !ups.length) return '';
    var parts = keys.map(function (k) { return CFG.files[k].label; });
    if (ups.length) parts.push(ups.length + ' ảnh mới');
    return '<div class="pubbar" id="pubbar"><div class="msg"><span class="dot" aria-hidden="true"></span>' +
      '<span>Có thay đổi chưa xuất bản: <b>' + esc(parts.join(', ')) + '</b></span></div>' +
      '<div class="acts"><button type="button" class="btn sm ghost-light" data-a="discard">Hoàn tác</button>' +
      '<button type="button" class="btn sm light" data-a="publish">' + icon('upload') + 'Xuất bản lên web</button></div></div>';
  }
  function refreshPubbar() {
    var old = document.getElementById('pubbar'), html = pubbarHTML();
    if (old && !html) { old.remove(); return; }
    if (old) { old.outerHTML = html; return; }
    if (html) { var m = document.querySelector('.main'); if (m) m.insertAdjacentHTML('afterbegin', html); }
  }

  /* ===================== Kiểm tra trước khi xuất bản ===================== */
  function validate() {
    var errs = [], seen;
    seen = {};
    arr('products').forEach(function (p, i) {
      var n = p.shortName || p.id || ('Sản phẩm #' + (i + 1));
      if (!String(p.id || '').trim()) errs.push(n + ': thiếu Mã sản phẩm');
      if (!String(p.shortName || '').trim()) errs.push(n + ': thiếu Tên ngắn');
      if (!String(p.slug || '').trim()) errs.push(n + ': thiếu đường dẫn (slug)');
      else if (seen[p.slug]) errs.push(n + ': đường dẫn "' + p.slug + '" bị trùng'); else seen[p.slug] = 1;
      if (!(typeof p.price === 'number' && p.price > 0)) errs.push(n + ': chưa nhập giá bán');
      if (p.tiktokLink && !/^https?:\/\//i.test(p.tiktokLink)) errs.push(n + ': link TikTok phải bắt đầu bằng https://');
      else if (p.tiktokLink && /tiktok\.com\/@/i.test(p.tiktokLink)) errs.push(n + ': link TikTok đang là trang shop, hãy dán link của đúng sản phẩm (shop.tiktok.com/vn/pdp/…)');
      if (!(p.images || []).length) errs.push(n + ': cần ít nhất 1 ảnh');
    });
    seen = {};
    arr('collections').forEach(function (c, i) {
      var n = c.name || ('Bộ sưu tập #' + (i + 1));
      if (!String(c.name || '').trim()) errs.push(n + ': thiếu Tên');
      if (!String(c.slug || '').trim()) errs.push(n + ': thiếu đường dẫn (slug)');
      else if (seen[c.slug]) errs.push(n + ': đường dẫn "' + c.slug + '" bị trùng'); else seen[c.slug] = 1;
    });
    seen = {};
    arr('news').forEach(function (a, i) {
      var n = a.title || ('Bài viết #' + (i + 1));
      if (!String(a.title || '').trim()) errs.push(n + ': thiếu Tiêu đề');
      if (!String(a.slug || '').trim()) errs.push(n + ': thiếu đường dẫn (slug)');
      else if (seen[a.slug]) errs.push(n + ': đường dẫn "' + a.slug + '" bị trùng'); else seen[a.slug] = 1;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) errs.push(n + ': ngày đăng chưa hợp lệ');
    });
    return errs;
  }

  /* ===================== Xuất bản (1 commit) ===================== */
  function publish(attempt) {
    attempt = attempt || 1;
    if (S.publishing && attempt === 1) return;
    var keys = dirtyKeys(), ups = pendingUploads();
    if (!keys.length && !ups.length) { toast('Không có thay đổi nào để xuất bản.'); return; }
    var errs = validate();
    if (errs.length) { window.alert('Chưa xuất bản được, cần sửa:\n\n• ' + errs.slice(0, 12).join('\n• ')); return; }
    S.publishing = true;
    overlay('Đang xuất bản…', 'Vui lòng không đóng trang này.');
    var headSha, baseTree, conflict = null;
    var checks = keys.map(function (k) {
      return gh(REPO + '/contents/' + S.files[k].path + '?ref=' + CFG.branch).then(function (r) { if (r.sha !== S.files[k].sha) conflict = k; });
    });
    Promise.all(checks).then(function () {
      if (conflict) { var e = new Error('conflict'); e.conflict = conflict; throw e; }
      return gh(REPO + '/git/ref/heads/' + CFG.branch);
    }).then(function (ref) {
      headSha = ref.object.sha;
      return gh(REPO + '/git/commits/' + headSha);
    }).then(function (c) {
      baseTree = c.tree.sha;
      return ups.reduce(function (pr, p) {
        return pr.then(function (list) {
          return gh(REPO + '/git/blobs', { method: 'POST', body: { content: S.uploads[p].b64, encoding: 'base64' } })
            .then(function (b) { list.push({ path: p, mode: '100644', type: 'blob', sha: b.sha }); return list; });
        });
      }, Promise.resolve([]));
    }).then(function (tree) {
      keys.forEach(function (k) { tree.push({ path: S.files[k].path, mode: '100644', type: 'blob', content: JSON.stringify(S.files[k].data, null, 2) }); });
      return gh(REPO + '/git/trees', { method: 'POST', body: { base_tree: baseTree, tree: tree } });
    }).then(function (t) {
      var names = keys.map(function (k) { return CFG.files[k].label; });
      if (ups.length) names.push(ups.length + ' ảnh');
      return gh(REPO + '/git/commits', { method: 'POST', body: { message: 'Cập nhật từ trang quản trị: ' + names.join(', '), tree: t.sha, parents: [headSha] } });
    }).then(function (commit) {
      return gh(REPO + '/git/refs/heads/' + CFG.branch, { method: 'PATCH', body: { sha: commit.sha } });
    }).then(function () {
      ups.forEach(function (p) { S.uploads[p].published = true; S.uploads[p].b64 = null; });
      return Promise.all(keys.map(function (k) {
        var text = JSON.stringify(S.files[k].data, null, 2);
        return gitBlobSha(text).then(function (sha) { S.files[k].sha = sha; S.files[k].base = text; });
      }));
    }).then(function () {
      S.newItems = new WeakSet();
      S.publishing = false; overlay(null); render();
      toast('Đã xuất bản. Website sẽ cập nhật sau khoảng 1–2 phút.');
    }).catch(function (e) {
      if (e && e.status === 422 && attempt < 3) { return publish(attempt + 1); }
      S.publishing = false; overlay(null);
      if (e && e.conflict) {
        var lbl = CFG.files[e.conflict].label;
        if (window.confirm('Trong lúc bạn sửa, mục "' + lbl + '" vừa được người khác cập nhật trên GitHub.\n\nBấm OK để tải bản mới nhất của mục này (thay đổi chưa xuất bản của bạn ở mục "' + lbl + '" sẽ mất). Bấm Hủy để giữ nguyên và tự xử lý sau.')) {
          overlay('Đang tải lại…'); loadFile(e.conflict).then(function () { overlay(null); render(); toast('Đã tải bản mới nhất của mục ' + lbl + '.'); })
            .catch(function (x) { overlay(null); toast('Tải lại thất bại: ' + x.message, true); });
        }
        return;
      }
      if (e && e.status === 401) return;
      toast('Xuất bản thất bại: ' + (e && e.message ? e.message : e), true);
    });
  }
  function discardAll() {
    if (!window.confirm('Bỏ tất cả thay đổi chưa xuất bản?')) return;
    Object.keys(S.files).forEach(function (k) { S.files[k].data = JSON.parse(S.files[k].base); });
    Object.keys(S.uploads).forEach(function (p) { if (!S.uploads[p].published) delete S.uploads[p]; });
    S.newItems = new WeakSet();
    var r = route();
    if (r[1] && r[1] !== 'moi') location.hash = '#/' + r[0]; else render();
    toast('Đã hoàn tác.');
  }

  /* ===================== Ảnh ===================== */
  function prepImage(file) {
    if (!/^image\//.test(file.type)) return Promise.reject(new Error(file.name + ' không phải ảnh'));
    var base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'anh';
    var stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    var keepAsIs = file.type === 'image/gif' || file.type === 'image/svg+xml' || (file.type === 'image/png' && file.size < 700000) || (file.size < 350000 && /jpe?g|webp/.test(file.type));
    var work;
    if (keepAsIs) {
      var ext = ({ 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp' })[file.type] || 'jpg';
      work = Promise.resolve({ blob: file, ext: ext });
    } else {
      work = new Promise(function (res, rej) {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () {
          var max = 1800, w = img.naturalWidth, h = img.naturalHeight, sc = Math.min(1, max / Math.max(w, h));
          var cv = document.createElement('canvas'); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(url);
          cv.toBlob(function (b) { b ? res({ blob: b, ext: 'jpg' }) : rej(new Error('Không nén được ảnh ' + file.name)); }, 'image/jpeg', 0.86);
        };
        img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh ' + file.name)); };
        img.src = url;
      });
    }
    return work.then(function (r) {
      return blobToB64(r.blob).then(function (b64) {
        var path = CFG.uploadDir + '/' + stamp + '-' + base + '.' + r.ext;
        var n = 1; while (S.uploads[path]) { path = CFG.uploadDir + '/' + stamp + '-' + base + '-' + (n++) + '.' + r.ext; }
        S.uploads[path] = { b64: b64, url: URL.createObjectURL(r.blob), published: false };
        return '/' + path;
      });
    });
  }
  var picker = document.getElementById('file-picker');
  function openPicker(target) { S.pick = target; picker.multiple = target.mode !== 'single'; picker.value = ''; picker.click(); }
  picker.addEventListener('change', function () {
    var files = Array.prototype.slice.call(picker.files || []), t = S.pick;
    if (!files.length || !t) return;
    overlay('Đang xử lý ảnh…', files.length + ' ảnh');
    files.reduce(function (pr, f) { return pr.then(function (out) { return prepImage(f).then(function (p) { out.push(p); return out; }); }); }, Promise.resolve([]))
      .then(function (paths) {
        overlay(null);
        if (t.mode === 'single') setP(t.path, paths[0]);
        else if (t.mode === 'list') { var a = getP(t.path); if (!Array.isArray(a)) { a = []; setP(t.path, a); } paths.forEach(function (p) { a.push(p); }); }
        else if (t.mode === 'md') { mdInsert(t.path, paths.map(function (p) { return '\n![Mô tả ảnh](' + p + ')\n'; }).join(''), ''); return; }
        render(true);
      }).catch(function (e) { overlay(null); toast(e.message, true); });
  });

  /* ===================== Định tuyến ===================== */
  function route() { return (location.hash.replace(/^#\/?/, '') || 'tong-quan').split('/'); }
  window.addEventListener('hashchange', function () { if (S.token && S.user && S.files.products) { S.ui.picker = null; S.ui.mdPreview = false; render(); window.scrollTo(0, 0); } });

  function render(keepScroll) {
    var y = window.scrollY;
    var r = route(), sec = r[0], id = r[1], body;
    if (sec === 'san-pham') body = id ? viewEdit('products', id) : viewProducts();
    else if (sec === 'bo-suu-tap') body = id ? viewEdit('collections', id) : viewCollections();
    else if (sec === 'tin-tuc') body = id ? viewEdit('news', id) : viewNews();
    else if (sec === 'nguoi-dang-ky') body = viewSubs();
    else { sec = 'tong-quan'; body = viewOverview(); }
    if (body === null) return;
    app.innerHTML = '<div class="shell">' + sidebar(sec) + '<main class="main" id="main">' + pubbarHTML() + body + '</main></div>';
    if (keepScroll) window.scrollTo(0, y);
  }

  function sidebar(sec) {
    function item(key, label, ic, count) {
      return '<a href="#/' + key + '" class="' + (sec === key ? 'on' : '') + '"' + (sec === key ? ' aria-current="page"' : '') + '>' + icon(ic) + esc(label) +
        (count != null ? '<span class="count">' + count + '</span>' : '') + '</a>';
    }
    var u = S.user || {};
    return '<nav class="side" aria-label="Menu quản trị">' +
      '<div class="brand"><div class="brand-mark">E</div><div><div class="brand-name">Evoda Admin</div><div class="brand-sub">Quản trị nội dung</div></div></div>' +
      '<div class="side-nav">' +
      item('tong-quan', 'Tổng quan', 'grid') +
      item('san-pham', 'Sản phẩm', 'box', arr('products').length) +
      item('bo-suu-tap', 'Bộ sưu tập', 'image', arr('collections').length) +
      item('tin-tuc', 'Tin tức & bài viết', 'doc', arr('news').length) +
      item('nguoi-dang-ky', 'Người đăng ký nhận tin', 'mail', S.subs ? S.subs.rows.length : null) +
      '</div>' +
      '<div class="side-foot">' +
      (u.login ? '<div class="side-user">' + (u.avatar_url ? '<img src="' + esc(u.avatar_url) + '" alt="">' : '') + '<span>' + esc(u.name || u.login) + '</span></div>' : '') +
      '<a href="/" target="_blank" rel="noopener">' + icon('ext') + 'Xem website</a>' +
      '<a href="https://analytics.google.com/" target="_blank" rel="noopener">' + icon('chart') + 'Google Analytics</a>' +
      '<button type="button" class="logout" data-a="logout">' + icon('out') + 'Đăng xuất</button>' +
      '</div></nav>';
  }

  /* ===================== Màn hình: Tổng quan ===================== */
  var LABELS = { NEW: 'Hàng mới', BESTSELLER: 'Bán chạy', SIGNATURE: 'Signature' };
  function badge(label) { return label ? '<span class="badge ' + esc(label) + '">' + esc(LABELS[label] || label) + '</span>' : ''; }
  function viewOverview() {
    var ps = arr('products'), cs = arr('collections'), ns = arr('news');
    var cnt = function (l) { return ps.filter(function (p) { return p.label === l; }).length; };
    var latest = ns.map(function (n) { return n.date || ''; }).sort().pop();
    var subN = S.subs ? S.subs.rows.length : (S.subsState === 'loading' ? '…' : '—');
    var subSub = S.subs ? 'Lấy tự động từ Google Sheet' : (S.subsState === 'off' ? 'Chưa kết nối Google Sheet' : (S.subsState === 'error' ? 'Không tải được' : 'Đang tải…'));
    function stat(lbl, ic, num, sub, href) {
      return '<a class="card stat" href="' + href + '"><div class="lbl">' + esc(lbl) + '<span class="ico">' + icon(ic) + '</span></div><div class="num">' + esc(num) + '</div><div class="sub">' + esc(sub) + '</div></a>';
    }
    var rows = ps.slice(0, 6).map(function (p) {
      var i = ps.indexOf(p);
      return '<a class="row-link" href="#/san-pham/' + i + '"><img class="thumb" src="' + esc(imgSrc((p.images || [])[0])) + '" alt="" loading="lazy">' +
        '<div style="flex:1 1 auto;min-width:0"><b style="display:block">' + esc(p.shortName || '(chưa đặt tên)') + '</b><small class="muted">' + esc(p.id || '') + ' · ' + (p.colors || []).length + ' màu</small></div>' +
        badge(p.label) + '<b style="min-width:96px;text-align:right">' + vnd(p.price) + '</b></a>';
    }).join('');
    return '<div class="page-head"><div><div class="eyebrow">Tổng quan</div><h1 class="title">Xin chào' + (S.user ? ', ' + esc((S.user.name || S.user.login).split(' ').slice(-1)[0]) : '') + '</h1></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="/" target="_blank" rel="noopener">' + icon('ext') + 'Xem website</a>' +
      '<a class="btn dark" href="#/san-pham/moi">' + icon('plus') + 'Thêm sản phẩm</a></div></div>' +
      '<section class="stats" aria-label="Số liệu nhanh">' +
      stat('Sản phẩm', 'box', ps.length, cnt('NEW') + ' hàng mới · ' + cnt('BESTSELLER') + ' bán chạy', '#/san-pham') +
      stat('Bộ sưu tập', 'image', cs.length, cs.map(function (c) { return (c.name || '').replace(/^EVODA\s+/i, ''); }).slice(0, 4).join(', '), '#/bo-suu-tap') +
      stat('Bài viết', 'doc', ns.length, latest ? 'Mới nhất: ' + isoToDisplay(latest) : 'Chưa có bài', '#/tin-tuc') +
      stat('Email đăng ký', 'mail', subN, subSub, '#/nguoi-dang-ky') +
      '</section>' +
      '<div class="cols"><section class="card col-main" style="gap:0;overflow:hidden"><div class="card-head"><h2 class="h">Sản phẩm đang bán</h2><a href="#/san-pham" class="muted" style="font-weight:600">Xem tất cả →</a></div>' + (rows || '<div class="empty">Chưa có sản phẩm.</div>') + '</section>' +
      '<aside class="col-side"><section class="card card-pad quick" style="display:flex;flex-direction:column;gap:10px"><h2 class="h" style="margin-bottom:4px">Làm nhanh</h2>' +
      '<a href="#/san-pham/moi"><span class="qi">' + icon('plus') + '</span>Thêm sản phẩm mới</a>' +
      '<a href="#/tin-tuc/moi"><span class="qi">' + icon('pen') + '</span>Viết bài tin tức</a>' +
      '<a href="#/bo-suu-tap"><span class="qi">' + icon('image') + '</span>Sửa ảnh & nội dung bộ sưu tập</a>' +
      '<a href="#/nguoi-dang-ky"><span class="qi">' + icon('mail') + '</span>Xem email đăng ký nhận tin</a>' +
      '</section><div class="note">' + icon('info') + '<span>Sửa xong mục nào cũng chưa lên web ngay. Khi xong hết, bấm <b>Xuất bản lên web</b> ở thanh màu đen phía trên: mọi thay đổi gộp thành <b>1 lần cập nhật</b> (Cloudflare cho tối đa 500 lần/tháng).</span></div></aside></div>';
  }

  /* ===================== Danh sách ===================== */
  var HEX = { 'vàng': '#E9C54E', 'xanh mint': '#A9D9C7', 'hồng': '#F1B6C5', 'đen': '#1A1A1A', 'trắng': '#FFFFFF', 'xanh': '#6F92C9', 'đỏ': '#B3261E', 'be': '#D8C5A4', 'xanh than': '#1F2A44', 'ivory white': '#F3EEE2', 'midnight navy': '#1C2340', 'espresso brown': '#4A3427', 'xám': '#9A9A9A', 'nâu': '#6B4A2F', 'tím': '#7D5BA6', 'cam': '#E58A3A', 'kem': '#F1E7D3' };
  function swatches(colors) {
    return (colors || []).slice(0, 7).map(function (c) { var h = HEX[String(c).toLowerCase()]; return '<span class="sw" title="' + esc(c) + '" style="background:' + (h || '#E7E1D8') + '"></span>'; }).join('') +
      ((colors || []).length > 7 ? ' <small class="muted">+' + ((colors || []).length - 7) + '</small>' : '');
  }
  function norm(s) { return slugify(s).replace(/-/g, ' '); }
  function searchBox(key, ph) {
    return '<label class="search">' + icon('search') + '<span class="sr-only">Tìm kiếm</span><input type="search" data-q="' + key + '" value="' + esc(S.ui[key]) + '" placeholder="' + esc(ph) + '"></label>';
  }
  function viewProducts() {
    var ps = arr('products'), f = S.ui.prodFilter, q = norm(S.ui.prodQuery);
    var tabs = [['all', 'Tất cả'], ['NEW', 'Hàng mới'], ['BESTSELLER', 'Bán chạy'], ['SIGNATURE', 'Signature'], ['none', 'Không nhãn']].map(function (t) {
      var n = t[0] === 'all' ? ps.length : ps.filter(function (p) { return t[0] === 'none' ? !p.label : p.label === t[0]; }).length;
      return '<button type="button" class="tab' + (f === t[0] ? ' on' : '') + '" data-a="pf" data-v="' + t[0] + '" aria-pressed="' + (f === t[0]) + '">' + t[1] + ' (' + n + ')</button>';
    }).join('');
    var rows = ps.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) {
      var p = x.p;
      if (f !== 'all' && (f === 'none' ? !!p.label : p.label !== f)) return false;
      return !q || norm([p.id, p.shortName, p.name, p.collection].join(' ')).indexOf(q) !== -1;
    }).map(function (x) {
      var p = x.p, i = x.i;
      return '<tr><td><div class="cell-title"><img class="thumb" src="' + esc(imgSrc((p.images || [])[0])) + '" alt="" loading="lazy"><div><b>' + esc(p.shortName || '(chưa đặt tên)') + '</b><small>' + esc(p.id || '') + (p.collection ? ' · ' + esc(p.collection) : '') + '</small></div></div></td>' +
        '<td style="font-weight:600;white-space:nowrap">' + vnd(p.price) + '</td><td>' + swatches(p.colors) + '</td>' +
        '<td style="white-space:nowrap" class="muted">' + esc((p.sizes || []).join(' · ')) + '</td><td>' + badge(p.label) + '</td>' +
        '<td><span class="actions"><a class="btn sm" href="#/san-pham/' + i + '">' + icon('pen') + 'Sửa</a>' +
        '<a class="btn sm icon" href="/san-pham/chi-tiet.html?slug=' + encodeURIComponent(p.slug || '') + '" target="_blank" rel="noopener" aria-label="Xem ' + esc(p.shortName) + ' trên web">' + icon('eye') + '</a>' +
        '<button type="button" class="btn sm icon danger" data-a="del-item" data-k="products" data-i="' + i + '" aria-label="Xóa ' + esc(p.shortName) + '">' + icon('trash') + '</button></span></td></tr>';
    }).join('');
    return '<div class="page-head"><div><div class="eyebrow">Quản lý</div><h1 class="title">Sản phẩm</h1></div><a class="btn dark" href="#/san-pham/moi">' + icon('plus') + 'Thêm sản phẩm</a></div>' +
      '<div class="toolbar"><div class="tabs" role="group" aria-label="Lọc theo nhãn">' + tabs + '</div>' + searchBox('prodQuery', 'Tìm theo tên hoặc mã (VD: EV05)') + '</div>' +
      '<section class="card table-wrap"><table class="t"><thead><tr><th scope="col">Sản phẩm</th><th scope="col">Giá</th><th scope="col">Màu</th><th scope="col">Size</th><th scope="col">Nhãn</th><th scope="col">Thao tác</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6" class="empty">Không có sản phẩm phù hợp.</td></tr>') + '</tbody></table></section>';
  }
  function viewCollections() {
    var cs = arr('collections'), q = norm(S.ui.colQuery);
    var rows = cs.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return !q || norm([x.c.name, x.c.code].join(' ')).indexOf(q) !== -1; }).map(function (x) {
      var c = x.c, i = x.i;
      return '<tr><td><div class="cell-title"><img class="thumb" src="' + esc(imgSrc(c.poster)) + '" alt="" loading="lazy"><div><b>' + esc(c.name || '(chưa đặt tên)') + '</b><small>' + esc(c.code || '') + '</small></div></div></td>' +
        '<td><img class="thumb wide" src="' + esc(imgSrc(c.banner)) + '" alt="" loading="lazy"></td>' +
        '<td>' + (c.productSlugs || []).length + ' sản phẩm</td><td>' + (c.gallery || []).length + ' ảnh</td>' +
        '<td><span class="actions"><a class="btn sm" href="#/bo-suu-tap/' + i + '">' + icon('pen') + 'Sửa</a>' +
        '<a class="btn sm icon" href="/bo-suu-tap/chi-tiet.html?slug=' + encodeURIComponent(c.slug || '') + '" target="_blank" rel="noopener" aria-label="Xem trên web">' + icon('eye') + '</a>' +
        '<button type="button" class="btn sm icon danger" data-a="del-item" data-k="collections" data-i="' + i + '" aria-label="Xóa ' + esc(c.name) + '">' + icon('trash') + '</button></span></td></tr>';
    }).join('');
    return '<div class="page-head"><div><div class="eyebrow">Quản lý</div><h1 class="title">Bộ sưu tập</h1></div><a class="btn dark" href="#/bo-suu-tap/moi">' + icon('plus') + 'Thêm bộ sưu tập</a></div>' +
      '<div class="toolbar"><span class="muted">Ảnh poster hiện ở trang danh sách, ảnh banner ở đầu trang chi tiết.</span>' + searchBox('colQuery', 'Tìm bộ sưu tập') + '</div>' +
      '<section class="card table-wrap"><table class="t"><thead><tr><th scope="col">Bộ sưu tập</th><th scope="col">Banner</th><th scope="col">Sản phẩm</th><th scope="col">Thư viện</th><th scope="col">Thao tác</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5" class="empty">Không có bộ sưu tập phù hợp.</td></tr>') + '</tbody></table></section>';
  }
  function viewNews() {
    var ns = arr('news'), q = norm(S.ui.newsQuery);
    var rows = ns.map(function (n, i) { return { n: n, i: i }; }).filter(function (x) { return !q || norm([x.n.title, x.n.excerpt].join(' ')).indexOf(q) !== -1; }).map(function (x) {
      var n = x.n, i = x.i;
      return '<tr><td><div class="cell-title"><img class="thumb wide" src="' + esc(imgSrc(n.image)) + '" alt="" loading="lazy"><div style="max-width:520px"><b>' + esc(n.title || '(chưa có tiêu đề)') + '</b><small>' + esc((n.excerpt || '').slice(0, 110)) + ((n.excerpt || '').length > 110 ? '…' : '') + '</small></div></div></td>' +
        '<td style="white-space:nowrap">' + esc(n.displayDate || isoToDisplay(n.date)) + '</td>' +
        '<td><span class="actions"><a class="btn sm" href="#/tin-tuc/' + i + '">' + icon('pen') + 'Sửa</a>' +
        '<a class="btn sm icon" href="/tin-tuc/bai-viet.html?slug=' + encodeURIComponent(n.slug || '') + '" target="_blank" rel="noopener" aria-label="Xem trên web">' + icon('eye') + '</a>' +
        '<button type="button" class="btn sm icon danger" data-a="del-item" data-k="news" data-i="' + i + '" aria-label="Xóa bài viết">' + icon('trash') + '</button></span></td></tr>';
    }).join('');
    return '<div class="page-head"><div><div class="eyebrow">Quản lý</div><h1 class="title">Tin tức & bài viết</h1></div><a class="btn dark" href="#/tin-tuc/moi">' + icon('plus') + 'Viết bài mới</a></div>' +
      '<div class="toolbar"><span class="muted">Bài ở trên cùng hiện đầu tiên trên trang Tin tức.</span>' + searchBox('newsQuery', 'Tìm bài viết') + '</div>' +
      '<section class="card table-wrap"><table class="t"><thead><tr><th scope="col">Bài viết</th><th scope="col">Ngày đăng</th><th scope="col">Thao tác</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="3" class="empty">Không có bài viết phù hợp.</td></tr>') + '</tbody></table></section>';
  }

  /* ===================== Tạo mới ===================== */
  function nextProductId() {
    var max = 0; arr('products').forEach(function (p) { var m = /(\d+)/.exec(p.id || ''); if (m) max = Math.max(max, Number(m[1])); });
    return 'EV' + String(max + 1).padStart(2, '0');
  }
  function createItem(key) {
    var item;
    if (key === 'products') {
      var c0 = arr('collections')[0] || {};
      item = { id: nextProductId(), slug: '', name: '', shortName: '', collection: collectionLabel(c0.name), collectionSlug: c0.slug || '', price: 0, colors: [], sizes: ['S', 'M', 'L'], label: 'NEW', isNew: true, isBestseller: false, images: [], colorImages: [], description: '', features: [], material: '', style: '', suitableFor: [], tiktokLink: '', type: 'set' };
      item.slug = slugify(item.id);
      arr('products').push(item);
    } else if (key === 'collections') {
      item = { slug: '', code: '', name: '', poster: '', banner: '', shortDescription: '', intro: '', pieces: [], material: '', colors: [], suitableFor: [], productSlugs: [], gallery: [] };
      arr('collections').push(item);
    } else {
      var max = 0; arr('news').forEach(function (n) { var m = /(\d+)/.exec(n.id || ''); if (m) max = Math.max(max, Number(m[1])); });
      var d = todayISO();
      item = { id: 'n' + (max + 1), slug: '', title: '', date: d, displayDate: isoToDisplay(d), image: '', excerpt: '', body: '' };
      arr('news').unshift(item);
    }
    S.newItems.add(item);
    return arr(key).indexOf(item);
  }
  function collectionLabel(name) {
    var rest = String(name || '').replace(/^EVODA\s+/i, '').toLowerCase();
    return rest ? 'Evoda ' + rest.charAt(0).toUpperCase() + rest.slice(1) : '';
  }
  function autoSlug(key, item) {
    if (!S.newItems.has(item)) return;
    if (key === 'products') item.slug = slugify([item.id, String(item.shortName || '').replace(/^EVODA\s+/i, '')].join(' '));
    if (key === 'collections') item.slug = slugify(String(item.name || '').replace(/^EVODA\s+/i, ''));
    if (key === 'news') item.slug = slugify(item.title);
  }

  /* ===================== Trường nhập liệu ===================== */
  function lab(d) { return '<span class="lab">' + esc(d.label) + (d.req ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</span>'; }
  function hint(d) { return d.hint ? '<span class="hint">' + esc(d.hint) + '</span>' : ''; }
  function F(d, path) {
    var v = getP(path), ps = path.join('|'), id = 'f-' + ps.replace(/\|/g, '-');
    switch (d.t) {
      case 'text': case 'url':
        return '<label class="field" for="' + id + '">' + lab(d) + '<input class="inp" id="' + id + '" type="' + (d.t === 'url' ? 'url' : 'text') + '" data-p="' + ps + '" data-t="text" value="' + esc(v) + '"' + (d.ro ? ' readonly' : '') + (d.ph ? ' placeholder="' + esc(d.ph) + '"' : '') + '>' + hint(d) + '</label>';
      case 'textarea':
        return '<label class="field" for="' + id + '">' + lab(d) + '<textarea class="ta" id="' + id + '" data-p="' + ps + '" data-t="text" rows="' + (d.rows || 4) + '">' + esc(v) + '</textarea>' + hint(d) + '</label>';
      case 'money':
        return '<label class="field" for="' + id + '">' + lab(d) + '<span class="money"><input id="' + id + '" inputmode="numeric" data-p="' + ps + '" data-t="money" value="' + esc(typeof v === 'number' ? v.toLocaleString('vi-VN') : (v || '')) + '"><span class="muted">đ</span></span>' + hint(d) + '</label>';
      case 'date':
        return '<label class="field" for="' + id + '">' + lab(d) + '<input class="inp" id="' + id + '" type="date" data-p="' + ps + '" data-t="date" value="' + esc(v) + '">' + hint(d) + '</label>';
      case 'select':
        var opts = d.options(), cur = d.value ? d.value(path) : v, has = opts.some(function (o) { return o[0] === cur; });
        if (!has && cur) opts = [[cur, cur + ' (hiện tại)']].concat(opts);
        return '<label class="field" for="' + id + '">' + lab(d) + '<select class="sel" id="' + id + '" data-p="' + ps + '" data-t="select" data-x="' + (d.x || '') + '">' +
          opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' + hint(d) + '</label>';
      case 'chips':
        var list = Array.isArray(v) ? v : [];
        return '<div class="field">' + lab(d) + '<div class="chips">' + list.map(function (c, i) {
          var hx = d.swatch ? HEX[String(c).toLowerCase()] : null;
          return '<span class="chip">' + (d.swatch ? '<span class="sw" style="background:' + (hx || '#E7E1D8') + ';margin:0"></span>' : '') + esc(c) +
            '<button type="button" data-a="chip-del" data-p="' + ps + '" data-i="' + i + '" aria-label="Bỏ ' + esc(c) + '">×</button></span>';
        }).join('') + '<span class="chip-add"><input type="text" data-chip="' + ps + '" placeholder="' + esc(d.ph || 'Gõ rồi bấm Enter') + '" aria-label="Thêm ' + esc(d.label) + '"><button type="button" class="btn sm" data-a="chip-add" data-p="' + ps + '">Thêm</button></span></div>' + hint(d) + '</div>';
      case 'sizes':
        var cur2 = Array.isArray(v) ? v : [], base = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        var all = base.concat(cur2.filter(function (s) { return base.indexOf(s) === -1; }));
        return '<div class="field">' + lab(d) + '<div class="toggle-sizes">' + all.map(function (s) {
          var on = cur2.indexOf(s) !== -1;
          return '<button type="button" class="size-btn' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="size" data-p="' + ps + '" data-v="' + esc(s) + '">' + esc(s) + '</button>';
        }).join('') + '</div>' + hint(d) + '</div>';
      case 'lines':
        var rows = Array.isArray(v) ? v : [];
        return '<div class="field">' + lab(d) + '<div class="list-rows">' + rows.map(function (t, i) {
          return '<div class="lrow"><span class="num">' + (i + 1) + '</span><textarea class="ta" rows="1" data-p="' + ps + '|' + i + '" data-t="text" aria-label="' + esc(d.label) + ' ' + (i + 1) + '">' + esc(t) + '</textarea>' +
            '<button type="button" class="btn icon sm" data-a="row-up" data-p="' + ps + '" data-i="' + i + '" aria-label="Đưa lên"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn icon sm danger" data-a="row-del" data-p="' + ps + '" data-i="' + i + '" aria-label="Xóa dòng ' + (i + 1) + '">×</button></div>';
        }).join('') + '<div><button type="button" class="btn sm" data-a="row-add" data-p="' + ps + '">' + icon('plus') + (d.add || 'Thêm dòng') + '</button></div></div>' + hint(d) + '</div>';
      case 'image':
        return '<div class="field">' + lab(d) + '<div class="img-single">' +
          (v ? '<div class="img-tile">' + (isNewUpload(v) ? '<span class="tag new">Ảnh mới</span>' : '') + '<img src="' + esc(imgSrc(v)) + '" alt=""></div>' : '<div class="img-tile" style="display:flex;align-items:center;justify-content:center"><span class="hint">Chưa có ảnh</span></div>') +
          '<div style="display:flex;flex-direction:column;gap:8px"><button type="button" class="btn sm" data-a="upload" data-p="' + ps + '" data-m="single">' + icon('upload') + (v ? 'Đổi ảnh' : 'Tải ảnh lên') + '</button>' +
          (v && !d.req ? '<button type="button" class="btn sm danger" data-a="img-clear" data-p="' + ps + '">Bỏ ảnh</button>' : '') + '</div></div>' + hint(d) + '</div>';
      case 'images':
        var imgs = Array.isArray(v) ? v : [];
        var pick = d.pickFrom ? d.pickFrom(path) : null, pickOpen = S.ui.picker === ps;
        return '<div class="field">' + lab(d) + '<div class="imgs">' + imgs.map(function (src, i) {
          return '<div class="img-tile' + (i === 0 && d.mainFirst ? ' main' : '') + '">' + (i === 0 && d.mainFirst ? '<span class="tag">Ảnh chính</span>' : (isNewUpload(src) ? '<span class="tag new">Mới</span>' : '')) +
            '<img src="' + esc(imgSrc(src)) + '" alt="" loading="lazy"><span class="tools">' +
            (i > 0 ? '<button type="button" data-a="img-left" data-p="' + ps + '" data-i="' + i + '" aria-label="Đưa ảnh ' + (i + 1) + ' lên trước" title="' + (d.mainFirst && i === 1 ? 'Đặt làm ảnh chính' : 'Đưa lên trước') + '">←</button>' : '') +
            '<button type="button" class="del" data-a="img-del" data-p="' + ps + '" data-i="' + i + '" aria-label="Xóa ảnh ' + (i + 1) + '" title="Xóa ảnh">×</button></span></div>';
        }).join('') +
          '<button type="button" class="img-add" data-a="upload" data-p="' + ps + '" data-m="list">' + icon('upload') + 'Tải ảnh lên</button>' +
          (pick && pick.length ? '<button type="button" class="img-add" data-a="picker" data-p="' + ps + '" aria-expanded="' + pickOpen + '">' + icon('image') + 'Chọn từ ảnh có sẵn</button>' : '') +
          '</div>' +
          (pickOpen && pick ? '<div class="picker" role="group" aria-label="Chọn ảnh có sẵn">' + pick.map(function (src) {
            var on = imgs.indexOf(src) !== -1;
            return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="pick" data-p="' + ps + '" data-v="' + esc(src) + '"><img src="' + esc(imgSrc(src)) + '" alt=""></button>';
          }).join('') + '</div>' : '') + hint(d) + '</div>';
      case 'checks':
        var sel = Array.isArray(v) ? v : [];
        return '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="lab" style="font-size:14px;font-weight:600;margin-bottom:6px">' + esc(d.label) + '</legend><div class="checks">' +
          d.options().map(function (o) {
            return '<label class="check"><input type="checkbox" data-a="check" data-p="' + ps + '" value="' + esc(o[0]) + '"' + (sel.indexOf(o[0]) !== -1 ? ' checked' : '') + '>' + esc(o[1]) + '</label>';
          }).join('') + '</div>' + hint(d) + '</fieldset>';
      case 'objects':
        var objs = Array.isArray(v) ? v : [];
        return '<div class="field">' + lab(d) + hint(d) + '<div class="list-rows">' + objs.map(function (o, i) {
          var p2 = path.concat([i]);
          return '<div class="obj"><div class="obj-head"><b>' + esc(d.title(o, i)) + '</b><span class="actions">' +
            (i > 0 ? '<button type="button" class="btn sm icon" data-a="row-up" data-p="' + ps + '" data-i="' + i + '" aria-label="Đưa lên">↑</button>' : '') +
            '<button type="button" class="btn sm danger" data-a="row-del" data-p="' + ps + '" data-i="' + i + '">Xóa</button></span></div>' +
            d.fields.map(function (sf) { return wrap(sf, p2.concat([sf.k])); }).join('') + '</div>';
        }).join('') + '<div><button type="button" class="btn sm" data-a="obj-add" data-p="' + ps + '" data-x="' + d.k + '">' + icon('plus') + esc(d.add) + '</button></div></div></div>';
      case 'markdown':
        var prev = S.ui.mdPreview;
        return '<div class="field">' + lab(d) + '<div class="md-tools" role="toolbar" aria-label="Định dạng">' +
          [['**', '**', 'B', 'In đậm'], ['_', '_', 'I', 'In nghiêng'], ['\n## ', '', 'H2', 'Tiêu đề lớn'], ['\n### ', '', 'H3', 'Tiêu đề nhỏ'], ['\n- ', '', '• Ds', 'Danh sách chấm'], ['\n1. ', '', '1. Ds', 'Danh sách số'], ['\n> ', '', '❝', 'Trích dẫn']].map(function (b) {
            return '<button type="button" data-a="md" data-p="' + ps + '" data-b="' + esc(b[0]) + '" data-e="' + esc(b[1]) + '" title="' + b[3] + '" aria-label="' + b[3] + '"' + (prev ? ' disabled' : '') + '>' + esc(b[2]) + '</button>';
          }).join('') +
          '<button type="button" data-a="md-link" data-p="' + ps + '" title="Chèn liên kết"' + (prev ? ' disabled' : '') + '>Link</button>' +
          '<button type="button" data-a="upload" data-p="' + ps + '" data-m="md" title="Chèn ảnh"' + (prev ? ' disabled' : '') + '>+ Ảnh</button>' +
          '<button type="button" data-a="md-preview" aria-pressed="' + prev + '" style="margin-left:auto">' + (prev ? 'Quay lại soạn' : 'Xem trước') + '</button></div>' +
          (prev ? '<div class="md-preview">' + mdHTML(v) + '</div>' : '<textarea class="ta tall" id="' + id + '" data-p="' + ps + '" data-t="text" aria-label="' + esc(d.label) + '">' + esc(v) + '</textarea>') +
          hint(d) + '</div>';
    }
    return '';
  }
  function wrap(d, path) { return d.row ? '<div class="grid2">' + d.row.map(function (x) { return F(x, path.slice(0, -1).concat([x.k])); }).join('') + '</div>' : F(d, path); }
  function isNewUpload(v) { var p = String(v || '').replace(/^\//, ''); return !!(S.uploads[p] && !S.uploads[p].published); }
  function mdHTML(src) {
    var raw = String(src || '').replace(/\]\((\/[^)\s]+)\)/g, function (m, p) { return '](' + imgSrc(p) + ')'; });
    var html = window.marked ? window.marked.parse(raw) : esc(raw).replace(/\n/g, '<br>');
    return window.DOMPurify ? window.DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i }) : esc(raw);
  }
  function mdInsert(ps, before, after) {
    var ta = document.querySelector('textarea[data-p="' + ps + '"]'), path = P(ps), v = String(getP(path) || '');
    var s = ta ? ta.selectionStart : v.length, e = ta ? ta.selectionEnd : v.length;
    var nv = v.slice(0, s) + before + v.slice(s, e) + after + v.slice(e);
    setP(path, nv);
    render(true);
    var t2 = document.querySelector('textarea[data-p="' + ps + '"]');
    if (t2) { t2.focus(); var c = s + before.length + (e - s); t2.setSelectionRange(c, c); }
  }

  /* ===================== Màn hình sửa ===================== */
  var TYPE_OPTS = [['set', 'Set đồ liền'], ['ao', 'Áo'], ['vay', 'Chân váy']];
  function defaultType(p) { return p.slug === 'ev09-chan-vay-summer' ? 'vay' : (p.slug === 'ev08-ao-polo-croptop-summer' ? 'ao' : 'set'); }
  function productOpts() { return arr('products').map(function (p) { return [p.slug, (p.id ? p.id + ' – ' : '') + (p.shortName || p.slug)]; }); }
  function productImages(path) {
    var p = getP(path.slice(0, 3)); return (p && p.images) || [];
  }
  var SCHEMA = {
    products: {
      title: function (x) { return x.shortName || 'Sản phẩm mới'; },
      crumb: ['san-pham', 'Sản phẩm'],
      view: function (x) { return '/san-pham/chi-tiet.html?slug=' + encodeURIComponent(x.slug || ''); },
      main: [
        { card: 'Thông tin cơ bản', fields: [
          { row: [{ k: 'id', t: 'text', label: 'Mã sản phẩm', req: true, ph: 'VD: EV10' }, { k: 'type', t: 'select', label: 'Loại', options: function () { return TYPE_OPTS; }, value: function (path) { var p = getP(path.slice(0, 3)); return p.type || defaultType(p); }, hint: 'Dùng cho nút lọc Set / Áo / Váy trên trang Sản phẩm.' }] },
          { k: 'shortName', t: 'text', label: 'Tên ngắn', req: true, hint: 'Hiện trên thẻ sản phẩm và ô tìm kiếm.' },
          { k: 'name', t: 'textarea', label: 'Tên đầy đủ', rows: 2, hint: 'Tiêu đề ở trang chi tiết sản phẩm.' },
          { row: [{ k: 'price', t: 'money', label: 'Giá bán', req: true }, { k: 'collectionSlug', t: 'select', x: 'collection', label: 'Thuộc bộ sưu tập', options: function () { return [['', '— Không thuộc bộ sưu tập —']].concat(arr('collections').map(function (c) { return [c.slug, c.name]; })); } }] },
          { k: 'description', t: 'textarea', label: 'Mô tả sản phẩm', rows: 4 },
          { k: 'material', t: 'textarea', label: 'Chất liệu', rows: 3, hint: 'VD: "75% Nylon | 25% Spandex. Mô tả thêm…"' },
          { k: 'style', t: 'textarea', label: 'Phong cách', rows: 3 }
        ] },
        { card: 'Điểm nổi bật', fields: [{ k: 'features', t: 'lines', label: 'Mỗi dòng là một ý', add: 'Thêm điểm nổi bật' }] },
        { card: 'Ảnh theo màu', note: 'Khi khách bấm chọn màu trên web, ảnh sẽ đổi theo danh sách dưới đây. Màu nào để trống thì dùng ảnh chung.', custom: 'colorImages' }
      ],
      side: [
        { card: 'Ảnh sản phẩm', fields: [{ k: 'images', t: 'images', label: 'Ảnh đầu tiên là ảnh đại diện', mainFirst: true, hint: 'Ảnh lớn sẽ tự được thu nhỏ còn tối đa 1800px khi tải lên.' }] },
        { card: 'Màu & size', fields: [
          { k: 'colors', t: 'chips', label: 'Màu sắc', swatch: true, ph: 'VD: Xanh Mint' },
          { k: 'sizes', t: 'sizes', label: 'Size đang bán', hint: 'Bấm để bật/tắt.' }
        ] },
        { card: 'Nhãn & bán hàng', fields: [
          { k: 'label', t: 'select', x: 'label', label: 'Nhãn hiển thị trên ảnh', options: function () { return [['', 'Không có nhãn'], ['NEW', 'NEW – Hàng mới'], ['BESTSELLER', 'BESTSELLER – Bán chạy'], ['SIGNATURE', 'SIGNATURE']]; } },
          { k: 'tiktokLink', t: 'url', label: 'Link sản phẩm trên TikTok Shop', ph: 'https://shop.tiktok.com/vn/pdp/…', hint: 'Dán link của đúng sản phẩm này (dạng shop.tiktok.com/vn/pdp/…), không dán link trang shop. Mọi nút "Mua" trên trang sản phẩm sẽ mở link này, web tự gắn mã UTM để đo lượt bấm.' },
          { k: 'suitableFor', t: 'chips', label: 'Phù hợp cho', ph: 'VD: Tennis' },
          { k: 'slug', t: 'text', label: 'Đường dẫn (slug)', ro: true, hint: 'Tự tạo, không đổi được để giữ link cũ hoạt động.' }
        ] }
      ]
    },
    collections: {
      title: function (x) { return x.name || 'Bộ sưu tập mới'; },
      crumb: ['bo-suu-tap', 'Bộ sưu tập'],
      view: function (x) { return '/bo-suu-tap/chi-tiet.html?slug=' + encodeURIComponent(x.slug || ''); },
      main: [
        { card: 'Thông tin chung', fields: [
          { row: [{ k: 'name', t: 'text', label: 'Tên bộ sưu tập', req: true, ph: 'VD: EVODA SUMMER SET' }, { k: 'code', t: 'text', label: 'Mã', ph: 'VD: BST07 - EV10' }] },
          { k: 'shortDescription', t: 'textarea', label: 'Mô tả ngắn', rows: 3, hint: 'Hiện ở trang danh sách bộ sưu tập.' },
          { k: 'intro', t: 'textarea', label: 'Giới thiệu', rows: 5 },
          { k: 'material', t: 'textarea', label: 'Chất liệu', rows: 4, hint: 'Mỗi ý một câu, kết thúc bằng dấu chấm, web sẽ tách thành từng dòng.' }
        ] },
        { card: 'Thiết kế trong bộ sưu tập', fields: [{ k: 'pieces', t: 'objects', label: 'Mỗi thiết kế hiện thành một khối ảnh + nội dung', add: 'Thêm thiết kế', title: function (o, i) { return (i + 1) + '. ' + (o.name || 'Thiết kế mới'); }, fields: [
          { k: 'name', t: 'text', label: 'Tên thiết kế' },
          { k: 'desc', t: 'textarea', label: 'Mô tả', rows: 3 },
          { k: 'features', t: 'lines', label: 'Điểm nổi bật', add: 'Thêm điểm' },
          { row: [{ k: 'image', t: 'image', label: 'Ảnh minh họa' }, { k: 'productSlug', t: 'select', label: 'Sản phẩm liên kết', options: function () { return [['', '— Không liên kết —']].concat(productOpts()); } }] }
        ] }] },
        { card: 'Màu sắc', fields: [{ k: 'colors', t: 'objects', label: 'Tên màu và mô tả ngắn', add: 'Thêm màu', title: function (o, i) { return o.name || ('Màu ' + (i + 1)); }, fields: [
          { row: [{ k: 'name', t: 'text', label: 'Tên màu' }, { k: 'desc', t: 'text', label: 'Mô tả' }] }
        ] }] }
      ],
      side: [
        { card: 'Ảnh đại diện', fields: [
          { k: 'poster', t: 'image', label: 'Ảnh poster (ảnh đứng, trang danh sách)' },
          { k: 'banner', t: 'image', label: 'Ảnh banner (ảnh ngang, đầu trang chi tiết)' }
        ] },
        { card: 'Thư viện ảnh', fields: [{ k: 'gallery', t: 'images', label: 'Ảnh hiện ở cuối trang bộ sưu tập' }] },
        { card: 'Sản phẩm & hoạt động', fields: [
          { k: 'productSlugs', t: 'checks', label: 'Sản phẩm thuộc bộ sưu tập', options: productOpts },
          { k: 'suitableFor', t: 'chips', label: 'Phù hợp cho', ph: 'VD: Pickleball' },
          { k: 'slug', t: 'text', label: 'Đường dẫn (slug)', ro: true, hint: 'Tự tạo từ tên khi thêm mới.' }
        ] }
      ]
    },
    news: {
      title: function (x) { return x.title || 'Bài viết mới'; },
      crumb: ['tin-tuc', 'Tin tức'],
      view: function (x) { return '/tin-tuc/bai-viet.html?slug=' + encodeURIComponent(x.slug || ''); },
      main: [
        { card: 'Nội dung bài viết', fields: [
          { k: 'title', t: 'text', label: 'Tiêu đề', req: true },
          { k: 'excerpt', t: 'textarea', label: 'Mô tả ngắn', rows: 3, hint: 'Hiện ở trang danh sách tin tức và khi chia sẻ link.' },
          { k: 'body', t: 'markdown', label: 'Nội dung', hint: 'Bôi đen chữ rồi bấm nút để định dạng. "+ Ảnh" để chèn ảnh vào giữa bài. Dòng trống để tách đoạn.' }
        ] }
      ],
      side: [
        { card: 'Đăng bài', fields: [
          { k: 'date', t: 'date', label: 'Ngày đăng', req: true },
          { k: 'image', t: 'image', label: 'Ảnh đại diện' },
          { k: 'slug', t: 'text', label: 'Đường dẫn (slug)', ro: true, hint: 'Tự tạo từ tiêu đề khi viết bài mới.' }
        ] }
      ]
    }
  };
  var SECTION_OF = { products: 'san-pham', collections: 'bo-suu-tap', news: 'tin-tuc' };

  function colorImagesBlock(i) {
    var p = arr('products')[i], ci = Array.isArray(p.colorImages) ? p.colorImages : [];
    if (!(p.colors || []).length) return '<p class="muted" style="margin:0">Thêm màu ở mục "Màu & size" trước.</p>';
    return (p.colors || []).map(function (c) {
      var idx = -1; ci.forEach(function (x, j) { if (x.color === c) idx = j; });
      if (idx === -1) return '<div class="obj"><div class="obj-head"><b>' + esc(c) + '</b><button type="button" class="btn sm" data-a="ci-add" data-i="' + i + '" data-v="' + esc(c) + '">' + icon('plus') + 'Gán ảnh cho màu này</button></div></div>';
      return '<div class="obj">' + F({ t: 'images', label: c, pickFrom: function () { return p.images || []; } }, ['products', 'products', i, 'colorImages', idx, 'images']) + '</div>';
    }).join('');
  }
  function card(c, key, i) {
    var path = [key, CFG.files[key].root, i];
    var inner = c.custom === 'colorImages' ? colorImagesBlock(i) : c.fields.map(function (d) { return wrap(d, path.concat([d.k || '_'])); }).join('');
    return '<section class="card card-pad form"><h2 class="h">' + esc(c.card) + '</h2>' + (c.note ? '<p class="hint" style="margin:-8px 0 0">' + esc(c.note) + '</p>' : '') + inner + '</section>';
  }
  function viewEdit(key, id) {
    if (id === 'moi') { var ni = createItem(key); location.replace('#/' + SECTION_OF[key] + '/' + ni); return null; }
    var i = Number(id), list = arr(key), item = list[i], sc = SCHEMA[key];
    if (!item) return '<div class="empty card">Không tìm thấy mục này. <a href="#/' + SECTION_OF[key] + '" style="font-weight:600">Quay lại danh sách</a></div>';
    var isNew = S.newItems.has(item);
    return '<div class="page-head"><div><div class="crumb"><a href="#/' + sc.crumb[0] + '">← ' + sc.crumb[1] + '</a>' + (isNew ? ' · <span class="badge pending">Mới, chưa xuất bản</span>' : '') + '</div>' +
      '<h1 class="title">' + esc(sc.title(item)) + '</h1></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      (isNew ? '' : '<a class="btn" href="' + esc(sc.view(item)) + '" target="_blank" rel="noopener">' + icon('eye') + 'Xem trên web</a>') +
      '<button type="button" class="btn danger" data-a="del-item" data-k="' + key + '" data-i="' + i + '">' + icon('trash') + 'Xóa</button>' +
      '<button type="button" class="btn dark" data-a="publish">' + icon('upload') + 'Xuất bản lên web</button></div></div>' +
      '<div class="cols"><div class="col-main">' + sc.main.map(function (c) { return card(c, key, i); }).join('') + '</div>' +
      '<div class="col-side">' + sc.side.map(function (c) { return card(c, key, i); }).join('') + '</div></div>';
  }

  /* ===================== Người đăng ký ===================== */
  function loadSubs() {
    S.subsState = 'loading'; S.subsError = '';
    return fetch('/api/subscribers', { headers: { Authorization: 'Bearer ' + S.token }, cache: 'no-store' }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'bad_response' }; }).then(function (j) { j.__status = r.status; return j; });
    }).then(function (j) {
      if (j.ok && Array.isArray(j.rows)) { S.subs = { rows: j.rows.slice().reverse(), sheetUrl: j.sheetUrl || '' }; S.subsState = 'ok'; }
      else if (j.error === 'not_configured' || j.__status === 404 || j.__status === 501) { S.subs = null; S.subsState = 'off'; }
      else { S.subs = null; S.subsState = 'error'; S.subsError = j.error || ('Lỗi ' + j.__status); }
    }).catch(function (e) { S.subs = null; S.subsState = 'error'; S.subsError = e.message; })
      .then(function () {
        if (!S.user || !S.files.products) return;
        var r = route()[0];
        if (r === 'nguoi-dang-ky' || r === 'tong-quan') { render(true); return; }
        var side = document.querySelector('.side');
        if (side) side.outerHTML = sidebar(r);
      });
  }
  function fmtTime(t) { var d = new Date(t); return isNaN(d) ? esc(t) : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  var PAGE_NAMES = { '/': 'Trang chủ', '/index.html': 'Trang chủ', '/san-pham/': 'Sản phẩm', '/san-pham/chi-tiet.html': 'Chi tiết sản phẩm', '/san-pham/chi-tiet': 'Chi tiết sản phẩm', '/bo-suu-tap/': 'Bộ sưu tập', '/bo-suu-tap/chi-tiet.html': 'Chi tiết bộ sưu tập', '/bo-suu-tap/chi-tiet': 'Chi tiết bộ sưu tập', '/tin-tuc/': 'Tin tức', '/tin-tuc/bai-viet.html': 'Bài viết', '/tin-tuc/bai-viet': 'Bài viết', '/ve-chung-toi/': 'Về chúng tôi', '/huong-dan-chon-size/': 'Hướng dẫn chọn size', '/chinh-sach-doi-tra/': 'Chính sách đổi trả', '/qa/': 'Hỏi đáp' };
  function pageName(p) { return PAGE_NAMES[p] || p || '—'; }
  function viewSubs() {
    var head = '<div class="page-head"><div><div class="eyebrow">Khách hàng</div><h1 class="title">Người đăng ký nhận tin</h1></div><div style="display:flex;gap:10px;flex-wrap:wrap">' +
      (S.subs && S.subs.sheetUrl ? '<a class="btn" href="' + esc(S.subs.sheetUrl) + '" target="_blank" rel="noopener">' + icon('sheet') + 'Mở Google Sheet</a>' : '') +
      (S.subs ? '<button type="button" class="btn" data-a="copy-emails">Sao chép tất cả email</button><button type="button" class="btn dark" data-a="csv">' + icon('down') + 'Tải danh sách (CSV)</button>' : '') +
      '</div></div>';
    if (S.subsState === 'loading' || S.subsState === 'idle') return head + '<div class="card empty"><div class="spinner" style="margin:0 auto 10px"></div>Đang tải danh sách từ Google Sheet…</div>';
    if (S.subsState === 'off') return head + '<div class="note warn">' + icon('info') + '<div><b>Chưa kết nối danh sách email.</b><br>Email khách đăng ký vẫn đang được lưu vào Google Sheet "EVODA - Dang ky nhan tin". Để xem ngay tại đây, cần bật thêm 2 bước trong hướng dẫn: đặt khóa <code>ADMIN_KEY</code> trong Apps Script và biến <code>SHEET_API_KEY</code> trên Cloudflare.</div></div>';
    if (S.subsState === 'error') return head + '<div class="note warn">' + icon('info') + '<div><b>Không tải được danh sách.</b> (' + esc(S.subsError) + ')<br>Kiểm tra khóa ADMIN_KEY trong Apps Script có trùng với SHEET_API_KEY trên Cloudflare không, rồi bấm Thử lại.<div style="margin-top:10px"><button type="button" class="btn sm" data-a="subs-reload">Thử lại</button></div></div></div>';
    var rows = S.subs.rows, now = Date.now(), d7 = rows.filter(function (r) { return now - new Date(r.time).getTime() < 7 * 864e5; }).length;
    var today = new Date().toDateString(), d1 = rows.filter(function (r) { return new Date(r.time).toDateString() === today; }).length;
    var byPage = {}; rows.forEach(function (r) { var n = pageName(r.page); byPage[n] = (byPage[n] || 0) + 1; });
    var top = Object.keys(byPage).sort(function (a, b) { return byPage[b] - byPage[a]; })[0] || '—';
    var q = (S.ui.subQuery || '').toLowerCase().trim();
    var list = rows.filter(function (r) { return !q || String(r.email).toLowerCase().indexOf(q) !== -1; });
    function stat(l, n) { return '<div class="card stat"><div class="lbl">' + esc(l) + '</div><div class="num"' + (typeof n === 'string' && n.length > 6 ? ' style="font-size:26px;line-height:1.2"' : '') + '>' + esc(n) + '</div></div>'; }
    return head + '<section class="stats">' + stat('Tổng số email', rows.length) + stat('7 ngày qua', d7) + stat('Hôm nay', d1) + stat('Đăng ký nhiều nhất từ', top) + '</section>' +
      '<section class="card"><div class="card-head">' + searchBox('subQuery', 'Tìm email…') + '<button type="button" class="btn sm" data-a="subs-reload">Làm mới</button></div><div class="table-wrap"><table class="t"><thead><tr><th scope="col">Email</th><th scope="col">Thời gian đăng ký</th><th scope="col">Đăng ký từ trang</th><th scope="col">Thao tác</th></tr></thead><tbody>' +
      (list.map(function (r) {
        return '<tr><td style="font-weight:600">' + esc(r.email) + '</td><td class="muted">' + fmtTime(r.time) + '</td><td><span class="badge">' + esc(pageName(r.page)) + '</span></td>' +
          '<td><button type="button" class="btn sm" data-a="copy" data-v="' + esc(r.email) + '">Sao chép</button></td></tr>';
      }).join('') || '<tr><td colspan="4" class="empty">' + (rows.length ? 'Không có email phù hợp.' : 'Chưa có ai đăng ký.') + '</td></tr>') +
      '</tbody></table></div></section>' +
      '<div class="note">' + icon('info') + '<span>Muốn gửi email hàng loạt: bấm <b>Tải danh sách (CSV)</b> rồi nhập vào Mailchimp hoặc Brevo. Muốn xóa một email, xóa dòng đó trong Google Sheet.</span></div>';
  }
  function copyText(t) {
    var done = function () { toast('Đã sao chép.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
    else { fallbackCopy(t); done(); }
  }
  function fallbackCopy(t) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); }
  function downloadCSV() {
    var lines = [['Email', 'Thời gian đăng ký', 'Trang đăng ký']].concat(S.subs.rows.map(function (r) { return [r.email, fmtTime(r.time), pageName(r.page)]; }));
    var csv = '\ufeff' + lines.map(function (l) { return l.map(function (c) { var s = String(c == null ? '' : c); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'evoda-dang-ky-nhan-tin-' + todayISO() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ===================== Sự kiện ===================== */
  function afterEdit(path) {
    var key = path[0], item = getP(path.slice(0, 3));
    if (item && path.length >= 4 && (path[3] === 'id' || path[3] === 'shortName' || path[3] === 'name' || path[3] === 'title')) {
      autoSlug(key, item);
      var slugEl = document.querySelector('input[data-p="' + path.slice(0, 3).join('|') + '|slug"]'); if (slugEl) slugEl.value = item.slug;
    }
    refreshPubbar();
  }
  app.addEventListener('input', function (e) {
    var el = e.target, q = el.getAttribute('data-q');
    if (q) {
      S.ui[q] = el.value;
      var pos = el.selectionStart; render(true);
      var again = document.querySelector('input[data-q="' + q + '"]'); if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (x) { } }
      return;
    }
    var ps = el.getAttribute('data-p'), t = el.getAttribute('data-t');
    if (!ps || !t || el.type === 'checkbox') return;
    var path = P(ps);
    if (t === 'text') setP(path, el.value);
    else if (t === 'money') { var n = Number(String(el.value).replace(/[^\d]/g, '')); setP(path, isFinite(n) ? n : 0); }
    else if (t === 'date') {
      setP(path, el.value);
      var it = getP(path.slice(0, 3)); if (it && 'displayDate' in it) it.displayDate = isoToDisplay(el.value);
    }
    afterEdit(path);
  });
  app.addEventListener('change', function (e) {
    var el = e.target, ps = el.getAttribute('data-p');
    if (!ps) return;
    var path = P(ps);
    if (el.getAttribute('data-t') === 'money') { var v = getP(path); el.value = typeof v === 'number' ? v.toLocaleString('vi-VN') : ''; return; }
    if (el.getAttribute('data-t') === 'select') {
      setP(path, el.value);
      var it = getP(path.slice(0, 3)), x = el.getAttribute('data-x');
      if (x === 'label' && it) { it.isNew = el.value === 'NEW'; it.isBestseller = el.value === 'BESTSELLER'; }
      if (x === 'collection' && it) { var c = arr('collections').filter(function (cc) { return cc.slug === el.value; })[0]; it.collection = c ? collectionLabel(c.name) : ''; }
      afterEdit(path); return;
    }
    if (el.getAttribute('data-a') === 'check') {
      var list = getP(path); if (!Array.isArray(list)) { list = []; setP(path, list); }
      var k = list.indexOf(el.value);
      if (el.checked && k === -1) list.push(el.value); if (!el.checked && k !== -1) list.splice(k, 1);
      afterEdit(path);
    }
  });
  app.addEventListener('keydown', function (e) {
    var el = e.target, ps = el.getAttribute && el.getAttribute('data-chip');
    if (ps && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); addChip(ps, el.value); }
  });
  function addChip(ps, raw) {
    var path = P(ps), list = getP(path); if (!Array.isArray(list)) { list = []; setP(path, list); }
    String(raw || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { if (list.indexOf(s) === -1) list.push(s); });
    render(true);
    var inp = document.querySelector('input[data-chip="' + ps + '"]'); if (inp) inp.focus();
  }
  function move(list, i, j) { if (j < 0 || j >= list.length) return; var x = list.splice(i, 1)[0]; list.splice(j, 0, x); }
  var OBJ_TEMPLATES = { pieces: function () { return { name: '', desc: '', features: [], image: '', productSlug: '' }; }, colors: function () { return { name: '', desc: '' }; } };

  app.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-a]');
    if (!btn || btn.disabled) return;
    var a = btn.getAttribute('data-a'), ps = btn.getAttribute('data-p'), path = ps ? P(ps) : null;
    var i = btn.hasAttribute('data-i') ? Number(btn.getAttribute('data-i')) : null, v = btn.getAttribute('data-v');
    switch (a) {
      case 'login': startLogin(); return;
      case 'logout':
        if (changeCount() && !window.confirm('Bạn còn thay đổi chưa xuất bản. Vẫn đăng xuất?')) return;
        logout(''); location.hash = ''; return;
      case 'publish': publish(); return;
      case 'discard': discardAll(); return;
      case 'pf': S.ui.prodFilter = v; render(true); return;
      case 'subs-reload': S.subs = null; render(true); loadSubs(); return;
      case 'copy': copyText(v); return;
      case 'copy-emails': copyText(S.subs.rows.map(function (r) { return r.email; }).join(', ')); return;
      case 'csv': downloadCSV(); return;
      case 'check': return;
      case 'del-item':
        var key = btn.getAttribute('data-k'), list = arr(key), it = list[i];
        var nm = it ? (it.shortName || it.name || it.title || 'mục này') : 'mục này';
        if (!window.confirm('Xóa "' + nm + '"?\nThay đổi chỉ áp dụng lên web sau khi bấm Xuất bản.')) return;
        list.splice(i, 1);
        if (route()[1]) location.hash = '#/' + SECTION_OF[key]; else render(true);
        toast('Đã xóa. Bấm Xuất bản để áp dụng lên web.');
        return;
      case 'chip-del':
        var removed = getP(path).splice(i, 1)[0];
        if (path[0] === 'products' && path[3] === 'colors') {
          var prod0 = getP(path.slice(0, 3));
          if (prod0 && Array.isArray(prod0.colorImages)) prod0.colorImages = prod0.colorImages.filter(function (x) { return x.color !== removed; });
        }
        render(true); return;
      case 'chip-add': var inp = document.querySelector('input[data-chip="' + ps + '"]'); addChip(ps, inp ? inp.value : ''); return;
      case 'size':
        var sz = getP(path); if (!Array.isArray(sz)) { sz = []; setP(path, sz); }
        var k = sz.indexOf(v); if (k === -1) sz.push(v); else sz.splice(k, 1);
        var order = ['XS', 'S', 'M', 'L', 'XL', 'XXL']; sz.sort(function (x, y) { return (order.indexOf(x) + 1 || 99) - (order.indexOf(y) + 1 || 99); });
        render(true); return;
      case 'row-add': var rl = getP(path); if (!Array.isArray(rl)) { rl = []; setP(path, rl); } rl.push(''); render(true);
        var tas = document.querySelectorAll('textarea[data-p^="' + ps + '|"]'); if (tas.length) tas[tas.length - 1].focus(); return;
      case 'row-del': getP(path).splice(i, 1); render(true); return;
      case 'row-up': move(getP(path), i, i - 1); render(true); return;
      case 'obj-add': var ol = getP(path); if (!Array.isArray(ol)) { ol = []; setP(path, ol); } ol.push(OBJ_TEMPLATES[btn.getAttribute('data-x')]()); render(true); return;
      case 'upload': openPicker({ path: path, mode: btn.getAttribute('data-m') }); return;
      case 'img-clear': setP(path, ''); render(true); return;
      case 'img-del': getP(path).splice(i, 1); render(true); return;
      case 'img-left': move(getP(path), i, i - 1); render(true); return;
      case 'picker': S.ui.picker = S.ui.picker === ps ? null : ps; render(true); return;
      case 'pick': var pl = getP(path), pk = pl.indexOf(v); if (pk === -1) pl.push(v); else pl.splice(pk, 1); render(true); return;
      case 'ci-add': var prod = arr('products')[i]; if (!Array.isArray(prod.colorImages)) prod.colorImages = []; prod.colorImages.push({ color: v, images: [] });
        S.ui.picker = ['products', 'products', i, 'colorImages', prod.colorImages.length - 1, 'images'].join('|'); render(true); return;
      case 'md': mdInsert(ps, btn.getAttribute('data-b'), btn.getAttribute('data-e')); return;
      case 'md-link':
        var url = window.prompt('Dán đường link (VD: https://shop.tiktok.com/…):', 'https://');
        if (url && /^https?:\/\/|^\//.test(url)) mdInsert(ps, '[', '](' + url + ')'); return;
      case 'md-preview': S.ui.mdPreview = !S.ui.mdPreview; render(true); return;
    }
  });
  /* ===================== Khởi động ===================== */
  var saved = load(TOKEN_KEY);
  if (saved) { S.token = saved; boot(); } else renderLogin('');
})();
