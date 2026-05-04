# Add navbar and footer scripts to all HTML files

$files = @(
    "news.html",
    "videos.html", 
    "dashboard.html",
    "payment.html",
    "faq.html",
    "profile-edit.html"
)

$scriptsToAdd = @"
<script src="js/config.js"></script>
<script src="js/upstash.js"></script>
<script src="js/storage-wrapper.js"></script>
<script src="js/navbar.js"></script>
<script src="js/mobile-menu.js"></script>
<script src="js/auth.js"></script>
"@

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Check if navbar.js already exists
        if ($content -notmatch 'navbar\.js') {
            Write-Host "Adding scripts to $file..." -ForegroundColor Yellow
            
            # Find </body> tag and add scripts before it
            if ($content -match '</body>') {
                $content = $content -replace '</body>', "$scriptsToAdd`n</body>"
                $content | Set-Content $file -NoNewline
                Write-Host "✓ Updated $file" -ForegroundColor Green
            } else {
                Write-Host "✗ No </body> tag found in $file" -ForegroundColor Red
            }
        } else {
            Write-Host "○ $file already has navbar.js" -ForegroundColor Cyan
        }
    } else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Green
