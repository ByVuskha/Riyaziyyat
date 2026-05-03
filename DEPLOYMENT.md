# RiyazMath - Deployment Guide
## Domain: bizimriyaziyyat.work.gd

### 📋 Deployment Checklist

#### 1. Domain Configuration
- ✅ Domain: `bizimriyaziyyat.work.gd`
- ✅ Hosting: InfinityFree / 000webhost / Hostinger
- ✅ SSL: Free SSL (Let's Encrypt)

#### 2. File Upload
Upload bütün faylları hosting-ə:
```
riyaziyyat-sayt/
├── index.html
├── login.html
├── register.html
├── dashboard.html
├── admin.html
├── videos.html
├── tests.html
├── news.html
├── payment.html
├── success.html
├── faq.html
├── .htaccess
├── css/
│   └── main.css
└── js/
    ├── config.js
    ├── auth.js
    └── admin.js
```

#### 3. Config Update
`js/config.js` faylında API URL-i yeniləyin:
```javascript
const CONFIG = {
    API_URL: 'https://bizimriyaziyyat.work.gd/api',  // Backend hazır olduqda
    APP_NAME: 'RiyazMath',
    VERSION: '1.0.0'
};
```

#### 4. InfinityFree Deployment Steps

##### A. Qeydiyyat
1. https://infinityfree.net saytına daxil olun
2. "Sign Up" düyməsinə klikləyin
3. Email və şifrə ilə qeydiyyatdan keçin

##### B. Hosting Yaradın
1. "Create Account" düyməsinə klikləyin
2. Domain seçin: `bizimriyaziyyat.work.gd`
3. Hesab yaradılmasını gözləyin (2-5 dəqiqə)

##### C. File Manager ilə Upload
1. Control Panel-ə daxil olun
2. "File Manager" açın
3. `htdocs` qovluğuna keçin
4. Bütün faylları upload edin:
   - Zip faylı yükləyin və extract edin
   - Və ya faylları birbaşa drag & drop edin

##### D. FTP ilə Upload (Alternativ)
```
Host: ftpupload.net
Username: [your_username]
Password: [your_password]
Port: 21
```

FileZilla və ya WinSCP istifadə edərək:
1. FTP məlumatlarını daxil edin
2. `/htdocs` qovluğuna keçin
3. Bütün faylları yükləyin

#### 5. Database Setup (Backend üçün)
Backend hazır olduqda:
1. Control Panel → MySQL Databases
2. Yeni database yaradın
3. User yaradın və icazələr verin
4. `config.js`-də database məlumatlarını yeniləyin

#### 6. SSL Configuration
1. Control Panel → SSL Certificates
2. "Install SSL" düyməsinə klikləyin
3. Let's Encrypt seçin
4. Domain seçin və install edin
5. `.htaccess`-də HTTPS redirect aktivləşdirin

#### 7. Testing
Deployment-dən sonra test edin:
- ✅ Ana səhifə: https://bizimriyaziyyat.work.gd
- ✅ Login: https://bizimriyaziyyat.work.gd/login
- ✅ Register: https://bizimriyaziyyat.work.gd/register
- ✅ Dashboard: https://bizimriyaziyyat.work.gd/dashboard
- ✅ Admin Panel: https://bizimriyaziyyat.work.gd/admin
- ✅ Videos: https://bizimriyaziyyat.work.gd/videos
- ✅ Tests: https://bizimriyaziyyat.work.gd/tests

#### 8. Admin Access
Default admin hesabı:
```
Email: admin@riyazmath.az
Password: admin123
```
⚠️ İlk giriş-dən sonra şifrəni dəyişdirin!

### 🔧 Troubleshooting

#### Problem: 404 Error
- `.htaccess` faylının yüklənməsini yoxlayın
- Apache mod_rewrite aktivdir?

#### Problem: CSS/JS yüklənmir
- Fayl yollarını yoxlayın
- Browser cache-i təmizləyin

#### Problem: Admin panel-ə giriş olmur
- `js/auth.js` və `js/admin.js` yüklənib?
- Browser console-da error varmı?

### 📱 Mobile Optimization
Sayt responsive dizayndadır və mobil cihazlarda düzgün işləyir.

### 🚀 Performance Tips
1. Image optimization: TinyPNG istifadə edin
2. Minify CSS/JS: Online minifier tools
3. Enable caching: `.htaccess` configured
4. CDN: Cloudflare istifadə edin (optional)

### 📊 Analytics
Google Analytics əlavə etmək üçün:
1. Google Analytics hesabı yaradın
2. Tracking code alın
3. Hər HTML faylın `<head>` bölməsinə əlavə edin

### 🔐 Security
- ✅ XSS Protection enabled
- ✅ CSRF tokens (backend-də)
- ✅ SQL Injection prevention (backend-də)
- ✅ Secure headers configured
- ✅ Directory browsing disabled

### 📞 Support
Problemlər olduqda:
- InfinityFree Forum: https://forum.infinityfree.net
- Email: support@infinityfree.net

### 🎉 Launch!
Deployment tamamlandıqdan sonra:
1. Bütün səhifələri test edin
2. Mobil versiyasını yoxlayın
3. Admin panel-i test edin
4. İstifadəçilərə elan edin!

---
**RiyazMath** - Riyaziyyat təhsilində yeni dövrü başladın! 🚀
