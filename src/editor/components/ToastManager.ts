export class ToastManager {
    private container = document.getElementById('toast-container');

    public show(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
        if (!this.container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
        toast.innerHTML = `<span>${icons[type]}</span> <span>${message}</span>`;
        
        this.container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}
