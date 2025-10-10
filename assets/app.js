// Cybersecurity News Hub - modern client app
// Features: search, filter by source, sort, bookmarks (localStorage), share, trending, PWA-ready

const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  allItems: [],
  visibleItems: [],
  page: 0,
  pageSize: 18,
  filters: new Set(),
  search: '',
  sort: 'newest',
  bookmarks: new Set(JSON.parse(localStorage.getItem('csnh-bookmarks') || '[]')),
};

const CORS_PROXIES = [
  url => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const FEEDS = [
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'Bleeping Computer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
  { name: 'Threatpost', url: 'https://threatpost.com/feed/' },
];

function setTheme(next) {
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('csnh-theme', next);
  el('#themeToggle').textContent = next === 'dark' ? '🌙' : '☀️';
}

function initThemeToggle() {
  const btn = el('#themeToggle');
  btn.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(curr === 'dark' ? 'light' : 'dark');
  });
}

function saveBookmarks() {
  localStorage.setItem('csnh-bookmarks', JSON.stringify([...state.bookmarks]));
}

function isBookmarked(link) { return state.bookmarks.has(link); }

async function fetchFeed(feed) {
  let lastError;
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(feed.url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (/^\s*<!doctype|<html/i.test(text)) throw new Error('HTML returned');
      const xml = new DOMParser().parseFromString(text, 'application/xml');
      if (xml.querySelector('parsererror')) throw new Error('Invalid XML');
      const items = [];
      xml.querySelectorAll('item, entry').forEach(node => {
        const title = node.querySelector('title')?.textContent?.trim() || 'Untitled';
        const link = node.querySelector('link')?.textContent || node.querySelector('link[href]')?.getAttribute('href') || '#';
        const pubDateStr = node.querySelector('pubDate')?.textContent || node.querySelector('published')?.textContent || node.querySelector('updated')?.textContent;
        const descriptionNode = node.querySelector('description, content, summary');
        const cats = [...node.querySelectorAll('category')].map(c => c.textContent.trim()).filter(Boolean);
        const temp = document.createElement('div');
        temp.innerHTML = descriptionNode?.textContent || '';
        temp.querySelectorAll('script, style').forEach(e => e.remove());
        const textOnly = temp.textContent || '';
        const MAX = 320;
        const clipped = textOnly.length > MAX ? textOnly.slice(0, MAX).replace(/\s+\S*$/, '') + '…' : textOnly;
        items.push({
          id: link,
          title,
          link,
          pubDate: pubDateStr ? new Date(pubDateStr) : new Date(0),
          description: clipped,
          source: feed.name,
          tags: cats,
        });
      });
      return items;
    } catch (e) { lastError = e; }
  }
  console.error('Feed error', feed.name, lastError);
  toast(`Could not load ${feed.name}`);
  return [];
}

function buildSourceFilters() {
  const container = el('#sourceFilters');
  container.innerHTML = '';
  FEEDS.forEach(feed => {
    const pill = document.createElement('button');
    pill.className = 'pill';
    pill.textContent = feed.name;
    pill.setAttribute('data-source', feed.name);
    pill.addEventListener('click', () => {
      if (state.filters.has(feed.name)) state.filters.delete(feed.name); else state.filters.add(feed.name);
      pill.classList.toggle('active');
      applyAndRender();
    });
    container.appendChild(pill);
  });
}

function buildSkeletons(n = 9) {
  const sk = el('#skeletonLoader');
  sk.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 's';
    sk.appendChild(d);
  }
}

function card(item) {
  const a = document.createElement('article');
  a.className = 'card';
  a.innerHTML = `
    <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
    <div class="meta"><span>${escapeHtml(item.source)}</span><span>•</span><span>${formatDate(item.pubDate)}</span></div>
    <div class="desc">${escapeHtml(item.description)}</div>
    <div class="row">
      <div class="tags"></div>
      <div class="actions">
        <button class="btn icon bookmark" title="Bookmark" aria-label="Bookmark">${isBookmarked(item.link) ? '★' : '☆'}</button>
        <a class="btn" href="${item.link}" target="_blank" rel="noopener noreferrer">Read</a>
        <button class="btn ghost icon share" title="Share" aria-label="Share">↗</button>
      </div>
    </div>
  `;
  const tagsEl = el('.tags', a);
  (item.tags || []).slice(0, 3).forEach(t => {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = t;
    tagsEl.appendChild(b);
  });
  el('.bookmark', a).addEventListener('click', () => {
    if (isBookmarked(item.link)) state.bookmarks.delete(item.link); else state.bookmarks.add(item.link);
    saveBookmarks();
    applyAndRender();
    renderBookmarks();
  });
  el('.share', a).addEventListener('click', async () => shareItem(item));
  return a;
}

function renderList(container, items) {
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  items.forEach(it => frag.appendChild(card(it)));
  container.appendChild(frag);
}

function computeTrending(items) {
  // naive trending: by frequency of key terms in titles
  const counts = new Map();
  const stop = new Set(['the','a','an','and','or','of','on','in','to','for','with','by','from','is','are','as','at','be','this','that','it']);
  items.forEach(i => i.title.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).forEach(w => {
    if (w && !stop.has(w) && w.length > 2) counts.set(w, (counts.get(w)||0)+1);
  }));
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([_w,c], idx) => ({ label: _w, rank: idx+1, score: c }));
}

function renderTrending() {
  const trends = computeTrending(state.allItems);
  const container = el('#trendContainer');
  container.innerHTML = '';
  trends.forEach(t => {
    const d = document.createElement('div');
    d.className = 'trend';
    d.innerHTML = `<span class="rank">#${t.rank}</span><span class="label">${escapeHtml(t.label)}</span><span class="badge">${t.score}</span>`;
    d.addEventListener('click', () => {
      el('#searchInput').value = t.label;
      state.search = t.label;
      applyAndRender();
    });
    container.appendChild(d);
  });
}

function applyFilters(items) {
  return items.filter(i => state.filters.size === 0 || state.filters.has(i.source));
}

function applySearch(items) {
  const q = state.search.trim().toLowerCase();
  if (!q) return items;
  return items.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.description.toLowerCase().includes(q) ||
    i.source.toLowerCase().includes(q)
  );
}

function applySort(items) {
  const copy = [...items];
  if (state.sort === 'newest') copy.sort((a,b)=>b.pubDate-a.pubDate);
  else if (state.sort === 'oldest') copy.sort((a,b)=>a.pubDate-b.pubDate);
  else if (state.sort === 'source') copy.sort((a,b)=>a.source.localeCompare(b.source)|| (b.pubDate-a.pubDate));
  return copy;
}

function paginate(items) {
  const end = (state.page+1)*state.pageSize;
  return items.slice(0, end);
}

function applyAndRender() {
  const container = el('#news-container');
  const sk = el('#skeletonLoader');
  sk.innerHTML = '';
  let items = applyFilters(state.allItems);
  items = applySearch(items);
  items = applySort(items);
  state.visibleItems = paginate(items);
  renderList(container, state.visibleItems);
  el('#loadMoreBtn').hidden = state.visibleItems.length >= items.length;
}

function renderBookmarks() {
  const section = el('#bookmarksSection');
  const c = el('#bookmarksContainer');
  const bm = state.allItems.filter(it => state.bookmarks.has(it.link));
  if (!location.hash.includes('bookmarks')) { section.hidden = true; return; }
  section.hidden = false;
  if (bm.length === 0) {
    c.className = 'card-grid-empty';
    c.innerHTML = 'No bookmarks yet. Click ☆ on any article to save it here.';
  } else {
    c.className = 'card-grid';
    renderList(c, bm);
  }
}

async function shareItem(item) {
  const data = { title: item.title, text: item.title, url: item.link };
  try {
    if (navigator.share) await navigator.share(data);
    else {
      await navigator.clipboard.writeText(item.link);
      toast('Link copied to clipboard');
    }
  } catch (_) {}
}

function formatDate(d) { try {return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})} catch { return ''; } }
function escapeHtml(s) { return (s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

let toastTimer;
function toast(msg) {
  let t = el('#toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--panel);border:1px solid var(--border);padding:.6rem 1rem;border-radius:.6rem;box-shadow:var(--shadow);z-index:50;'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.style.opacity='0'; }, 2200);
}

function initControls() {
  el('#currentYear').textContent = new Date().getFullYear();
  el('#searchInput').addEventListener('input', e => { state.search = e.target.value; state.page = 0; applyAndRender(); });
  el('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; applyAndRender(); });
  el('#loadMoreBtn').addEventListener('click', () => { state.page++; applyAndRender(); });
  window.addEventListener('hashchange', renderBookmarks);
}

async function loadAll() {
  buildSkeletons(9);
  buildSourceFilters();
  initThemeToggle();
  initControls();
  const results = await Promise.all(FEEDS.map(fetchFeed));
  state.allItems = results.flat();
  renderTrending();
  state.page = 0;
  applyAndRender();
  renderBookmarks();
}

loadAll();

