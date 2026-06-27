import { AnimProp } from '../constants';
import { eventBus } from '../event-bus';
import { ContextMenu } from './ContextMenu';

export class PartsTree {
  private container = document.getElementById('parts-list');

  public render(parts: any[], selectedIdxs: number[]) {
    if (!this.container) return;
    this.container.innerHTML = '';

    const selectedSet = new Set(selectedIdxs);

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

    parts.forEach((p) => {
      map[p.index] = { ...p, children: [] };
    });

    parts.forEach((p) => {
      const parentIdx = p.raw_args[AnimProp.Parent];
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

      if (selectedSet.has(node.index)) {
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

      actions
        .querySelector('.part-action-add')
        ?.addEventListener('click', (e) => {
          e.stopPropagation();
          eventBus.emit('PART_ADDED', { parent: node.index });
        });

      actions
        .querySelector('.part-action-delete')
        ?.addEventListener('click', (e) => {
          e.stopPropagation();
          eventBus.emit('PART_DELETED', { partIdx: node.index });
        });

      item.appendChild(actions);

      item.onclick = (e) => {
        e.stopPropagation();

        let newSelection: number[];
        if (e.ctrlKey || e.metaKey) {
          if (selectedSet.has(node.index)) {
            newSelection = selectedIdxs.filter((id) => id !== node.index);
          } else {
            newSelection = [...selectedIdxs, node.index];
          }
        } else if (e.shiftKey && selectedIdxs.length > 0) {
          newSelection = [...selectedIdxs, node.index];
        } else {
          newSelection = [node.index];
        }

        eventBus.emit('PART_SELECTED', { partIdxs: newSelection });
      };

      item.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!selectedSet.has(node.index)) {
          eventBus.emit('PART_SELECTED', { partIdxs: [node.index] });
        }

        ContextMenu.show(e.clientX, e.clientY, [
          {
            label: 'Add Child Part',
            icon: '➕',
            action: () => eventBus.emit('PART_ADDED', { parent: node.index }),
          },
          {
            label: `Delete ${selectedSet.size > 1 ? selectedSet.size : ''} Part(s)`,
            icon: '🗑️',
            danger: true,
            action: () => {
              if (selectedSet.size > 1) {
                if (confirm(`Delete ${selectedSet.size} selected parts?`)) {
                  selectedIdxs.forEach((idx) =>
                    eventBus.emit('PART_DELETED', { partIdx: idx }),
                  );
                }
              } else {
                eventBus.emit('PART_DELETED', { partIdx: node.index });
              }
            },
          },
          {
            label: 'Select All Children',
            icon: '🔗',
            action: () => {
              const childrenIdxs: number[] = [];
              const collect = (n: any) => {
                childrenIdxs.push(n.index);
                n.children.forEach(collect);
              };
              collect(node);
              eventBus.emit('PART_SELECTED', {
                partIdxs: Array.from(
                  new Set([...selectedIdxs, ...childrenIdxs]),
                ),
              });
            },
          },
        ]);
      };

      container.appendChild(item);
      node.children.forEach((child: any) =>
        renderNode(child, depth + 1, container),
      );
    };

    tree.forEach((root) => renderNode(root, 0, this.container!));
  }
}
