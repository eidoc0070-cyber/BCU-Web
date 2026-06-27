import type { ProjectFile } from '../project-manager';
import type { ExportProvider } from './base';

/**
 * Single File Export: For downloading just one specific file (e.g. maanim)
 */
export class RawTextExportProvider implements ExportProvider {
  readonly id = 'raw-text';
  readonly label = 'Raw Text File';
  readonly extension = 'txt';
  readonly mimeType = 'text/plain';

  async bundle(_projectName: string, files: ProjectFile[]): Promise<Blob> {
    if (files.length === 0) throw new Error('No files to export');
    // Only take the first file for single file export
    const file = files[0];
    const content =
      typeof file.data === 'string' ? file.data : await file.data.text();
    return new Blob([content], { type: this.mimeType });
  }
}
