/**
 * Global Notifications - Auto-load on all pages
 * This file automatically loads notification system
 */

// Load notifications.js if not already loaded
if (typeof showNotification === 'undefined') {
    const script1 = document.createElement('script');
    script1.src = 'js/notifications.js';
    document.head.appendChild(script1);
    
    script1.onload = function() {
        // Load popup replacer after notifications
        const script2 = document.createElement('script');
        script2.src = 'js/popup-replacer.js';
        document.head.appendChild(script2);
    };
}
