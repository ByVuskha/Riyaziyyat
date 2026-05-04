/**
 * Automatic Popup Replacer
 * Overrides native alert(), confirm(), and prompt() with inline versions
 */

// Store original functions
window._originalAlert = window.alert;
window._originalConfirm = window.confirm;
window._originalPrompt = window.prompt;

// Override alert()
window.alert = function(message) {
    showNotification(String(message), 'info', 5000);
};

// Override confirm()
window.confirm = function(message) {
    // For synchronous code, we need to use the original confirm
    // But we'll show a deprecation warning
    console.warn('⚠️ Using native confirm(). Consider using showConfirm() for better UX.');
    return window._originalConfirm(message);
};

// Override prompt()
window.prompt = function(message, defaultValue) {
    // For synchronous code, we need to use the original prompt
    console.warn('⚠️ Using native prompt(). Consider using showPrompt() for better UX.');
    return window._originalPrompt(message, defaultValue);
};

// Helper: Convert confirm to async
window.confirmAsync = function(message) {
    return new Promise((resolve) => {
        showConfirm(message, () => resolve(true), () => resolve(false));
    });
};

// Helper: Convert prompt to async
window.promptAsync = function(message, defaultValue = '') {
    return new Promise((resolve) => {
        showPrompt(message, defaultValue, (value) => resolve(value), () => resolve(null));
    });
};

console.log('✅ Popup replacer loaded - alert() now shows inline notifications');
