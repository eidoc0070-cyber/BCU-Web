export interface ContextMenuItem {
    label?: string;
    icon?: string;
    action?: () => void;
    danger?: boolean;
    type?: 'item' | 'separator';
}

export class ContextMenu {
    private element: HTMLElement;
    private static instance: ContextMenu | null = null;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'context-menu';
        this.applyStyles();
        document.body.appendChild(this.element);
        
        window.addEventListener('mousedown', (e) => {
            if (!this.element.contains(e.target as Node)) {
                this.hide();
            }
        });
    }

    public static show(x: number, y: number, items: ContextMenuItem[]) {
        if (!this.instance) {
            this.instance = new ContextMenu();
        }
        this.instance.render(x, y, items);
    }

    private hide() {
        this.element.style.display = 'none';
    }

    private render(x: number, y: number, items: ContextMenuItem[]) {
        this.element.innerHTML = '';
        items.forEach(item => {
            if (item.type === 'separator') {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                this.element.appendChild(sep);
                return;
            }

            const row = document.createElement('div');
            row.className = 'context-menu-item' + (item.danger ? ' danger' : '');
            row.innerHTML = `
                <span class="icon">${item.icon || ''}</span>
                <span class="label">${item.label || ''}</span>
            `;
            row.onclick = (e) => {
                e.stopPropagation();
                if (item.action) item.action();
                this.hide();
            };
            this.element.appendChild(row);
        });

        this.element.style.display = 'block';
        
        // Adjust position if it goes off-screen
        const rect = this.element.getBoundingClientRect();
        let posX = x;
        let posY = y;
        
        if (posX + rect.width > window.innerWidth) posX -= rect.width;
        if (posY + rect.height > window.innerHeight) posY -= rect.height;

        this.element.style.left = `${posX}px`;
        this.element.style.top = `${posY}px`;
    }

    private applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .context-menu {
                position: fixed;
                background: rgba(13, 15, 26, 0.95);
                backdrop-filter: blur(15px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 6px;
                min-width: 180px;
                z-index: 9999;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                display: none;
                font-family: 'Plus Jakarta Sans', sans-serif;
            }
            .context-menu-item {
                padding: 8px 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                border-radius: 5px;
                font-size: 0.8rem;
                color: #e2e8f0;
                transition: all 0.2s;
            }
            .context-menu-item:hover {
                background: rgba(255, 255, 255, 0.08);
                color: white;
            }
            .context-menu-item.danger:hover {
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
            }
            .context-menu-separator {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 4px 8px;
            }
            .context-menu-item .icon {
                width: 16px;
                display: flex;
                justify-content: center;
                opacity: 0.7;
            }
            .context-menu-item .label {
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }
}
