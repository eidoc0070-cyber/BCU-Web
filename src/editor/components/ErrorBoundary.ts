export class UIErrorBoundary {
    private hasError = false;
    private lastError: Error | null = null;

    constructor(
        private container: HTMLElement | null,
        private componentName: string,
        private onRetry: () => void
    ) {}

    public run(renderFn: () => void) {
        if (this.hasError) {
            this.renderError();
            return;
        }

        try {
            renderFn();
        } catch (e: any) {
            this.hasError = true;
            this.lastError = e instanceof Error ? e : new Error(String(e));
            console.error(`[ErrorBoundary:${this.componentName}] Caught error:`, this.lastError);
            this.renderError();
        }
    }

    public clearError() {
        if (this.hasError) {
            this.hasError = false;
            this.lastError = null;
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    private renderError() {
        if (!this.container) return;
        
        // Avoid rebuilding the DOM on every renderTick if we are already showing the error
        if (this.container.querySelector('.ui-error-fallback')) {
            return;
        }

        this.container.innerHTML = '';
        
        const fallback = document.createElement('div');
        fallback.className = 'ui-error-fallback';
        fallback.style.padding = '1.25rem';
        fallback.style.margin = '0.5rem';
        fallback.style.background = 'rgba(239, 68, 68, 0.08)';
        fallback.style.border = '1px solid rgba(239, 68, 68, 0.25)';
        fallback.style.borderRadius = '8px';
        fallback.style.color = '#fca5a5';
        fallback.style.fontFamily = 'Plus Jakarta Sans, sans-serif';
        fallback.style.display = 'flex';
        fallback.style.flexDirection = 'column';
        fallback.style.gap = '8px';
        
        const title = document.createElement('h4');
        title.style.margin = '0';
        title.style.fontSize = '0.85rem';
        title.style.fontWeight = '700';
        title.style.color = '#fecaca';
        title.innerText = `⚠️ ${this.componentName} Error`;
        fallback.appendChild(title);
        
        const msg = document.createElement('p');
        msg.style.margin = '0';
        msg.style.fontSize = '0.75rem';
        msg.style.lineHeight = '1.3';
        msg.style.wordBreak = 'break-all';
        msg.innerText = this.lastError ? this.lastError.message : 'Unknown error occurred.';
        fallback.appendChild(msg);
        
        const btn = document.createElement('button');
        btn.className = 'action-btn secondary-btn';
        btn.style.fontSize = '0.70rem';
        btn.style.padding = '4px 8px';
        btn.style.marginTop = '4px';
        btn.style.alignSelf = 'flex-start';
        btn.innerText = '🔄 Retry';
        btn.onclick = (e) => {
            e.stopPropagation();
            this.clearError();
            this.onRetry();
        };
        fallback.appendChild(btn);
        
        this.container.appendChild(fallback);
    }
}
