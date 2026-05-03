@echo off
chcp 65001 >nul
echo.
echo Creating deployment ZIP...
echo.

powershell -Command "Compress-Archive -Path 'index.html','login.html','register.html','dashboard.html','admin.html','videos.html','tests.html','news.html','payment.html','success.html','faq.html','.htaccess','css','js' -DestinationPath 'riyazmath-deployment.zip' -Force"

if exist "riyazmath-deployment.zip" (
    echo.
    echo ✓ ZIP file created successfully: riyazmath-deployment.zip
    echo.
    echo Upload this file to your hosting at: bizimriyaziyyat.work.gd
    echo.
) else (
    echo.
    echo ✗ Failed to create ZIP file
    echo.
)

pause
