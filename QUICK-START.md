# 🚀 RiyazMath - Tez Başlanğıc

## 📦 Deployment - 5 Addımda

### 1️⃣ Hosting Seç
**InfinityFree** (Tövsiyə edilir - Pulsuz)
- 🌐 https://infinityfree.net
- ✅ Pulsuz hosting
- ✅ Pulsuz SSL
- ✅ PHP & MySQL dəstəyi
- ✅ Limitsiz bandwidth

**Alternativlər:**
- 000webhost.com
- Hostinger (ödənişli)
- Netlify (static)

### 2️⃣ Hesab Yarat
1. InfinityFree-yə daxil ol
2. "Create Account" düyməsinə klik et
3. Domain seç: **bizimriyaziyyat.work.gd**
4. Email təsdiq et
5. 2-5 dəqiqə gözlə (hesab aktivləşir)

### 3️⃣ Faylları Yüklə

**Metod 1: File Manager (Asan)**
1. Control Panel → File Manager
2. `htdocs` qovluğuna keç
3. Bütün faylları ZIP-lə
4. Upload və Extract et

**Metod 2: FTP (Peşəkar)**
```
Host: ftpupload.net
Port: 21
Username: [control panel-dən al]
Password: [control panel-dən al]
```

FileZilla ilə:
1. FTP məlumatlarını daxil et
2. `/htdocs` qovluğuna keç
3. Faylları drag & drop et

### 4️⃣ SSL Quraşdır
1. Control Panel → SSL Certificates
2. "Install SSL" düyməsi
3. Let's Encrypt seç
4. Domain seç və install et
5. 5-10 dəqiqə gözlə

### 5️⃣ Test Et
Saytı aç: **https://bizimriyaziyyat.work.gd**

✅ Checklist:
- [ ] Ana səhifə açılır
- [ ] Login işləyir
- [ ] Admin panel açılır (admin@riyazmath.az / admin123)
- [ ] CSS düzgün yüklənir
- [ ] Mobil versiya işləyir

---

## 🔐 Admin Girişi

```
URL: https://bizimriyaziyyat.work.gd/admin
Email: admin@riyazmath.az
Şifrə: admin123
```

⚠️ **ÖNƏMLİ:** İlk giriş-dən sonra şifrəni dəyişdirin!

---

## 📁 Yüklənəcək Fayllar

```
✅ index.html
✅ login.html
✅ register.html
✅ dashboard.html
✅ admin.html
✅ videos.html
✅ tests.html
✅ news.html
✅ payment.html
✅ success.html
✅ faq.html
✅ .htaccess
✅ css/main.css
✅ js/config.js
✅ js/auth.js
✅ js/admin.js
```

---

## 🎨 Admin Panel Xüsusiyyətləri

### Dashboard
- 📊 Real-time statistika
- 👥 İstifadəçi sayı
- 📹 Video sayı
- 💰 Gəlir hesabatı
- 📈 Aktivlik qrafiki

### İstifadəçi İdarəetməsi
- ➕ Yeni istifadəçi əlavə et
- ✏️ İstifadəçi redaktə et
- 🗑️ İstifadəçi sil
- 👁️ Detallı məlumat
- 💰 Balans idarəetməsi

### Video İdarəetməsi
- ➕ Yeni video əlavə et
- ✏️ Video redaktə et
- 🗑️ Video sil
- 📊 Baxış statistikası
- 🏷️ Kateqoriya idarəetməsi

### Sınaq İdarəetməsi
- ➕ Yeni sınaq yarat
- ✏️ Sınaq redaktə et
- 🗑️ Sınaq sil
- ❓ Sual əlavə et
- 📊 Nəticə analizi

### Xəbər İdarəetməsi
- ➕ Yeni xəbər əlavə et
- ✏️ Xəbər redaktə et
- 🗑️ Xəbər sil
- 📅 Tarix planlaması
- 🏷️ Kateqoriya

### Ödəniş İdarəetməsi
- 💳 Ödəniş tarixçəsi
- ✅ Ödəniş təsdiqi
- 📊 Gəlir hesabatı
- 💰 Balans əməliyyatları

### Tənzimləmələr
- 🌐 Sayt adı
- 🔗 Domain
- 💵 Qiymətlər
- 📧 Email
- 📞 Telefon
- 🎁 Demo sınaq sayı

---

## 🔧 Problemlərin Həlli

### CSS yüklənmir
```
✅ Fayl yollarını yoxla
✅ Browser cache təmizlə
✅ .htaccess faylı yüklənib?
```

### Admin panel açılmır
```
✅ admin@riyazmath.az ilə giriş et
✅ Browser console-da error yoxla
✅ js/admin.js yüklənib?
```

### 404 Error
```
✅ .htaccess faylı htdocs-da olmalıdır
✅ mod_rewrite aktiv olmalıdır
✅ Fayl adları düzgündür?
```

### SSL işləmir
```
✅ 5-10 dəqiqə gözlə
✅ Cache təmizlə
✅ Control Panel-dən yenidən install et
```

---

## 📱 Mobil Test

Mobil cihazlarda test et:
- 📱 iPhone Safari
- 📱 Android Chrome
- 📱 Tablet
- 💻 Desktop (Chrome, Firefox, Safari, Edge)

---

## 🎯 Növbəti Addımlar

### Backend Əlavə Et
1. Java Spring Boot backend yaz
2. MySQL database quraşdır
3. API endpoints yarat
4. `js/config.js`-də API_URL yenilə

### Ödəniş Sistemi
1. Payment gateway seç (Stripe, PayPal, Kapital)
2. API inteqrasiyası
3. Webhook konfiqurasiyası
4. Test ödənişlər

### SEO Optimizasiyası
1. Meta tags əlavə et
2. Sitemap.xml yarat
3. robots.txt konfiqurasiya et
4. Google Search Console qeydiyyat

### Analytics
1. Google Analytics quraşdır
2. Facebook Pixel əlavə et
3. Conversion tracking
4. User behavior analizi

---

## 📞 Dəstək

**Problem olduqda:**
- 📧 Email: info@riyazmath.az
- 💬 InfinityFree Forum: https://forum.infinityfree.net
- 📚 Documentation: DEPLOYMENT.md

---

## ✅ Final Checklist

Deployment tamamlandı?
- [ ] Sayt açılır
- [ ] SSL işləyir (HTTPS)
- [ ] Admin panel işləyir
- [ ] Mobil versiya düzgün
- [ ] Bütün səhifələr test edildi
- [ ] Admin şifrəsi dəyişdirildi
- [ ] Backup yaradıldı
- [ ] Google Analytics əlavə edildi
- [ ] SEO optimizasiyası edildi
- [ ] İstifadəçilərə elan edildi

---

## 🎉 Uğurlar!

Saytınız hazırdır: **https://bizimriyaziyyat.work.gd**

İndi istifadəçilərə elan edə və platformanızı inkişaf etdirə bilərsiniz! 🚀

---

**RiyazMath Team** 💙
