/* ==========================================================
   5. جلب البيانات من JSON وتنسيقها
   ========================================================== */
async function fetchManhwaData() {
    try {
        // جلب الملف نسبةً لمكان الصفحة الحالية على GitHub Pages
        const response = await fetch('./manhwa.json?v=' + Date.now());
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.manhwa || []);
        
        if (list.length > 0) {
            manhwaData = list.map(m => {
                const fullUrl = m.url || m.link || '#';
                const rawCover = m.cover || '';
                // تصحيح رابط الصورة إذا كان نسبياً
                let finalCover = rawCover;
                if (rawCover.startsWith('//')) finalCover = 'https:' + rawCover;
                
                return {
                    id: m.id || Math.abs(hashCode(fullUrl || m.title || '')),
                    title: m.title || 'بدون عنوان',
                    title_ar: m.title_ar || m.title || 'بدون عنوان',
                    cover: finalCover,
                    summary: m.summary || `مانهوا مترجمة متاحة للقراءة.`,
                    status: m.status || 'ongoing',
                    genres: Array.isArray(m.genres) && m.genres.length > 0 ? m.genres : ['مانهوا'],
                    latest_chapter: m.latest_chapter || 1,
                    rating: m.rating || 8.5,
                    url: fullUrl
                };
            });
            console.log('✅ تم جلب ' + manhwaData.length + ' مانهوا بنجاح!');
        }
    } catch (e) {
        console.warn('⚠️ فشل جلب JSON (استخدام البيانات الاحتياطية):', e.message);
    }
    
    currentFilteredList = [...manhwaData];
    renderTrending();
    renderCategories();
    renderManhwa(currentFilteredList);
}

/* ==========================================================
   تعديل دالة الفتح عند الضغط على المانهوا
   ========================================================== */
function openDetails(id) {
    const m = manhwaData.find(x => x.id === id);
    if (!m) return;
    
    // إذا كانت المانهوا مجلوبة ولها رابط خارجي، فتح الرابط المباشر
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

    document.getElementById('detailsTitle').textContent = m.title_ar;
    document.getElementById('detailsSummary').textContent = m.summary || 'لا يوجد وصف.';
    document.getElementById('detailsMeta').innerHTML = `
        <span class="status-tag ${m.status}">${getStatusLabel(m.status)}</span>
        <span>📖 فصل ${m.latest_chapter}</span>
    `;
    document.getElementById('detailsRating').innerHTML = `${renderStars(m.rating)} <span>${m.rating} / 10</span>`;
    document.getElementById('detailsGenres').innerHTML = (m.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');

    document.getElementById('detailsModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
