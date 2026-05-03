@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════
echo     RIYAZMATH DEPLOYMENT HELPER
echo     Domain: bizimriyaziyyat.work.gd
echo ═══════════════════════════════════════════════════════════
echo.
echo 📦 Deployment üçün hazırlıq...
echo.

REM Check if files exist
echo ✅ Fayllar yoxlanılır...
if not exist "index.html" (
    echo ❌ index.html tapılmadı!
    pause
    exit /b 1
)
if not exist "admin.html" (
    echo ❌ admin.html tapılmadı!
    pause
    exit /b 1
)
if not exist ".htaccess" (
    echo ❌ .htaccess tapılmadı!
    pause
    exit /b 1
)
if not exist "css\main.css" (
    echo ❌ css\main.css tapılmadı!
    pause
    exit /b 1
)
if not exist "js\config.js" (
    echo ❌ js\config.js tapılmadı!
    pause
    exit /b 1
)
if not exist "js\auth.js" (
    echo ❌ js\auth.js tapılmadı!
    pause
    exit /b 1
)
if not exist "js\admin.js" (
    echo ❌ js\admin.js tapılmadı!
    pause
    exit /b 1
)

echo ✅ Bütün əsas fayllar mövcuddur!
echo.

REM Create deployment package
echo 📦 Deployment paketi yaradılır...
echo.

REM List files to be deployed
echo 📋 Deployment-ə daxil olan fayllar:
echo.
echo HTML Faylları:
echo   ✓ index.html
echo   ✓ login.html
echo   ✓ register.html
echo   ✓ dashboard.html
echo   ✓ admin.html
echo   ✓ videos.html
echo   ✓ tests.html
echo   ✓ news.html
echo   ✓ payment.html
echo   ✓ success.html
echo   ✓ faq.html
echo.
echo CSS Faylları:
echo   ✓ css/main.css
echo.
echo JavaScript Faylları:
echo   ✓ js/config.js
echo   ✓ js/auth.js
echo   ✓ js/admin.js
echo.
echo Konfiqurasiya:
echo   ✓ .htaccess
echo.
echo Dokumentasiya:
echo   ✓ README.md
echo   ✓ DEPLOYMENT.md
echo   ✓ QUICK-START.md
echo   ✓ deploy-checklist.txt
echo.

echo ═══════════════════════════════════════════════════════════
echo 🚀 DEPLOYMENT ADDIMLAR
echo ═══════════════════════════════════════════════════════════
echo.
echo 1️⃣  InfinityFree-yə daxil ol: https://infinityfree.net
echo 2️⃣  Control Panel → File Manager
echo 3️⃣  htdocs qovluğuna keç
echo 4️⃣  Bütün faylları yüklə (ZIP və ya FTP)
echo 5️⃣  SSL quraşdır (Control Panel → SSL)
echo 6️⃣  Saytı test et: https://bizimriyaziyyat.work.gd
echo.
echo ═══════════════════════════════════════════════════════════
echo 🔐 ADMIN GİRİŞİ
echo ═══════════════════════════════════════════════════════════
echo.
echo URL: https://bizimriyaziyyat.work.gd/admin
echo Email: admin@riyazmath.az
echo Şifrə: admin123
echo.
echo ⚠️  İLK GİRİŞDƏN SONRA ŞİFRƏNİ DƏYİŞDİRİN!
echo.
echo ═══════════════════════════════════════════════════════════
echo 📚 ƏTRAFLΙ MƏLUMAT
echo ═══════════════════════════════════════════════════════════
echo.
echo • Tez başlanğıc: QUICK-START.md
echo • Ətraflı təlimat: DEPLOYMENT.md
echo • Checklist: deploy-checklist.txt
echo • Layihə haqqında: README.md
echo.
echo ═══════════════════════════════════════════════════════════
echo.
echo ✅ Hazırdır! Deployment-ə başlaya bilərsiniz.
echo.
pause
