export class ImgCutList {
    private container = document.getElementById('imgcut-list');

    constructor(private onImgCutChange: (cutIdx: number, field: number, value: number) => void) {}

    public render(imgcut: any) {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        imgcut.cuts.forEach((cut: number[], idx: number) => {
            const name = imgcut.strs[idx] || `Cut ${idx}`;
            const row = document.createElement('div');
            row.style.padding = '0.75rem';
            row.style.marginBottom = '0.5rem';
            row.style.background = 'rgba(255,255,255,0.03)';
            row.style.borderRadius = '6px';
            row.style.fontSize = '0.75rem';

            row.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--accent);">${idx}: ${name}</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem;">
                    <div style="display: flex; align-items: center; gap: 4px;">X: <input type="number" data-idx="${idx}" data-field="0" value="${cut[0]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                    <div style="display: flex; align-items: center; gap: 4px;">Y: <input type="number" data-idx="${idx}" data-field="1" value="${cut[1]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                    <div style="display: flex; align-items: center; gap: 4px;">W: <input type="number" data-idx="${idx}" data-field="2" value="${cut[2]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                    <div style="display: flex; align-items: center; gap: 4px;">H: <input type="number" data-idx="${idx}" data-field="3" value="${cut[3]}" style="width: 100%; background: #000; color: white; border: 1px solid #333; padding: 2px;"></div>
                </div>
            `;

            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const el = e.target as HTMLInputElement;
                    const field = parseInt(el.getAttribute('data-field')!);
                    const cutIdx = parseInt(el.getAttribute('data-idx')!);
                    this.onImgCutChange(cutIdx, field, parseInt(el.value));
                });
            });

            this.container?.appendChild(row);
        });
    }
}
