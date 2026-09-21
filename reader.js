let allManhwa = [];
const params = new URLSearchParams(location.search);
const manhwaId = parseInt(params.get('id')) || 1;

function placeholderImg(t) { return 'https://via.placeholder.com/800x1200/1a1a2e/6c5ce7?text=' + encodeURIComponent((t || 'Page').substring(0, 15)); }

async function fetchManhwaData() {
    try {
        const r = await fetch('manhwa.json?v=' + Date.now());
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        allManhwa = d.manhwa || d || [];
    } catch (e) {
        console.warn('فشل جلب البيانات:', e.message);
        allManhwa = [];
    }
}

function getChaptersForManhwa(id) {
    const m = allManhwa.find(x => x.id === id);
    const total = (m && m.latest_chapter) ? Math.min(m.latest_chapter, 20) : 10;
    const chapters = [];
    for (let i = 1; i <= total; i++) {
        chapters.push({
            id: i,
            title: 'الفصل ' + i,
            pages: Array.from({ length: 3 }, (_, p) =>
                'https://picsum.photos/seed/mh' + id + 'ch' + i + 'p' + (p + 1) + '/800/1200'
            )
        });
    }
    return chapters;
}

let chapters = [];
let currentChapter = 1;

async function initReader() {
    await fetchManhwaData();
    const m = allManhwa.find(x => x.id === manhwaId);
    if (!m) {
        document.getElementById('chapterTitle').textContent = 'المانهوا غير موجودة';
        return;
    }
    chapters = getChaptersForManhwa(manhwaId);
    if (chapters.length === 0) {
        document.getElementById('chapterTitle').textContent = 'لا توجد فصول متاحة';
        return;
    }
    const saved = localStorage.getItem('mh_progress_' + manhwaId);
    if (saved) currentChapter = parseInt(saved);
    if (currentChapter > chapters.length) currentChapter = 1;
    document.title = (m.title_ar || m.title) + ' - قراءة';
    renderChapter();
}

function renderChapter() {
    const ch = chapters.find(c => c.id === currentChapter);
    if (!ch) return;
    document.getElementById('chapterTitle').textContent = ch.title;
    const container = document.getElementById('readerPages');
    container.innerHTML = ch.pages.map((p, i) =>
        '<img src="' + p + '" alt="صفحة ' + (i + 1) + '" loading="lazy" onerror="this.src=\'' + placeholderImg('Page') + '\'">'
    ).join('');

    const prevDisabled = currentChapter <= 1;
    const nextDisabled = currentChapter >= chapters.length;
    ['prevBtn', 'prevBtn2'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = prevDisabled; });
    ['nextBtn', 'nextBtn2'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = nextDisabled; });

    localStorage.setItem('mh_progress_' + manhwaId, currentChapter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToChapter(dir) {
    const n = currentChapter + dir;
    if (n >= 1 && n <= chapters.length) { currentChapter = n; renderChapter(); }
}

window.addEventListener('scroll', () => {
    const bar = document.getElementById('progressBar');
    if (!bar) return;
    const st = window.scrollY;
    const dh = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (dh > 0 ? (st / dh) * 100 : 0) + '%';
});

['prevBtn', 'prevBtn2'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => goToChapter(-1)); });
['nextBtn', 'nextBtn2'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => goToChapter(1)); });

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

initReader();
