/**
 * Site Customizer - Apply admin settings to all pages
 * Bu script bütün səhifələrdə yüklənir və admin tənzimləmələrini tətbiq edir
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {
    let settings;
    try {
        settings = await API.settings.get();
    } catch {
        return;
    }
    if (!settings) return;
    
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
        document.body.style.fontFamily = settings.typography.fontFamily;
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

        const heroBadge = document.querySelector('.hero-badge');
        if (heroBadge && settings.branding.slogan) heroBadge.textContent = settings.branding.slogan;
        
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
                heroTitle.textContent = settings.content.heroTitle;
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
                ctaButtons[0].replaceChildren(...(icon ? [icon, document.createTextNode(` ${settings.content.ctaButton1}`)] : [document.createTextNode(settings.content.ctaButton1)]));
            }
            if (ctaButtons[1] && settings.content.ctaButton2) {
                const icon = ctaButtons[1].querySelector('i');
                ctaButtons[1].replaceChildren(...(icon ? [icon, document.createTextNode(` ${settings.content.ctaButton2}`)] : [document.createTextNode(settings.content.ctaButton2)]));
            }
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

        const socialLinks = Array.from(document.querySelectorAll('a'));
        const setSocialLink = (label, value, domain) => {
            if (!value) return;
            const url = /^https:\/\//i.test(value) ? value : `https://${domain}/${String(value).replace(/^@/, '')}`;
            const link = socialLinks.find(item => item.textContent.trim().toLowerCase() === label);
            if (link) link.href = url;
        };
        setSocialLink('instagram', settings.footer.instagram, 'instagram.com');
        setSocialLink('telegram', settings.footer.telegram, 't.me');
    }
    
    });
})();
