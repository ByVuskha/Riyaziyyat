/**
 * Site Customizer - Apply admin settings to all pages
 * Bu script bütün səhifələrdə yüklənir və admin tənzimləmələrini tətbiq edir
 */

(function() {
    'use strict';
    
    // Load site settings
    const settings = Storage.get('siteSettings');
    
    if (!settings) {
        console.log('📝 Default site settings');
        return;
    }
    
    console.log('🎨 Applying custom site settings...');
    
    // Apply CSS Variables
    const root = document.documentElement;
    
    // Colors
    if (settings.colors) {
        root.style.setProperty('--primary', settings.colors.primary);
        root.style.setProperty('--secondary', settings.colors.secondary);
        root.style.setProperty('--success', settings.colors.success);
        root.style.setProperty('--warning', settings.colors.warning);
        root.style.setProperty('--danger', settings.colors.danger);
        root.style.setProperty('--dark', settings.colors.dark);
    }
    
    // Typography
    if (settings.typography) {
        root.style.setProperty('--font-family', settings.typography.fontFamily);
        document.body.style.fontSize = settings.typography.fontSize + 'px';
        document.body.style.lineHeight = settings.typography.lineHeight;
        
        // Apply heading font
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(h => {
            h.style.fontFamily = settings.typography.headingFont;
        });
    }
    
    // Update branding
    if (settings.branding) {
        // Logo text
        document.querySelectorAll('.navbar-logo span').forEach(el => {
            el.textContent = settings.branding.logoShort;
        });
        
        // Site name
        document.querySelectorAll('.navbar-logo').forEach(el => {
            const textNode = Array.from(el.childNodes).find(node => node.nodeType === 3);
            if (textNode) {
                textNode.textContent = ' ' + settings.branding.name;
            }
        });
        
        // Page title
        if (document.title.includes('Bizim Riyaziyyat') || document.title.includes('RiyazMath')) {
            document.title = document.title.replace(/Bizim Riyaziyyat|RiyazMath/g, settings.branding.name);
        }
        
        // Meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && settings.branding.metaDescription) {
            metaDesc.content = settings.branding.metaDescription;
        }
    }
    
    // Update content (only on index page)
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        if (settings.content) {
            // Hero title
            const heroTitle = document.querySelector('.hero h1');
            if (heroTitle && settings.content.heroTitle) {
                // Keep the <span> tag
                const span = heroTitle.querySelector('span');
                if (span) {
                    const parts = settings.content.heroTitle.split(' ');
                    const lastWord = parts.pop();
                    heroTitle.innerHTML = parts.join(' ') + ' <span>' + lastWord + '</span>';
                } else {
                    heroTitle.textContent = settings.content.heroTitle;
                }
            }
            
            // Hero subtitle
            const heroSubtitle = document.querySelector('.hero p');
            if (heroSubtitle && settings.content.heroSubtitle) {
                heroSubtitle.textContent = settings.content.heroSubtitle;
            }
            
            // CTA buttons
            const ctaButtons = document.querySelectorAll('.hero-buttons .btn');
            if (ctaButtons[0] && settings.content.ctaButton1) {
                const icon = ctaButtons[0].querySelector('i');
                ctaButtons[0].innerHTML = icon ? icon.outerHTML + ' ' + settings.content.ctaButton1 : settings.content.ctaButton1;
            }
            if (ctaButtons[1] && settings.content.ctaButton2) {
                const icon = ctaButtons[1].querySelector('i');
                ctaButtons[1].innerHTML = icon ? icon.outerHTML + ' ' + settings.content.ctaButton2 : settings.content.ctaButton2;
            }
            
            // Stats
            const stats = document.querySelectorAll('.hero-stat h3');
            if (stats[0] && settings.content.statVideos) stats[0].textContent = settings.content.statVideos;
            if (stats[1] && settings.content.statStudents) stats[1].textContent = settings.content.statStudents;
            if (stats[2] && settings.content.statTests) stats[2].textContent = settings.content.statTests;
            if (stats[3] && settings.content.statSatisfaction) stats[3].textContent = settings.content.statSatisfaction;
        }
    }
    
    // Update footer
    if (settings.footer) {
        // Footer description
        const footerBrand = document.querySelector('.footer-brand p');
        if (footerBrand && settings.footer.description) {
            footerBrand.textContent = settings.footer.description;
        }
        
        // Copyright
        const copyright = document.querySelector('.footer-bottom p');
        if (copyright && settings.footer.copyright) {
            copyright.textContent = settings.footer.copyright;
        }
        
        // Contact links
        const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
        emailLinks.forEach(link => {
            if (settings.footer.email) {
                link.href = 'mailto:' + settings.footer.email;
                link.textContent = settings.footer.email;
            }
        });
        
        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        phoneLinks.forEach(link => {
            if (settings.footer.phone) {
                link.href = 'tel:' + settings.footer.phone.replace(/\s/g, '');
                link.textContent = settings.footer.phone;
            }
        });
    }
    
    console.log('✅ Site customization applied');
    
})();
