# Upstash Script-lərini Bütün HTML Fayllarına Əlavə Et
# PowerShell Script

Write-Host "🚀 Upstash script-lərini əlavə edirik..." -ForegroundColor Green

# Script-lər
$scriptsToAdd = @"
<script src="js/config.js"></script>
<script src="js/auth.js"></script>
<script src="js/upstash.js"></script>
<script src="js/storage-wrapper.js"></script>
</body>
</html>
"@

# HTML faylları
$htmlFiles = @(
    "admin.html",
    "videos.html",
    "news.html",
    "news-add.html",
    "video-upload.html",
    "test-editor.html",
    "teachers.html",
    "register.html",
    "login.html",
    "dashboard.html",
    "payment.html",
    "tests.html",
    "faq.html",
    "success.html"
)

$updated = 0
$skipped = 0

foreach ($file in $htmlFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Yoxla: artıq upstash.js var?
        if ($content -match "upstash\.js") {
            Write-Host "⏭️  $file - artıq əlavə edilib" -ForegroundColor Yellow
            $skipped++
        }
        else {
            # </body></html> tap və əvəz et
            if ($content -match "</body>\s*</html>") {
                $newContent = $content -replace "</body>\s*</html>", $scriptsToAdd
                Set-Content $file $newContent -NoNewline
                Write-Host "✅ $file - yeniləndi" -ForegroundColor Green
                $updated++
            }
            else {
                Write-Host "⚠️  $file - </body></html> tapılmadı" -ForegroundColor Red
            }
        }
    }
    else {
        Write-Host "❌ $file - fayl tapılmadı" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Nəticə:" -ForegroundColor Cyan
Write-Host "   ✅ Yeniləndi: $updated" -ForegroundColor Green
Write-Host "   ⏭️  Keçildi: $skipped" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎉 Hazır! İndi browser-də test et!" -ForegroundColor Green
