/* ==========================================
   1. محرك المصادقة (Auth Engine)
   ========================================== */
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

/* ==========================================
   2. إدارة المفضلة
   ========================================== */
function toggleFavorite(manhwaId) {
    const user = getCurrentUser();
    if (!user) { openModal(); return; }
    const db = getUsersDB();
    const favs = db[user].favorites;
    const idx = favs.indexOf(manhwaId);
    if (idx > -1) favs.splice(idx, 1); else favs.push(manhwaId);
    localStorage.setItem('mh_users', JSON.stringify(db));
    renderManhwa(currentFilteredList);
    alert(idx > -1 ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة ❤️');
}

function isFavorite(manhwaId) {
    const user = getCurrentUser();
    if (!user) return false;
    return getUsersDB()[user].favorites.includes(manhwaId);
}

/* ==========================================
   3. البيانات والعرض
   ========================================== */
const manhwaData = [
    { id: 1, title: "Solo Leveling", image: "https://picsum.photos/seed/solo/300/420", chapter: "الفصل 180", rating: 4.9, genre: "أكشن", trending: true },
    { id: 2, title: "Tower of God", image: "https://picsum.photos/seed/tower/300/420", chapter: "الفصل 600", rating: 4.7, genre: "مغامرة", trending: true },
    { id: 3, title: "The Beginning After The End", image: "https://picsum.photos/seed/tbate/300/420", chapter: "الفصل 170", rating: 4.8, genre: "فانتازيا", trending: true },
    { id: 4, title: "Lookism", image: "https://picsum.photos/seed/lookism/300/420", chapter: "الفصل 450", rating: 4.6, genre: "دراما", trending: false },
    { id: 5, title: "Nano Machine", image: "https://picsum.photos/seed/nano/300/420", chapter: "الفصل 200", rating: 4.7, genre: "أكشن", trending: true },
    { id: 6, title: "Eleceed", image: "https://picsum.photos/seed/eleceed/300/420", chapter: "الفصل 280", rating: 4.8, genre: "أكشن", trending: false },
    { id: 7, title: "Omniscient Reader", image: "https://picsum.photos/seed/orv/300/420", chapter: "الفصل 190", rating: 4.9, genre: "فانتازيا", trending: true },
    { id: 8, title: "Wind Breaker", image: "https://picsum.photos/seed/wind/300/420", chapter: "الفصل 480", rating: 4.5, genre: "رياضة", trending: false },
];

const categories = ["الكل", "أكشن", "مغامرة", "فانتازيا", "دراما", "رياضة", "رومانسي", "رعب"];

let currentFilteredList = [...manhwaData];
let activeCategory = "الكل";

/* ==========================================
   4. دوال العرض
   ========================================== */
function renderTrending() {
    const scroll = document.getElementById('trendingScroll');
    const trending = manhwaData.filter(m => m.trending);
    scroll.innerHTML = trending.map(m => `
        <div class="trending-card" onclick="location.href='reader.html?id=${m.id}'">
            <img src="${m.image}" alt="${m.title}">
            <div class="trending-info">
                <h4>${m.title}</h4>
                <span>⭐ ${m.rating}</span>
            </div>
        </div>
    `).join('');
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = categories.map(c => `
        <button class="category-chip ${c === activeCategory ? 'active' : ''}" onclick="filterByCategory('${c}')">${c}</button>
    `).join('');
}

function renderManhwa(list) {
    currentFilteredList = list;
    const grid = document.getElementById('manhwaGrid');
    if (list.length === 0) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">لا توجد نتائج مطابقة.</p>'; return; }

    grid.innerHTML = list.map(m => `
        <div class="manhwa-card" onclick="location.href='reader.html?id=${m.id}'">
            <img src="${m.image}" alt="${m.title}">
            <div class="card-body">
                <h3>${m.title}</h3>
                <div class="card-meta">
                    <span>${m.chapter}</span>
                    <span>⭐ ${m.rating}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function filterByCategory(cat) {
    activeCategory = cat;
    currentFilteredList = cat === "الكل" ? manhwaData : manhwaData.filter(m => m.genre === cat);
    renderCategories();
    renderManhwa(currentFilteredList);
}

function searchManhwa() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const filtered = q ? manhwaData.filter(m => m.title.toLowerCase().includes(q)) : manhwaData;
    renderManhwa(filtered);
}

/* ==========================================
   5. الواجهة والمصادقة
   ========================================== */
function updateUI() {
    const user = getCurrentUser();
    const area = document.getElementById('userArea');
    if (user) {
        area.innerHTML = `<div class="user-badge"><span>👤 ${user}</span><button class="logout-btn" onclick="logout()">خروج</button></div>`;
    } else {
        area.innerHTML = `<button id="loginBtn" class="btn-outline" onclick="openModal()">تسجيل الدخول</button>`;
    }
}

function openModal() { document.getElementById('authModal').classList.remove('hidden'); document.getElementById('username').focus(); }
function closeModal() { document.getElementById('authModal').classList.add('hidden'); document.getElementById('authForm').reset(); }

let isRegisterMode = false;
function toggleAuthMode(e) {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    const t = document.getElementById('modalTitle'), s = document.getElementById('modalSubtitle');
    const tl = document.getElementById('toggleText'), a = document.getElementById('toggleAuthMode'), b = document.getElementById('submitAuth');
    if (isRegisterMode) { t.textContent = "إنشاء حساب جديد"; s.textContent = "انضم وابدأ القراءة"; tl.textContent = "لديك حساب؟"; a.textContent = "تسجيل الدخول"; b.textContent = "إنشاء الحساب"; }
    else { t.textContent = "مرحباً بك مجدداً"; s.textContent = "سجل دخولك للوصول إلى مكتبتك"; tl.textContent = "ليس لديك حساب؟"; a.textContent = "أنشئ حساباً"; b.textContent = "دخول"; }
}

/* ==========================================
   6. التهيئة
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    renderTrending();
    renderCategories();
    renderManhwa(manhwaData);
    updateUI();

    // البحث
    document.getElementById('searchBtn').addEventListener('click', searchManhwa);
    document.getElementById('searchInput').addEventListener('keyup', e => { if (e.key === 'Enter') searchManhwa(); });

    // الوضع الليلي
    const themeBtn = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('mh_theme');
    if (savedTheme === 'dark') { document.body.classList.replace('light-mode', 'dark-mode'); themeBtn.textContent = '☀️'; }
    themeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode', !isDark);
        themeBtn.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('mh_theme', isDark ? 'dark' : 'light');
    });

    // المصادقة
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('authModal').addEventListener('click', e => { if (e.target.id === 'authModal') closeModal(); });
    document.getElementById('toggleAuthMode').addEventListener('click', toggleAuthMode);

    document.getElementById('authForm').addEventListener('submit', async e => {
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

    // تبديل عرض الشبكة/القائمة
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('manhwaGrid').classList.toggle('list-view', btn.dataset.view === 'list');
        });
    });
});


