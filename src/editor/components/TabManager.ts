export class TabManager {
  private tabModel = document.getElementById('tab-model');
  private tabImgCut = document.getElementById('tab-imgcut');
  private tabFiles = document.getElementById('tab-files');

  private viewModel = document.getElementById('view-model-anim');
  private viewImgCut = document.getElementById('view-imgcut');
  private viewFiles = document.getElementById('view-files');

  private bcuCanvas = document.getElementById('bcu-canvas');
  private gizmoCanvas = document.getElementById('gizmo-canvas');
  private imgcutCanvas = document.getElementById('imgcut-canvas');

  constructor() {
    this.initEvents();
  }

  private initEvents() {
    this.tabModel?.addEventListener('click', () => this.switch('model'));
    this.tabImgCut?.addEventListener('click', () => this.switch('imgcut'));
    this.tabFiles?.addEventListener('click', () => this.switch('files'));
  }

  private switch(target: 'model' | 'imgcut' | 'files') {
    const tabs = [this.tabModel, this.tabImgCut, this.tabFiles];
    const views = [this.viewModel, this.viewImgCut, this.viewFiles];

    tabs.forEach((t) => t?.classList.remove('active'));
    views.forEach((v) => {
      if (v) v.style.display = 'none';
    });

    if (this.bcuCanvas) this.bcuCanvas.style.display = 'none';
    if (this.gizmoCanvas) this.gizmoCanvas.style.display = 'none';
    if (this.imgcutCanvas) this.imgcutCanvas.style.display = 'none';

    switch (target) {
      case 'model':
        this.tabModel?.classList.add('active');
        if (this.viewModel) this.viewModel.style.display = 'block';
        if (this.bcuCanvas) this.bcuCanvas.style.display = 'block';
        if (this.gizmoCanvas) this.gizmoCanvas.style.display = 'block';
        break;
      case 'imgcut':
        this.tabImgCut?.classList.add('active');
        if (this.viewImgCut) this.viewImgCut.style.display = 'block';
        if (this.imgcutCanvas) this.imgcutCanvas.style.display = 'block';
        break;
      case 'files':
        this.tabFiles?.classList.add('active');
        if (this.viewFiles) this.viewFiles.style.display = 'block';
        break;
    }
  }
}
