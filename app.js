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
    return getUsersDB()[user].favorites.includes(id);
}

/* ==========================================================
   3. بيانات احتياطية (تظهر فوراً حتى قبل جلب JSON)
   ========================================================== */
const fallbackManhwa = [
    { id: 1, title: "Solo Leveling", title_ar: "التسليح المنفرد", cover: "https://picsum.photos/seed/solo/300/420", summary: "قصة صياد ضعيف يحصل على نظام يرفع مستواه.", status: "completed", genres: ["أكشن", "فانتازيا"], latest_chapter: 201, rating: 9.1 },
    { id: 2, title: "Tower of God", title_ar: "برج الله", cover: "https://picsum.photos/seed/tower/300/420", summary: "بام يتسلق برجاً غامضاً بحثاً عن فتاته.", status: "ongoing", genres: ["أكشن", "مغامرة"], latest_chapter: 620, rating: 8.7 },
    { id: 3, title: "TBATE", title_ar: "البداية بعد النهاية", cover: "https://picsum.photos/seed/tbate/300/420", summary: "ملك يُعاد ولادته في عالم سحري.", status: "ongoing", genres: ["فانتازيا", "مغامرة"], latest_chapter: 170, rating: 8.8 },
    { id: 4, title: "Nano Machine", title_ar: "الآلة النانوية", cover: "https://picsum.photos/seed/nano/300/420", summary: "بطل يُعاد إحياؤه بتقنية نانوية.", status: "ongoing", genres: ["أكشن", "خيال علمي"], latest_chapter: 250, rating: 8.8 },
    { id: 5, title: "Eleceed", title_ar: "إليسيد", cover: "https://picsum.photos/seed/eleceed/300/420", summary: "فتى يخفي سراً وقط سمين غريب.", status: "ongoing", genres: ["أكشن", "كوميدي"], latest_chapter: 280, rating: 8.9 },
    { id: 6, title: "Lookism", title_ar: "الشكلية", cover: "https://picsum.photos/seed/lookism/300/420", summary: "شاب يملك جسدين مختلفين.", status: "ongoing", genres: ["دراما", "مدرسي"], latest_chapter: 480, rating: 8.5 },
    { id: 7, title: "Omniscient Reader", title_ar: "القارئ العليم", cover: "https://picsum.photos/seed/orv/300/420", summary: "قارئ رواية يجد نفسه داخلها.", status: "ongoing", genres: ["أكشن", "نفسي"], latest_chapter: 190, rating: 9.0 },
    { id: 8, title: "Martial Peak", title_ar: "قمة الفنون القتالية", cover: "https://picsum.photos/seed/mp/300/420", summary: "يانغ كاي وصعوده في عالم الفنون القتالية.", status: "ongoing", genres: ["أكشن", "فنون قتالية"], latest_chapter: 3862, rating: 8.4 },
    { id: 9, title: "Shadow Slave", title_ar: "عبد الظل", cover: "https://picsum.photos/seed/ss/300/420", summary: "ساني ينجو من كابوس ويحصل على قوى.", status: "ongoing", genres: ["أكشن", "غموض"], latest_chapter: 5, rating: 8.2 },
    { id: 10, title: "Demonic Emperor", title_ar: "الإمبراطور الشيطاني", cover: "https://picsum.photos/seed/de/300/420", summary: "إمبراطور سحر يُعاد ولادته بعد خيانة.", status: "ongoing", genres: ["أكشن", "فنون قتالية"], latest_chapter: 899, rating: 8.9 },
    { id: 11, title: "Tales of Demons and Gods", title_ar: "حكايات الشياطين والآلهة", cover: "https://picsum.photos/seed/tdg/300/420", summary: "نيي لي يعود بالزمن لإنقاذ مدينته.", status: "ongoing", genres: ["فنتازيا", "أكشن"], latest_chapter: 527, rating: 8.7 },
    { id: 12, title: "Wind Breaker", title_ar: "كاسر الرياح", cover: "https://picsum.photos/seed/wb/300/420", summary: "عالم سباق الدراجات في كوريا.", status: "ongoing", genres: ["رياضة", "دراما"], latest_chapter: 480, rating: 8.3 }
];

/* ==========================================================
   4. الحالة العامة
   ========================================================== */
let manhwaData = [...fallbackManhwa];
let currentFilteredList = [...fallbackManhwa];
let activeCategory = "الكل";

/* ==========================================================
   5. جلب البيانات من JSON
   ========================================================== */
async function fetchManhwaData() {
    try {
        const response = await fetch('manhwa.json?v=' + Date.now());
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const list = data.manhwa || data || [];
        if (Array.isArray(list) && list.length > 0) {
            // ضمان وجود الحقول المطلوبة
            manhwaData = list.map(m => ({
                id: m.id || Math.abs(hashCode(m.url || m.title || '')),
                title: m.title || 'بدون عنوان',
                title_ar: m.title_ar || m.title || 'بدون عنوان',
                cover: m.cover || '',
                summary: m.summary || 'لا يوجد وصف متاح.',
                status: m.status || 'ongoing',
                genres: Array.isArray(m.genres) ? m.genres : [],
                latest_chapter: m.latest_chapter || 0,
                rating: m.rating || 8.0,
                url: m.url || ''
            }));
            console.log('✅ تم جلب ' + manhwaData.length + ' مانهوا');
        } else {
            console.warn('⚠️ JSON فارغ، استخدام البيانات الاحتياطية');
        }
    } catch (e) {
        console.warn('⚠️ فشل جلب JSON:', e.message, '- استخدام البيانات الاحتياطية');
    }
    currentFilteredList = [...manhwaData];
    renderTrending();
    renderCategories();
    renderManhwa(currentFilteredList);
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/* ==========================================================
   6. دوال العرض
   ========================================================== */
function getStatusLabel(s) {
    return { ongoing: 'مستمر', completed: 'مكتمل', dropped: 'متوقف' }[s] || s;
}
function renderStars(rating) {
    const full = Math.round((rating || 0) / 2);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
}
function placeholderImg(title) {
    return 'https://via.placeholder.com/300x420/1a1a2e/6c5ce7?text=' + encodeURIComponent((title || 'Manhwa').substring(0, 20));
}

function renderTrending() {
    const scroll = document.getElementById('trendingScroll');
    if (!scroll) return;
    const trending = [...manhwaData].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12);
    if (trending.length === 0) {
        scroll.innerHTML = '<p style="color:var(--text-muted);padding:20px;">لا توجد عناوين.</p>';
        return;
    }
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
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!q) { renderManhwa(manhwaData); return; }
    const filtered = manhwaData.filter(m =>
        (m.title_ar || '').toLowerCase().includes(q) ||
        (m.title || '').toLowerCase().includes(q)
    );
    renderManhwa(filtered);
}

/* ==========================================================
   7. نافذة التفاصيل
   ========================================================== */
let currentDetailsId = null;

function openDetails(id) {
    const m = manhwaData.find(x => x.id === id);
    if (!m) return;
    currentDetailsId = id;

    const coverEl = document.getElementById('detailsCover');
    coverEl.src = m.cover || placeholderImg(m.title_ar);
    coverEl.onerror = function() { this.onerror = null; this.src = placeholderImg(m.title_ar); };

    document.getElementById('detailsTitle').textContent = m.title_ar;
    document.getElementById('detailsSummary').textContent = m.summary || 'لا يوجد وصف.';
    document.getElementById('detailsMeta').innerHTML = `
        <span class="status-tag ${m.status}">${getStatusLabel(m.status)}</span>
        <span>📖 ${m.latest_chapter} فصل</span>
    `;
    document.getElementById('detailsRating').innerHTML = `${renderStars(m.rating)} <span>${m.rating} / 10</span>`;
    document.getElementById('detailsGenres').innerHTML = (m.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');

    const favBtn = document.getElementById('favBtn');
    if (isFavorite(id)) {
        favBtn.classList.add('active');
        favBtn.innerHTML = '❤️ في المفضلة';
    } else {
        favBtn.classList.remove('active');
        favBtn.innerHTML = '🤍 أضف للمفضلة';
    }

    document.getElementById('detailsModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDetails() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentDetailsId = null;
}

/* ==========================================================
   8. الواجهة والمصادقة
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
    const form = document.getElementById('authForm');
    if (form) form.reset();
}

let isRegisterMode = false;
function toggleAuthMode(e) {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    const t = document.getElementById('modalTitle'), s = document.getElementById('modalSubtitle');
    const tl = document.getElementById('toggleText'), a = document.getElementById('toggleAuthMode'), b = document.getElementById('submitAuth');
    if (isRegisterMode) { t.textContent = "إنشاء حساب جديد"; s.textContent = "انضم وابدأ القراءة"; tl.textContent = "لديك حساب؟"; a.textContent = "تسجيل الدخول"; b.textContent = "إنشاء الحساب"; }
    else { t.textContent = "مرحباً بك مجدداً"; s.textContent = "سجل دخولك للوصول إلى مكتبتك"; tl.textContent = "ليس لديك حساب؟"; a.textContent = "أنشئ حساباً"; b.textContent = "دخول"; }
}

/* ==========================================================
   9. التهيئة
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // عرض البيانات الاحتياطية فوراً
    renderTrending();
    renderCategories();
    renderManhwa(manhwaData);
    updateUI();

    // ثم محاولة جلب JSON
    fetchManhwaData();

    // البحث
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    if (searchBtn) searchBtn.addEventListener('click', searchManhwa);
    if (searchInput) searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') searchManhwa(); });

    // الوضع الليلي
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        const savedTheme = localStorage.getItem('mh_theme');
        if (savedTheme === 'dark') { document.body.classList.replace('light-mode', 'dark-mode'); themeBtn.textContent = '☀️'; }
        themeBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('light-mode', !isDark);
            themeBtn.textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('mh_theme', isDark ? 'dark' : 'light');
        });
    }

    // المصادقة
    const closeModalBtn = document.getElementById('closeModal');
    const authModal = document.getElementById('authModal');
    const toggleAuthLink = document.getElementById('toggleAuthMode');
    const authForm = document.getElementById('authForm');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (authModal) authModal.addEventListener('click', e => { if (e.target.id === 'authModal') closeModal(); });
    if (toggleAuthLink) toggleAuthLink.addEventListener('click', toggleAuthMode);
    if (authForm) authForm.addEventListener('submit', async e => {
        e.preventDefault();
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value;
        const btn = document.getElementById('submitAuth');
        if (p.length < 6) { alert("كلمة المرور 6 أحرف على الأقل."); return; }
        btn.textContent = "جاري المعالجة..."; btn.disabled = true;
        await new Promise(r => setTimeout(r, 600));
        const hashed = await hashPassword(p);
        if (isRegisterMode) {
            const db = getUsersDB();
            if (db[u]) { alert("اسم المستخدم موجود!"); }
            else { saveUser(u, hashed); login(u, hashed); alert("تم إنشاء الحساب 🎉"); closeModal(); updateUI(); }
        } else {
            if (login(u, hashed)) { closeModal(); updateUI(); alert(`أهلاً ${u}!`); }
            else { alert("بيانات غير صحيحة."); }
        }
        btn.textContent = isRegisterMode ? "إنشاء الحساب" : "دخول"; btn.disabled = false;
    });

    // تبديل العرض
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const grid = document.getElementById('manhwaGrid');
            if (grid) grid.classList.toggle('list-view', btn.dataset.view === 'list');
        });
    });

    // نافذة التفاصيل
    const readBtn = document.getElementById('readBtn');
    const favBtn = document.getElementById('favBtn');
    const detailsModal = document.getElementById('detailsModal');
    if (readBtn) readBtn.addEventListener('click', () => { if (currentDetailsId) location.href = 'reader.html?id=' + currentDetailsId; });
    if (favBtn) favBtn.addEventListener('click', () => {
        if (!getCurrentUser()) { closeDetails(); openModal(); return; }
        toggleFavorite(currentDetailsId);
        if (isFavorite(currentDetailsId)) { favBtn.classList.add('active'); favBtn.innerHTML = '❤️ في المفضلة'; }
        else { favBtn.classList.remove('active'); favBtn.innerHTML = '🤍 أضف للمفضلة'; }
    });
    if (detailsModal) detailsModal.addEventListener('click', e => { if (e.target.id === 'detailsModal') closeDetails(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetails(); });
});
