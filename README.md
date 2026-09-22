# MQJ MANHWA 4.1 — GitHub Pages + R2

هذه النسخة مبنية لتكون الواجهة على GitHub Pages، بينما يمكن تخزين صور الفصول المصرّح لك بإعادة نشرها على Cloudflare R2 أو أي S3-compatible storage.

## ماذا تغير؟
- إصلاح اكتشاف الـsitemap والفصول.
- مزامنة Olympus / Team-X و MeshManga إلى `catalog.json`.
- قارئ فصول داخل MQJ.
- وضع **Mirror Media** اختياري: عند تفعيله تُرفع صور الفصول إلى R2 ويستخدم القارئ النسخ المستضافة على التخزين الخاص بك.
- المزامنة كل 6 ساعات عبر GitHub Actions.
- لا يتجاوز تسجيل الدخول أو CAPTCHA أو paywall أو anti-bot.
- لم يتم تضمين مصدر HentaiSlayer.

## إعداد R2
1. أنشئ Bucket في Cloudflare R2.
2. أنشئ API Token بصلاحيات القراءة/الكتابة على الـBucket.
3. اربط Custom Domain للـBucket، مثل `https://cdn.example.com`.
4. في GitHub افتح `Settings → Secrets and variables → Actions` وأضف:
   - `MIRROR_MEDIA` = `true`
   - `R2_ENDPOINT`
   - `R2_BUCKET`
   - `R2_PUBLIC_BASE`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
5. شغّل `MQJ Manhwa Sync` من تبويب Actions.

إذا لم تضف أسرار R2 أو جعلت `MIRROR_MEDIA=false`، سيظل الموقع يعمل بوضع روابط الصور المباشرة للمصادر التي تسمح بذلك.

## مهم
استخدم النسخ والاستضافة فقط للمحتوى الذي لديك إذن أو ترخيص لإعادة نشره. GitHub Pages ليس مكانًا مناسبًا لتخزين مكتبة صور ضخمة؛ لذلك تم فصل الواجهة عن التخزين.
