/**
 * Inline Notification System
 * Replaces alert(), confirm(), and prompt() with elegant inline notifications
 */

// Create notification container if it doesn't exist
function createNotificationContainer() {
    if (document.getElementById('notificationContainer')) return;
    
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
    `;
    document.body.appendChild(container);
}

// Show notification (replaces alert)
function showNotification(message, type = 'info', duration = 4000) {
    createNotificationContainer();
    
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.cssText = `
        background: white;
        border-left: 4px solid ${colors[type]};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: start;
        gap: 12px;
        pointer-events: auto;
        animation: slideInRight 0.3s ease;
        max-width: 100%;
    `;
    
    notification.innerHTML = `
        <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 20px; margin-top: 2px;"></i>
        <div style="flex: 1; color: #1f2937; font-size: 14px; line-height: 1.5;">${message}</div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px;">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    return notification;
}

// Show confirmation dialog (replaces confirm)
function showConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: scaleIn 0.2s ease;
    `;
    
    dialog.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 24px;"></i>
            <h3 style="margin: 0; font-size: 18px; color: #1f2937;">Təsdiq Tələb Olunur</h3>
        </div>
        <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.6;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="confirmCancel" style="padding: 10px 20px; border: 2px solid #e5e7eb; background: white; color: #6b7280; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                Ləğv Et
            </button>
            <button id="confirmOk" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);">
                Təsdiqlə
            </button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus on confirm button
    setTimeout(() => dialog.querySelector('#confirmOk').focus(), 100);
    
    // Handle buttons
    dialog.querySelector('#confirmOk').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
    
    dialog.querySelector('#confirmCancel').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };
    
    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    };
    
    // Close on Escape
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            if (onCancel) onCancel();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Show input dialog (replaces prompt)
function showPrompt(message, defaultValue = '', onSubmit, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: scaleIn 0.2s ease;
    `;
    
    dialog.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <i class="fas fa-edit" style="color: #3b82f6; font-size: 24px;"></i>
            <h3 style="margin: 0; font-size: 18px; color: #1f2937;">Məlumat Daxil Edin</h3>
        </div>
        <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.6;">${message}</p>
        <input type="text" id="promptInput" value="${defaultValue}" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; margin-bottom: 24px; box-sizing: border-box;" />
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="promptCancel" style="padding: 10px 20px; border: 2px solid #e5e7eb; background: white; color: #6b7280; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                Ləğv Et
            </button>
            <button id="promptOk" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);">
                Təsdiqlə
            </button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const input = dialog.querySelector('#promptInput');
    input.focus();
    input.select();
    
    // Handle buttons
    const submit = () => {
        const value = input.value.trim();
        overlay.remove();
        if (onSubmit) onSubmit(value);
    };
    
    dialog.querySelector('#promptOk').onclick = submit;
    dialog.querySelector('#promptCancel').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };
    
    // Submit on Enter
    input.onkeydown = (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') {
            overlay.remove();
            if (onCancel) onCancel();
        }
    };
    
    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    };
}

// Add animations to document
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes scaleIn {
            from {
                transform: scale(0.9);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}
