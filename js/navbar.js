/**
 * Universal Navbar & Footer Component
 * Bütün səhifələrdə eyni navbar və footer
 */

// Navbar HTML
const NAVBAR_HTML = `
<nav class="navbar">
    <div class="container">
        <div class="navbar-inner">
            <a href="index.html" class="navbar-logo">
                <span>BR</span> Bizim Riyaziyyat
            </a>
            <button class="mobile-menu-toggle" id="mobileMenuToggle">
                <i class="fas fa-bars"></i>
            </button>
            <div class="navbar-menu">
                <a href="index.html" data-page="index">Ana Səhifə</a>
                <a href="videos.html" data-page="videos">Dərslər</a>
                <a href="tests.html" data-page="tests">Sınaqlar</a>
                <a href="teachers.html" data-page="teachers">Müəllimlər</a>
                <a href="news.html" data-page="news">Xəbərlər</a>
                <a href="faq.html" data-page="faq">FAQ</a>
            </div>
            <div class="navbar-actions">
                <span class="balance-badge" id="balanceBadge">
                    <i class="fas fa-wallet"></i> <span id="balanceAmount">0</span> ₼
                </span>
                <div id="guestButtons">
                    <a href="login.html" class="btn btn-secondary btn-sm">Giriş</a>
                    <a href="register.html" class="btn btn-primary btn-sm">Qeydiyyat</a>
                </div>
                <div id="userButtons" style="display:none;">
                    <a href="dashboard.html" class="btn btn-secondary btn-sm">
                        <i class="fas fa-user"></i> <span id="navUserName"></span>
                    </a>
                    <button onclick="logout()" class="btn btn-sm" style="background:#fee2e2;color:#dc2626;">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</nav>
<div class="mobile-menu" id="mobileMenu">
    <a href="index.html" data-page="index">Ana Səhifə</a>
    <a href="videos.html" data-page="videos">Dərslər</a>
    <a href="tests.html" data-page="tests">Sınaqlar</a>
    <a href="teachers.html" data-page="teachers">Müəllimlər</a>
    <a href="news.html" data-page="news">Xəbərlər</a>
    <a href="faq.html" data-page="faq">FAQ</a>
</div>
`;

// Footer HTML
const FOOTER_HTML = `
<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-brand">
                <div class="navbar-logo" style="color:white;">
                    <span>BR</span> Bizim Riyaziyyat
                </div>
                <p>Azərbaycanın ən böyük riyaziyyat öyrənmə platforması. Hər yaşdan tələbə üçün.</p>
            </div>
            <div class="footer-col">
                <h4>Keçidlər</h4>
                <ul>
                    <li><a href="videos.html">Dərslər</a></li>
                    <li><a href="tests.html">Sınaqlar</a></li>
                    <li><a href="teachers.html">Müəllimlər</a></li>
                    <li><a href="news.html">Xəbərlər</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Hesab</h4>
                <ul>
                    <li><a href="login.html">Giriş</a></li>
                    <li><a href="register.html">Qeydiyyat</a></li>
                    <li><a href="dashboard.html">Kabinet</a></li>
                    <li><a href="faq.html">Yardım</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Əlaqə</h4>
                <ul>
                    <li><a href="mailto:info@bizimriyaziyyat.az">info@bizimriyaziyyat.az</a></li>
                    <li><a href="tel:+994501234567">+994 50 123 45 67</a></li>
                    <li><a href="#">Instagram</a></li>
                    <li><a href="#">Telegram</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 Bizim Riyaziyyat. Bütün hüquqlar qorunur.</p>
        </div>
    </div>
</footer>
`;

// Navbar-ı render et
function renderNavbar() {
    // Check if navbar already exists
    if (document.querySelector('.navbar')) {
        console.log('📌 Navbar already exists, updating auth state only');
        // Just update auth state, don't create new navbar
        updateActiveLinks();
        return;
    }
    
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = NAVBAR_HTML;
    } else {
        // Əgər container yoxdursa, body-nin əvvəlinə əlavə et
        document.body.insertAdjacentHTML('afterbegin', NAVBAR_HTML);
    }
    
    updateActiveLinks();
    console.log('✅ Navbar rendered');
}

// Active link-ləri yenilə
function updateActiveLinks() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    
    // Desktop menu
    const desktopLinks = document.querySelectorAll('.navbar-menu a[data-page]');
    desktopLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Mobile menu
    const mobileLinks = document.querySelectorAll('.mobile-menu a[data-page]');
    mobileLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === currentPage) {
            link.classList.add('active');
        }
    });
}

// Footer-ı render et
function renderFooter() {
    // Check if footer already exists
    if (document.querySelector('.footer')) {
        console.log('📌 Footer already exists, skipping render');
        return;
    }
    
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = FOOTER_HTML;
    } else {
        // Əgər container yoxdursa, body-nin sonuna əlavə et
        document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
    }
    
    console.log('✅ Footer rendered');
}

// Auto-initialize - DEAKTIV (səhifələrdə artıq navbar var)
// Yalnız navbar/footer olmayan səhifələr üçün işləyir
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Yalnız navbar yoxdursa render et
        if (!document.querySelector('.navbar')) {
            renderNavbar();
        }
        if (!document.querySelector('.footer')) {
            renderFooter();
        }
    });
} else {
    if (!document.querySelector('.navbar')) {
        renderNavbar();
    }
    if (!document.querySelector('.footer')) {
        renderFooter();
    }
}
