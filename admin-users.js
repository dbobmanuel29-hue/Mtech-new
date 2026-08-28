/* M-TECH Premium Gadget Store — Admin Users module
   Loads Firebase Authentication users through the secure Vercel API. */
(function () {
  "use strict";
  var USERS = { list: [], nextPageToken: null, total: null, loading: false };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return typeof escapeHTML === "function" ? escapeHTML(s == null ? "" : s) : String(s == null ? "" : s); };
  function fmtDate(value) { if (!value) return "—"; var d = value instanceof Date ? value : new Date(value); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  async function api(path) {
    var user = window.MTECH_CONFIG && MTECH_CONFIG.auth && MTECH_CONFIG.auth.currentUser;
    if (!user) throw Object.assign(new Error("You need to be signed in."), { status: 401 });
    var token = await user.getIdToken(false);
    var res = await fetch(path, { headers: { Authorization: "Bearer " + token } });
    var body = {}; try { body = await res.json(); } catch (_) {}
    if (!res.ok) { var e = new Error(body.message || "Request failed."); e.status = res.status; e.code = body.error; throw e; }
    return body;
  }
  function ensureUI() {
    if (!$('p-users')) {
      var main = document.querySelector('.admin-main'); if (!main) return;
      var section = document.createElement('section'); section.className = 'admin-panel'; section.id = 'p-users';
      section.innerHTML = '<div class="toolbar"><div class="search"><label class="visually-hidden" for="usr-search">Search users</label><input id="usr-search" type="search" placeholder="Search name or email…" autocomplete="off"></div><div style="display:flex;gap:8px;align-items:center"><span class="small muted" id="usr-total-label">—</span><button class="btn btn--light btn--sm" id="usr-refresh">Refresh</button></div></div><div id="usr-state"></div><div class="table-scroll card" id="usr-table-wrap" style="padding:0;overflow:hidden;display:none"><table class="adm-table"><thead><tr><th>User</th><th>Email</th><th>Status</th><th>Provider</th><th>Created</th><th>Last sign-in</th></tr></thead><tbody id="usr-tbody"></tbody></table></div><div style="text-align:center;margin-top:20px"><button class="btn btn--light btn--sm" id="usr-load-more" style="display:none">Load more</button></div>';
      main.appendChild(section);
    }
    if (!document.querySelector('.side-link[data-panel="p-users"]')) {
      var side = document.getElementById('side'); var before = side && side.querySelector('.side-link[data-panel="p-sell"]');
      if (side && before) { var group = document.createElement('p'); group.className = 'side-group'; group.textContent = 'People'; var link = document.createElement('button'); link.className = 'side-link'; link.setAttribute('data-panel','p-users'); link.innerHTML = 'Users <span class="side-count" id="c-users">0</span>'; side.insertBefore(group,before); side.insertBefore(link,before); }
    }
  }
  function state(html) { var el = $('usr-state'); if (el) el.innerHTML = html; }
  function render() {
    var q = (($('usr-search') && $('usr-search').value) || '').toLowerCase().trim();
    var rows = USERS.list.filter(function (u) { return !q || (u.name + ' ' + u.email).toLowerCase().indexOf(q) > -1; });
    if ($('usr-total-label')) $('usr-total-label').textContent = (USERS.total == null ? rows.length + ' loaded' : USERS.total + ' registered') + (q ? ' · ' + rows.length + ' matching' : '');
    if (!rows.length) { if ($('usr-table-wrap')) $('usr-table-wrap').style.display='none'; state('<div class="card" style="padding:40px;text-align:center"><span class="muted">' + (q ? 'No users match that search.' : 'No registered users yet.') + '</span></div>'); }
    else { state(''); $('usr-table-wrap').style.display='block'; $('usr-tbody').innerHTML = rows.map(function (u) { var initial=esc((u.name||u.email||'?').charAt(0).toUpperCase()); var avatar=u.photoURL?'<img class="adm-thumb" style="border-radius:50%;object-fit:cover;padding:0" src="'+esc(u.photoURL)+'" alt="">':'<span class="adm-thumb" style="border-radius:50%;display:grid;place-items:center;background:var(--ink);color:#fff;font-weight:800;padding:0">'+initial+'</span>'; return '<tr><td><div style="display:flex;align-items:center;gap:12px">'+avatar+'<div><b style="display:block">'+esc(u.name||'—')+'</b><span class="tiny muted">'+esc(u.uid)+'</span></div></div></td><td>'+esc(u.email||'—')+'<br>'+(u.emailVerified?'<span class="pill-status s-approved">verified</span>':'<span class="pill-status s-pending">unverified</span>')+'</td><td>'+(u.disabled?'<span class="pill-status s-out_of_stock">disabled</span>':'<span class="pill-status s-published">active</span>')+'</td><td class="tiny">'+esc(u.provider)+'</td><td class="tiny">'+fmtDate(u.createdAt)+'</td><td class="tiny">'+fmtDate(u.lastSignInAt)+'</td></tr>'; }).join(''); }
    if ($('usr-load-more')) $('usr-load-more').style.display = USERS.nextPageToken ? 'inline-flex' : 'none';
  }
  async function load(reset) {
    if (USERS.loading) return; USERS.loading=true; ensureUI(); if (reset) { USERS.list=[]; USERS.nextPageToken=null; }
    state('<div class="card" style="padding:26px;text-align:center"><span class="muted">Loading registered users…</span></div>');
    try { var url='/api/admin/users?limit=50'+(USERS.nextPageToken?'&pageToken='+encodeURIComponent(USERS.nextPageToken):''); var data=await api(url); USERS.list=USERS.list.concat(data.users||[]); USERS.nextPageToken=data.nextPageToken||null; USERS.total=typeof data.totalUsers==='number'?data.totalUsers:USERS.total; if($('s-users')) $('s-users').textContent=USERS.total==null?'—':USERS.total; if($('c-users')) $('c-users').textContent=USERS.total==null?'0':USERS.total; render(); }
    catch(e){ if($('usr-table-wrap')) $('usr-table-wrap').style.display='none'; if($('usr-load-more')) $('usr-load-more').style.display='none'; var title=e.status===403?'Not authorised':e.status===401?'Session expired':e.code==='server_not_configured'?'Users API not configured yet':'Could not load users'; state('<div class="card" style="padding:30px;text-align:center"><b>'+title+'</b><p class="small muted" style="margin-top:8px">'+esc(e.message)+'</p></div>'); }
    USERS.loading=false;
  }
  document.addEventListener('DOMContentLoaded', function () {
    ensureUI();
    if (window.MTECH_AUTH) MTECH_AUTH.onAuthStateChanged(function(user){ if(user && user.role==='admin') load(true); });
    document.addEventListener('input',function(e){if(e.target.id==='usr-search')render();});
    document.addEventListener('click',function(e){if(e.target.id==='usr-refresh')load(true); else if(e.target.id==='usr-load-more')load(false); else if(e.target.closest('.side-link[data-panel="p-users"]')){ensureUI();if(!USERS.list.length)load(true);}});
  });
})();
