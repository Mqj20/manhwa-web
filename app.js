/* ==========================================================
   1. محرك المصادقة
   ========================================================== */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function getUsersDB() { return JSON.parse(localStorage.getItem('mh_users')) || {}; }
function saveUser(u, p) { const db = getUsersDB(); db[u] = { password: p, favorites: [], joined: Date.now() }; localStorage.setItem('mh_users', JSON.stringify(db)); }
function getCurrentUser() {
    const s = JSON.parse(localStorage.getItem('mh_session'));
    if (!s) return null;
    if (Date.now() - s.ts > 7 * 24 * 60 * 60 * 1000) { localStorage.removeItem('mh_session'); return null; }
    return s.u;
}
function login(u, p) {
    const db = getUsersDB();
    if (db[u] && db[u].password === p) { localStorage.setItem('mh_session', JSON.stringify({ u, ts: Date.now() })); return true; }
    return false;
}
function logout() { localStorage.removeItem('mh_session'); updateUI(); }

/* ==========================================================
   2. المفضلة
   ========================================================== */
function toggleFavorite(id) {
    const user = getCurrentUser();
    if (!user) { openModal(); return; }
    const db = getUsersDB();
    const favs = db[user].favorites;
    const idx = favs.indexOf(id);
    if (idx > -1) favs.splice(idx, 1); else favs.push(id);
    localStorage.setItem('mh_users', JSON.stringify(db));
    renderManhwa(currentFilteredList);
    alert(idx > -1 ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة ❤️');
}
function isFavorite(id) {
    const user = getCurrentUser();
    if (!user) return false;
    return (getUsersDB()[user]?.favorites || []).includes(id);
}

/* ==========================================================
   3. بيانات احتياطية (تظهر فوراً في حال تأخر أو فشل جلب JSON)
   ========================================================== */
const fallbackManhwa = [
    { id: 1, title: "Solo Leveling", title_ar: "التسليح المنفرد", cover: "https://picsum.photos/seed/solo/300/420", summary: "قصة صياد ضعيف يحصل على نظام يرفع مستواه.", status: "completed", genres: ["أكشن", "فانتازيا"], latest_chapter: 201, rating: 9.1 },
    { id: 2, title: "Tower of God", title_ar: "برج الله", cover: "https://picsum.photos/seed/tower/300/420", summary: "بام يتسلق برجاً غامضاً بحثاً عن فتاته.", status: "ongoing", genres: ["أكشن", "مغامرة"], latest_chapter: 620, rating: 8.7 },
    { id: 3, title: "TBATE", title_ar: "البداية بعد النهاية", cover: "https://picsum.photos/seed/tbate/300/420", summary: "ملك يُعاد ولادته في عالم سحري.", status: "ongoing", genres: ["فانتازيا", "مغامرة"], latest_chapter: 170, rating: 8.8 },
    { id: 4, title: "Nano Machine", title_ar: "الآلة النانوية", cover: "https://picsum.photos/seed/nano/300/420", summary: "بطل يُعاد إحياؤه بتقنية نانوية.", status: "ongoing", genres: ["أكشن", "خيال علمي"], latest_chapter: 250, rating: 8.8 }
];

/* ==========================================================
   4. الحالة العامة
   ========================================================== */
let manhwaData = [...fallbackManhwa];
let currentFilteredList = [...fallbackManhwa];
let activeCategory = "الكل";

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/* ==========================================================
   5. جلب البيانات الآمن من JSON
   ========================================================== */
async function fetchManhwaData() {
    try {
        const response = await fetch('./manhwa.json?v=' + Date.now());
        if (!response.ok) throw new Error('HTTP status ' + response.status);
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.manhwa || []);
        
        if (list.length > 0) {
            manhwaData = list.map(m => {
                const linkUrl = m.url || m.link || '';
                let imgCover = m.cover || '';
                if (imgCover.startsWith('//')) imgCover = 'https:' + imgCover;
                
                return {
                    id: m.id || hashCode(linkUrl || m.title || String(Math.random())),
                    title: m.title || 'بدون عنوان',
                    title_ar: m.title_ar || m.title || 'بدون عنوان',
                    cover: imgCover,
                    summary: m.summary || 'لا يوجد وصف متاح.',
                    status: m.status || 'ongoing',
                    genres: Array.isArray(m.genres) && m.genres.length > 0 ? m.genres : ['مانهوا'],
                    latest_chapter: m.latest_chapter || 1,
                    rating: m.rating || 8.5,
                    url: linkUrl
                };
            });
            console.log('✅ تم جلب ' + manhwaData.length + ' مانهوا بنجاح');
        }
    } catch (e) {
        console.warn('⚠️ متعذر تحميل manhwa.json:', e.message, '- عرض البيانات الافتراضية.');
    }
    currentFilteredList = [...manhwaData];
    renderTrending();
    renderCategories();
    renderManhwa(currentFilteredList);
}

/* ==========================================================
   6. دوال العرض والبطاقات
   ========================================================== */
function getStatusLabel(s) {
    return { ongoing: 'مستمر', completed: 'مكتمل', dropped: 'متوقف' }[s] || 'مستمر';
}
function renderStars(rating) {
    const full = Math.round((rating || 0) / 2);
    return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
}
function placeholderImg(title) {
    return 'https://via.placeholder.com/300x420/1a1a2e/6c5ce7?text=' + encodeURIComponent((title || 'Manhwa').substring(0, 20));
}

function renderTrending() {
    const scroll = document.getElementById('trendingScroll');
    if (!scroll) return;
    const trending = [...manhwaData].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12);
    scroll.innerHTML = trending.map(m => `
        <div class="trending-card" onclick="openDetails(${m.id})">
            <img src="${m.cover || placeholderImg(m.title_ar)}" alt="${m.title_ar}" loading="lazy"
                 onerror="this.onerror=null;this.src='${placeholderImg(m.title_ar)}'">
            <div class="trending-info">
                <h4>${m.title_ar}</h4>
                <span>⭐ ${m.rating}</span>
            </div>
        </div>
    `).join('');
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    const allGenres = new Set();
    manhwaData.forEach(m => (m.genres || []).forEach(g => allGenres.add(g)));
    const categories = ["الكل", ...Array.from(allGenres).sort()];
    grid.innerHTML = categories.map(c => `
        <button class="category-chip ${c === activeCategory ? 'active' : ''}" onclick="filterByCategory('${c.replace(/'/g, "\\'")}')">${c}</button>
    `).join('');
}

function renderManhwa(list) {
    currentFilteredList = list;
    const grid = document.getElementById('manhwaGrid');
    if (!grid) return;
    if (!list || list.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">لا توجد نتائج مطابقة.</p>';
        return;
    }
    grid.innerHTML = list.map(m => `
        <div class="manhwa-card" onclick="openDetails(${m.id})">
            <div class="card-status-bar ${m.status}"></div>
            <div class="status-badge status-${m.status}">${getStatusLabel(m.status)}</div>
            <img src="${m.cover || placeholderImg(m.title_ar)}" alt="${m.title_ar}" loading="lazy"
                 onerror="this.onerror=null;this.src='${placeholderImg(m.title_ar)}'">
            <div class="card-body">
                <h3>${m.title_ar}</h3>
                <div class="card-meta">
                    <span>📖 ${m.latest_chapter}</span>
                    <span>⭐ ${m.rating}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function filterByCategory(cat) {
    activeCategory = cat;
    currentFilteredList = cat === "الكل" ? manhwaData : manhwaData.filter(m => (m.genres || []).includes(cat));
    renderCategories();
    renderManhwa(currentFilteredList);
}

function searchManhwa() {
    const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    if (!q) { renderManhwa(manhwaData); return; }
    const filtered = manhwaData.filter(m =>
        (m.title_ar || '').toLowerCase().includes(q) ||
        (m.title || '').toLowerCase().includes(q)
    );
    renderManhwa(filtered);
}

/* ==========================================================
   7. نافذة التفاصيل والفتح
   ========================================================== */
let currentDetailsId = null;

function openDetails(id) {
    const m = manhwaData.find(x => x.id === id);
    if (!m) return;

    if (m.url && m.url.startsWith('http')) {
        window.open(m.url, '_blank');
        return;
    }

    currentDetailsId = id;
    const coverEl = document.getElementById('detailsCover');
    if (coverEl) {
        coverEl.src = m.cover || placeholderImg(m.title_ar);
        coverEl.onerror = function() { this.onerror = null; this.src = placeholderImg(m.title_ar); };
    }

    const tEl = document.getElementById('detailsTitle');
    if (tEl) tEl.textContent = m.title_ar;
    
    const sEl = document.getElementById('detailsSummary');
    if (sEl) sEl.textContent = m.summary || 'لا يوجد وصف.';

    const modal = document.getElementById('detailsModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeDetails() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentDetailsId = null;
}

/* ==========================================================
   8. إدارة الواجهة والمصادقة
   ========================================================== */
function updateUI() {
    const user = getCurrentUser();
    const area = document.getElementById('userArea');
    if (!area) return;
    if (user) {
        area.innerHTML = `<div class="user-badge"><span>👤 ${user}</span><button class="logout-btn" onclick="logout()">خروج</button></div>`;
    } else {
        area.innerHTML = `<button id="loginBtn" class="btn-outline" onclick="openModal()">تسجيل الدخول</button>`;
    }
}
function openModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('hidden');
}
function closeModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
}

/* ==========================================================
   9. بدء التشغيل
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. عرض الواجهة فوراً
    renderTrending();
    renderCategories();
    renderManhwa(manhwaData);
    updateUI();

    // 2. جلب ملف JSON المحدث
    fetchManhwaData();

    // 3. أحداث البحث والوضع الليلي
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    if (searchBtn) searchBtn.addEventListener('click', searchManhwa);
    if (searchInput) searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') searchManhwa(); });

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('light-mode', !isDark);
            themeBtn.textContent = isDark ? '☀️' : '🌙';
        });
    }
});
