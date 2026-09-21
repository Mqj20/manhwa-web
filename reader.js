const chapters = [
    { id: 1, title: "الفصل 1: البداية", pages: ["https://picsum.photos/seed/p1/800/1200", "https://picsum.photos/seed/p2/800/1200", "https://picsum.photos/seed/p3/800/1200"] },
    { id: 2, title: "الفصل 2: الصعود", pages: ["https://picsum.photos/seed/p4/800/1200", "https://picsum.photos/seed/p5/800/1200"] },
    { id: 3, title: "الفصل 3: المواجهة", pages: ["https://picsum.photos/seed/p6/800/1200", "https://picsum.photos/seed/p7/800/1200", "https://picsum.photos/seed/p8/800/1200", "https://picsum.photos/seed/p9/800/1200"] },
];

const params = new URLSearchParams(location.search);
const manhwaId = parseInt(params.get('id')) || 1;
let currentChapter = parseInt(localStorage.getItem(`mh_progress_${manhwaId}`)) || 1;

function renderChapter() {
    const ch = chapters.find(c => c.id === currentChapter);
    if (!ch) return;

    document.getElementById('chapterTitle').textContent = ch.title;
    const container = document.getElementById('readerPages');
    container.innerHTML = ch.pages.map((p, i) => `<img src="${p}" alt="صفحة ${i+1}" loading="lazy">`).join('');

    // تحديث الأزرار
    const prevDisabled = currentChapter <= 1;
    const nextDisabled = currentChapter >= chapters.length;
    ['prevBtn', 'prevBtn2'].forEach(id => document.getElementById(id).disabled = prevDisabled);
    ['nextBtn', 'nextBtn2'].forEach(id => document.getElementById(id).disabled = nextDisabled);

    // حفظ التقدم
    localStorage.setItem(`mh_progress_${manhwaId}`, currentChapter);

    // تحديث شريط التقدم
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToChapter(dir) {
    const newCh = currentChapter + dir;
    if (newCh >= 1 && newCh <= chapters.length) {
        currentChapter = newCh;
        renderChapter();
    }
}

// شريط التقدم
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
});

// ربط الأزرار
document.getElementById('prevBtn').addEventListener('click', () => goToChapter(-1));
document.getElementById('nextBtn').addEventListener('click', () => goToChapter(1));
document.getElementById('prevBtn2').addEventListener('click', () => goToChapter(-1));
document.getElementById('nextBtn2').addEventListener('click', () => goToChapter(1));

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

renderChapter();
