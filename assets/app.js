// Cybersecurity News Hub - modern client app
// Features: search, filter by source, sort, bookmarks (localStorage), share, trending, PWA-ready

const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// --------- i18n ---------
const I18N = {
  en: {
    app: { title: 'Cybersecurity News Hub', subtitle: 'Your daily digest of cyber threats and intelligence' },
    nav: { bookmarks: 'Bookmarks' },
    tools: { search_placeholder: 'Search headlines, descriptions, sources...', sort_newest: 'Newest first', sort_oldest: 'Oldest first', sort_source: 'Source A-Z' },
    sections: { brief: 'Daily Brief', trending: 'Trending Now', latest: 'Latest Articles', bookmarks: 'Your Bookmarks' },
    buttons: { copy_brief: 'Copy Brief', regenerate: 'Regenerate', load_more: 'Load more', read: 'Read', bookmark: 'Bookmark', share: 'Share' },
    chip: { threat: 'Threat', defense: 'Defense', intel: 'Intel' },
    footer: { attribution: 'Aggregated from various RSS feeds. Content belongs to respective owners.', proxy: 'Uses public CORS proxies to fetch RSS feeds in the browser.' }
  },
  es: {
    app: { title: 'Centro de Noticias de Ciberseguridad', subtitle: 'Tu resumen diario de amenazas e inteligencia' },
    nav: { bookmarks: 'Marcadores' },
    tools: { search_placeholder: 'Buscar titulares, descripciones, fuentes…', sort_newest: 'Más recientes', sort_oldest: 'Más antiguos', sort_source: 'Fuente A-Z' },
    sections: { brief: 'Informe Diario', trending: 'Tendencias', latest: 'Artículos Recientes', bookmarks: 'Tus Marcadores' },
    buttons: { copy_brief: 'Copiar informe', regenerate: 'Regenerar', load_more: 'Cargar más', read: 'Leer', bookmark: 'Guardar', share: 'Compartir' },
    chip: { threat: 'Amenaza', defense: 'Defensa', intel: 'Inteligencia' },
    footer: { attribution: 'Agregado de varios RSS. El contenido pertenece a sus propietarios.', proxy: 'Usa proxies CORS públicos para obtener RSS en el navegador.' }
  },
  fr: {
    app: { title: 'Hub des Actualités Cybersécurité', subtitle: 'Votre synthèse quotidienne des menaces et renseignements' },
    nav: { bookmarks: 'Favoris' },
    tools: { search_placeholder: 'Rechercher titres, descriptions, sources…', sort_newest: 'Plus récents', sort_oldest: 'Plus anciens', sort_source: 'Source A-Z' },
    sections: { brief: 'Brief Quotidien', trending: 'Tendance', latest: 'Derniers Articles', bookmarks: 'Vos Favoris' },
    buttons: { copy_brief: 'Copier le brief', regenerate: 'Régénérer', load_more: 'Voir plus', read: 'Lire', bookmark: 'Enregistrer', share: 'Partager' },
    chip: { threat: 'Menace', defense: 'Défense', intel: 'Renseignement' },
    footer: { attribution: 'Agrégé de divers flux RSS. Contenu appartenant à leurs propriétaires.', proxy: 'Utilise des proxys CORS publics pour récupérer les flux RSS.' }
  },
  de: {
    app: { title: 'Cybersecurity News Hub', subtitle: 'Ihr täglicher Überblick zu Bedrohungen und Intelligence' },
    nav: { bookmarks: 'Lesezeichen' },
    tools: { search_placeholder: 'Suche in Titeln, Beschreibungen, Quellen…', sort_newest: 'Neueste zuerst', sort_oldest: 'Älteste zuerst', sort_source: 'Quelle A-Z' },
    sections: { brief: 'Tagesbriefing', trending: 'Im Trend', latest: 'Neueste Artikel', bookmarks: 'Ihre Lesezeichen' },
    buttons: { copy_brief: 'Brief kopieren', regenerate: 'Neu erstellen', load_more: 'Mehr laden', read: 'Lesen', bookmark: 'Speichern', share: 'Teilen' },
    chip: { threat: 'Bedrohung', defense: 'Abwehr', intel: 'Intel' },
    footer: { attribution: 'Aggregiert aus verschiedenen RSS-Feeds. Inhalte gehören den Eigentümern.', proxy: 'Verwendet öffentliche CORS-Proxys, um RSS im Browser abzurufen.' }
  },
  ar: {
    app: { title: 'مركز أخبار الأمن السيبراني', subtitle: 'ملخصك اليومي للتهديدات والاستخبارات' },
    nav: { bookmarks: 'المحفوظات' },
    tools: { search_placeholder: 'ابحث في العناوين والأوصاف والمصادر…', sort_newest: 'الأحدث أولاً', sort_oldest: 'الأقدم أولاً', sort_source: 'المصدر A-Z' },
    sections: { brief: 'الموجز اليومي', trending: 'الرائج الآن', latest: 'أحدث المقالات', bookmarks: 'محفوظاتك' },
    buttons: { copy_brief: 'نسخ الموجز', regenerate: 'إعادة توليد', load_more: 'تحميل المزيد', read: 'قراءة', bookmark: 'حفظ', share: 'مشاركة' },
    chip: { threat: 'تهديد', defense: 'دفاع', intel: 'استخبارات' },
    footer: { attribution: 'تم التجميع من خلاصات RSS مختلفة. المحتوى يعود لمالكيه.', proxy: 'يستخدم بروكسيات CORS عامة لجلب الخلاصات في المتصفح.' }
  }
};

const SUPPORTED_LOCALES = Object.keys(I18N);
let currentLocale = 'en';

function t(path) {
  const parts = path.split('.');
  let node = I18N[currentLocale] || I18N.en;
  for (const p of parts) { node = node?.[p]; if (!node) break; }
  return node || I18N.en?.[parts[0]]?.[parts[1]] || path;
}

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
  // existing
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'Bleeping Computer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
  { name: 'Threatpost', url: 'https://threatpost.com/feed/' },

  // reputable, commonly available RSS
  { name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/' },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml' },
  { name: 'Ars Technica Security', url: 'https://feeds.arstechnica.com/arstechnica/security' },
  { name: 'Microsoft Security Blog', url: 'https://www.microsoft.com/en-us/security/blog/feed/' },
  { name: 'Unit 42 (Palo Alto)', url: 'https://unit42.paloaltonetworks.com/feed/' },
  { name: 'Cisco Talos', url: 'https://blog.talosintelligence.com/feeds/posts/default?alt=rss' },
  { name: 'Rapid7 Blog', url: 'https://www.rapid7.com/blog/rss/' },
  { name: 'CrowdStrike Blog', url: 'https://www.crowdstrike.com/blog/feed/' },
  { name: 'Google Project Zero', url: 'https://googleprojectzero.blogspot.com/feeds/posts/default?alt=rss' },
  { name: 'SANS ISC Diary', url: 'https://isc.sans.edu/rssfeed.xml' },
  { name: 'GitHub Security Blog', url: 'https://github.blog/category/security/feed/' },

  // government advisories (availability may vary by region/CORS)
  { name: 'CISA Current Activity', url: 'https://www.cisa.gov/sites/default/files/feeds/current_activity.xml' },
  { name: 'CISA Alerts', url: 'https://www.cisa.gov/sites/default/files/feeds/alerts.xml' },
];

const CLASSIFY = {
  threat: [/hack/i, /breach/i, /ransom/i, /ransomware/i, /exploit/i, /malware/i, /ddos/i, /phishing/i, /attack/i, /compromis/i, /exfiltrat/i, /zero-?day/i, /botnet/i, /data leak/i],
  defense: [/mitigat/i, /patch/i, /update/i, /secure/i, /defen[cs]e/i, /blue team/i, /detect/i, /edr/i, /mfa/i, /hardening/i, /enforc/i, /encrypt/i],
  intel: [/advisory/i, /cve/i, /vulnerab/i, /research/i, /intel/i, /report/i, /bulletin/i, /proof[- ]of[- ]concept/i, /poc/i]
};

function classifyItemText(text) {
  const t = text.toLowerCase();
  for (const [label, rules] of Object.entries(CLASSIFY)) {
    if (rules.some(r => r.test(t))) return label; // first match wins (threat>defense>intel due to key order)
  }
  return 'intel';
}

function setTheme(next) {
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('csnh-theme', next);
  el('#themeToggle').textContent = next === 'dark' ? '🌙' : '☀️';
}

function initThemeToggle() {
  const btn = el('#themeToggle');
  btn.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(curr === 'dark' ? 'light' : 'dark');
  });
  // ensure icon reflects current theme on load
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current);
}

function setLanguage(lang) {
  currentLocale = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  localStorage.setItem('csnh-lang', currentLocale);
  document.documentElement.lang = currentLocale;
  document.documentElement.dir = currentLocale === 'ar' ? 'rtl' : 'ltr';
  const langSelect = el('#langSelect');
  if (langSelect) langSelect.value = currentLocale;
  translateUI();
  applyAndRender();
  renderBookmarks();
  renderBrief(state.allItems);
}

function translateUI() {
  const title = el('#title'); if (title) title.textContent = t('app.title');
  const subtitle = el('#subtitle'); if (subtitle) subtitle.textContent = t('app.subtitle');
  const bookmarksNav = el('#bookmarksNav'); if (bookmarksNav) bookmarksNav.textContent = t('nav.bookmarks');
  const search = el('#searchInput'); if (search) search.placeholder = t('tools.search_placeholder');
  const sort = el('#sortSelect');
  if (sort) {
    sort.innerHTML = '';
    const opts = [ ['newest', t('tools.sort_newest')], ['oldest', t('tools.sort_oldest')], ['source', t('tools.sort_source')] ];
    for (const [val, label] of opts) { const o = document.createElement('option'); o.value = val; o.textContent = label; sort.appendChild(o); }
    sort.value = state.sort;
  }
  const briefTitle = el('#briefTitle'); if (briefTitle) briefTitle.textContent = t('sections.brief');
  const highlightsTitle = el('#highlightsTitle'); if (highlightsTitle) highlightsTitle.textContent = t('sections.trending');
  const latestTitle = el('#latestTitle'); if (latestTitle) latestTitle.textContent = t('sections.latest');
  const bookmarksTitle = el('#bookmarksTitle'); if (bookmarksTitle) bookmarksTitle.textContent = t('sections.bookmarks');
  const copyBriefBtn = el('#copyBriefBtn'); if (copyBriefBtn) copyBriefBtn.textContent = t('buttons.copy_brief');
  const regenBriefBtn = el('#regenBriefBtn'); if (regenBriefBtn) regenBriefBtn.textContent = t('buttons.regenerate');
  const loadMoreBtn = el('#loadMoreBtn'); if (loadMoreBtn) loadMoreBtn.textContent = t('buttons.load_more');
  const f1 = el('#footerAttribution'); if (f1) f1.textContent = t('footer.attribution');
  const f2 = el('#footerProxy'); if (f2) f2.textContent = t('footer.proxy');
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
        const context = classifyItemText(`${title} ${textOnly} ${cats.join(' ')}`);
        items.push({
          id: link,
          title,
          link,
          pubDate: pubDateStr ? new Date(pubDateStr) : new Date(0),
          description: clipped,
          source: feed.name,
          tags: cats,
          context,
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
  const ctx = item.context || 'intel';
  a.className = `card card--${ctx}`;
  a.innerHTML = `
    <h3><a href="${item.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
    <div class="meta">
      <span class="chip ${ctx}">${ctx === 'threat' ? t('chip.threat') : ctx === 'defense' ? t('chip.defense') : t('chip.intel')}</span>
      <span>${escapeHtml(item.source)}</span><span>•</span><span>${formatDate(item.pubDate)}</span>
    </div>
    <div class="desc">${escapeHtml(item.description)}</div>
    <div class="row">
      <div class="tags"></div>
      <div class="actions">
        <button class="btn icon bookmark" title="${t('buttons.bookmark')}" aria-label="${t('buttons.bookmark')}">${isBookmarked(item.link) ? '★' : '☆'}</button>
        <a class="btn" href="${item.link}" target="_blank" rel="noopener noreferrer">${t('buttons.read')}</a>
        <button class="btn ghost icon share" title="${t('buttons.share')}" aria-label="${t('buttons.share')}">↗</button>
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

function formatDate(d) { try {return new Intl.DateTimeFormat(currentLocale, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);} catch { return ''; } }
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
  el('#regenBriefBtn').addEventListener('click', () => renderBrief(state.allItems));
  el('#copyBriefBtn').addEventListener('click', () => copyBrief());
  const detected = (localStorage.getItem('csnh-lang') || navigator.language || 'en').slice(0,2).toLowerCase();
  setLanguage(SUPPORTED_LOCALES.includes(detected) ? detected : 'en');
  const sel = el('#langSelect');
  if (sel) sel.addEventListener('change', e => setLanguage(e.target.value));
}

async function loadAll() {
  buildSkeletons(9);
  buildSourceFilters();
  initThemeToggle();
  initControls();
  // Embed mode for easy placement
  const isEmbed = new URLSearchParams(location.search).get('embed') === '1';
  if (isEmbed) { document.body.classList.add('embed'); state.pageSize = 6; }
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const kevItems = await fetchKEV();
  state.allItems = results.flat().concat(kevItems);
  renderTrending();
  state.page = 0;
  applyAndRender();
  renderBookmarks();
  renderBrief(state.allItems);
}

loadAll();

// --------- Daily Brief generation ----------
function renderBrief(all) {
  const elC = el('#briefContent');
  if (!elC) return;
  const date = new Date();
  const items = applySort(applySearch(applyFilters(all)));
  const byCtx = (ctx, n) => items.filter(i=>i.context===ctx).slice(0,n);
  const topThreat = byCtx('threat', 6);
  const topDefense = byCtx('defense', 5);
  const topIntel = byCtx('intel', 5);
  const trends = computeTrending(items).slice(0,6);
  const sourceCounts = [...items.reduce((m,i)=>m.set(i.source,(m.get(i.source)||0)+1), new Map()).entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);

  const section = (title, arr) => arr.length ? `<h3>${title}</h3><ul>` + arr.map(i=>`<li><a href="${i.link}" target="_blank" rel="noopener">${escapeHtml(i.title)}</a> <span class="badge">${escapeHtml(i.source)}</span></li>`).join('') + `</ul>` : '';

  elC.innerHTML = `
    <h3>Cybersecurity Daily Brief — ${date.toLocaleDateString(undefined, {year:'numeric', month:'long', day:'numeric'})}</h3>
    <p>A concise roundup of notable incidents, defensive updates, and vulnerability intelligence from trusted sources.</p>
    ${section('Major Incidents & Threat Activity', topThreat)}
    ${section('Defensive Updates & Guidance', topDefense)}
    ${section('Vulnerability & Research Intel', topIntel)}
    <h3>Key Trends</h3>
    <p>${trends.map(t=>`<span class="badge">#${escapeHtml(t.label)}</span>`).join(' ') || '—'}</p>
    <h3>Top Sources Today</h3>
    <ul>${sourceCounts.map(([s,c])=>`<li>${escapeHtml(s)} — ${c}</li>`).join('')}</ul>
  `;
  el('#copyBriefBtn').disabled = items.length === 0;
}

function copyBrief() {
  const elC = el('#briefContent');
  if (!elC) return;
  const text = elC.innerText || elC.textContent || '';
  navigator.clipboard.writeText(text).then(()=> toast('Daily brief copied')).catch(()=>toast('Copy failed'));
}

// --------- KEV integration (CISA Known Exploited Vulnerabilities) ----------
async function fetchJsonThroughProxies(url) {
  let lastError;
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      // Some proxies may not set JSON headers; parse manually
      return JSON.parse(txt);
    } catch (e) { lastError = e; }
  }
  console.error('KEV JSON fetch failed', lastError);
  return null;
}

async function fetchKEV() {
  const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
  const data = await fetchJsonThroughProxies(url);
  if (!data || !Array.isArray(data.vulnerabilities)) return [];
  // Map KEV entries to items
  const items = data.vulnerabilities.slice(0, 150).map(v => {
    const cve = v.cveID || v.cveId || '';
    const titleBits = [cve, v.vulnerabilityName, v.vendorProject, v.product].filter(Boolean).join(' — ');
    const link = cve ? `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve)}` : 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';
    const desc = v.shortDescription || v.description || '';
    const dateStr = v.dateAdded || v.published ? (v.dateAdded || v.published) : undefined;
    const due = v.dueDate ? ` Mitigation due: ${v.dueDate}.` : '';
    const required = v.requiredAction ? ` Required action: ${v.requiredAction}.` : '';
    const summary = `${desc}${required}${due}`.trim();
    return {
      id: link,
      title: titleBits || (cve ? `${cve}` : 'Known Exploited Vulnerability'),
      link,
      pubDate: dateStr ? new Date(dateStr) : new Date(0),
      description: summary,
      source: 'CISA KEV',
      tags: ['CVE', 'KEV'].concat(v.vendorProject ? [v.vendorProject] : []),
      context: 'threat',
    };
  });
  return items;
}
