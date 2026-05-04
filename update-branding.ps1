# Update all HTML files with correct branding and copyright

$files = Get-ChildItem -Path "." -Filter "*.html" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Update RiyazMath to Bizim Riyaziyyat
    $content = $content -replace 'RiyazMath', 'Bizim Riyaziyyat'
    $content = $content -replace '<span>∑</span>', '<span>BR</span>'
    
    # Update copyright year to 2026
    $content = $content -replace '© 2024', '© 2026'
    $content = $content -replace '&copy; 2024', '&copy; 2026'
    
    # Update navbar menu items
    $content = $content -replace '<a href="success\.html">Uğurlar</a>', ''
    $content = $content -replace '<a href="news\.html">Xəbərlər</a>', '<a href="news.html">Xəbərlər</a>'
    
    # Save file
    $content | Set-Content $file.FullName -Encoding UTF8 -NoNewline
    
    Write-Host "Updated: $($file.Name)" -ForegroundColor Green
}

Write-Host "`nAll files updated successfully!" -ForegroundColor Cyan
