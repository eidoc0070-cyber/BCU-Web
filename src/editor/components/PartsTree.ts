import { eventBus } from '../event-bus';

export class PartsTree {
    private container = document.getElementById('parts-list');

    constructor() {}

    public render(parts: any[], selectedIndex: number | null) {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        const addRootBtn = document.createElement('button');
        addRootBtn.className = 'action-btn secondary-btn';
        addRootBtn.style.width = '100%';
        addRootBtn.style.marginBottom = '1rem';
        addRootBtn.style.fontSize = '0.7rem';
        addRootBtn.innerText = '+ Add Root Part';
        addRootBtn.onclick = () => eventBus.emit('PART_ADDED', { parent: -1 });
        this.container.appendChild(addRootBtn);

        const tree: any[] = [];
        const map: Record<number, any> = {};
        
        parts.forEach(p => {
            map[p.index] = { ...p, children: [] };
        });
        
        parts.forEach(p => {
            const parentIdx = p.raw_args[0];
            if (parentIdx === -1 || !map[parentIdx]) {
                tree.push(map[p.index]);
            } else {
                map[parentIdx].children.push(map[p.index]);
            }
        });

        const renderNode = (node: any, depth: number, container: HTMLElement) => {
            const item = document.createElement('div');
            item.className = 'part-item';
            item.style.paddingLeft = `${depth * 12 + 8}px`;
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '6px';
            
            if (selectedIndex === node.index) {
                item.style.background = 'rgba(139, 92, 246, 0.2)';
                item.style.border = '1px solid var(--accent)';
            }

            const nameSpan = document.createElement('span');
            nameSpan.innerText = `${node.index}: ${node.name || 'Part'}`;
            nameSpan.style.flex = '1';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            
            item.appendChild(nameSpan);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            actions.style.opacity = '0.7';
            actions.innerHTML = `
                <span title="Add Child" class="part-action-add" style="cursor: pointer;">➕</span>
                <span title="Delete Part" class="part-action-delete" style="cursor: pointer;">🗑️</span>
            `;
            
            actions.querySelector('.part-action-add')?.addEventListener('click', (e) => {
                e.stopPropagation();
                eventBus.emit('PART_ADDED', { parent: node.index });
            });
            
            actions.querySelector('.part-action-delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                eventBus.emit('PART_DELETED', { partIdx: node.index });
            });

            item.appendChild(actions);

            item.onclick = (e) => {
                e.stopPropagation();
                eventBus.emit('PART_SELECTED', { partIdx: node.index });
            };

            container.appendChild(item);
            node.children.forEach((child: any) => renderNode(child, depth + 1, container));
        };

        tree.forEach(root => renderNode(root, 0, this.container!));
    }
}
