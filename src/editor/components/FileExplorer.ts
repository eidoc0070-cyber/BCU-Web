export class FileExplorer {
    private container = document.getElementById('file-explorer');

    constructor(private onFileSelect: (name: string) => void) {}

    public render(project: any) {
        if (!this.container) return;
        this.container.innerHTML = '';

        const files = Array.from(project.files.values()) as any[];
        
        const categories = {
            'Images': files.filter(f => f.type === 'sprite' || f.type === 'icon'),
            'Data': files.filter(f => f.type === 'imgcut' || f.type === 'mamodel'),
            'Animations': files.filter(f => f.type === 'maanim')
        };

        Object.entries(categories).forEach(([name, group]) => {
            if (group.length === 0) return;

            const header = document.createElement('div');
            header.style.fontSize = '0.65rem';
            header.style.textTransform = 'uppercase';
            header.style.color = 'var(--text-secondary)';
            header.style.margin = '1rem 0 0.5rem 0.5rem';
            header.innerText = name;
            this.container?.appendChild(header);

            group.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.style.padding = '0.4rem 0.75rem';
                item.style.fontSize = '0.75rem';
                item.style.cursor = 'pointer';
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '8px';
                item.style.borderRadius = '4px';

                const icon = file.type === 'maanim' ? '🎞️' : (file.type === 'sprite' || file.type === 'icon' ? '🖼️' : '📄');
                item.innerHTML = `<span>${icon}</span> <span style="flex: 1">${file.name}</span>`;

                item.onclick = () => this.onFileSelect(file.name);
                this.container?.appendChild(item);
            });
        });
    }
}
