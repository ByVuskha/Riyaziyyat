/**
 * Mobile Menu Handler
 * Mobil cihazlar üçün hamburger menyu
 */

(function() {
    'use strict';
    
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }
    
    function initMobileMenu() {
        // Check if navbar exists
        const navbar = document.querySelector('.navbar-inner');
        if (!navbar) return;
        
        // Check if mobile toggle already exists
        if (document.querySelector('.mobile-menu-toggle')) return;
        
        // Create mobile menu toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-menu-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        toggleBtn.style.display = 'none'; // Hidden by default, shown via CSS media query
        
        // Insert before navbar-actions
        const navbarActions = navbar.querySelector('.navbar-actions');
        if (navbarActions) {
            navbar.insertBefore(toggleBtn, navbarActions);
        }
        
        // Create mobile menu
        const navbarMenu = navbar.querySelector('.navbar-menu');
        if (!navbarMenu) return;
        
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        
        // Clone menu items
        const menuItems = navbarMenu.querySelectorAll('a');
        menuItems.forEach(item => {
            const clone = item.cloneNode(true);
            mobileMenu.appendChild(clone);
        });
        
        // Insert mobile menu after navbar
        const navbarContainer = document.querySelector('.navbar');
        if (navbarContainer) {
            navbarContainer.appendChild(mobileMenu);
        }
        
        // Toggle functionality
        let isOpen = false;
        
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            isOpen = !isOpen;
            
            if (isOpen) {
                mobileMenu.classList.add('active');
                toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                mobileMenu.classList.remove('active');
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (isOpen && !mobileMenu.contains(e.target) && e.target !== toggleBtn) {
                mobileMenu.classList.remove('active');
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
                isOpen = false;
            }
        });
        
        // Close menu when clicking a link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.remove('active');
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
                isOpen = false;
            });
        });
        
        // Close menu on window resize to desktop
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth > 768 && isOpen) {
                    mobileMenu.classList.remove('active');
                    toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
                    isOpen = false;
                }
            }, 250);
        });
        
        console.log('📱 Mobile menu initialized');
    }
    
})();
