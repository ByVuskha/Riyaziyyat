# RiyazMath Deployment ZIP Creator
# Domain: bizimriyaziyyat.work.gd

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    RIYAZMATH DEPLOYMENT ZIP CREATOR" -ForegroundColor Yellow
Write-Host "    Domain: bizimriyaziyyat.work.gd" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Files to include in deployment
$filesToInclude = @(
    "index.html",
    "login.html",
    "register.html",
    "dashboard.html",
    "admin.html",
    "videos.html",
    "tests.html",
    "news.html",
    "payment.html",
    "success.html",
    "faq.html",
    ".htaccess",
    "css\main.css",
    "js\config.js",
    "js\auth.js",
    "js\admin.js"
)

# Check if all files exist
Write-Host "📋 Fayllar yoxlanılır..." -ForegroundColor Yellow
$allFilesExist = $true
foreach ($file in $filesToInclude) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file - TAPILMADI!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "❌ Bəzi fayllar tapılmadı! Deployment dayandırıldı." -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

Write-Host ""
Write-Host "✅ Bütün fayllar mövcuddur!" -ForegroundColor Green
Write-Host ""

# Create deployment folder
$deployFolder = "riyazmath-deployment"
$zipFile = "riyazmath-deployment.zip"

Write-Host "📦 Deployment paketi yaradılır..." -ForegroundColor Yellow

# Remove old deployment folder and zip if exists
if (Test-Path $deployFolder) {
    Remove-Item -Recurse -Force $deployFolder
}
if (Test-Path $zipFile) {
    Remove-Item -Force $zipFile
}

# Create deployment folder structure
New-Item -ItemType Directory -Path $deployFolder | Out-Null
New-Item -ItemType Directory -Path "$deployFolder\css" | Out-Null
New-Item -ItemType Directory -Path "$deployFolder\js" | Out-Null

# Copy files
Write-Host ""
Write-Host "📂 Fayllar kopyalanır..." -ForegroundColor Yellow
foreach ($file in $filesToInclude) {
    Copy-Item $file "$deployFolder\$file" -Force
    Write-Host "  ✓ $file kopyalandı" -ForegroundColor Green
}

# Create ZIP file
Write-Host ""
Write-Host "🗜️  ZIP faylı yaradılır..." -ForegroundColor Yellow
Compress-Archive -Path "$deployFolder\*" -DestinationPath $zipFile -Force

# Cleanup
Remove-Item -Recurse -Force $deployFolder

# Get file size
$zipSize = (Get-Item $zipFile).Length / 1KB
$zipSizeFormatted = "{0:N2} KB" -f $zipSize

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT PAKETİ HAZIRDIR!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Fayl: $zipFile" -ForegroundColor Yellow
Write-Host "📊 Ölçü: $zipSizeFormatted" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 NÖVBƏTI ADDIMLAR" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. InfinityFree-yə daxil ol: https://infinityfree.net" -ForegroundColor White
Write-Host "2. Control Panel → File Manager" -ForegroundColor White
Write-Host "3. htdocs qovluğuna keç" -ForegroundColor White
Write-Host "4. $zipFile faylını yüklə" -ForegroundColor White
Write-Host "5. ZIP faylını extract et" -ForegroundColor White
Write-Host "6. SSL quraşdır (Control Panel → SSL)" -ForegroundColor White
Write-Host "7. Saytı test et: https://bizimriyaziyyat.work.gd" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔐 ADMIN GİRİŞİ" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL: https://bizimriyaziyyat.work.gd/admin" -ForegroundColor White
Write-Host "Email: admin@riyazmath.az" -ForegroundColor White
Write-Host "Şifrə: admin123" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  İLK GİRİŞDƏN SONRA ŞİFRƏNİ DƏYİŞDİRİN!" -ForegroundColor Red
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Uğurlar! 🚀" -ForegroundColor Green
Write-Host ""
pause
