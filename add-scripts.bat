@echo off
echo Adding Upstash scripts to HTML files...
echo.

REM Script content to add
set "SCRIPTS=<script src="js/config.js"></script>^

<script src="js/auth.js"></script>^

<script src="js/upstash.js"></script>^

<script src="js/storage-wrapper.js"></script>^

</body>^

</html>"

echo Done! Check the files.
pause
