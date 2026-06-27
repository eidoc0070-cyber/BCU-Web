import type { ExportProvider } from './base';
import type { ProjectFile } from '../project-manager';
import { TarBuilder } from '../tar-utils';

/**
 * Standard BCU Export: Bundles everything into a .tar file
 */
export class BCUTarExportProvider implements ExportProvider {
    readonly id = 'bcu-tar';
    readonly label = 'BCU Project (TAR)';
    readonly extension = 'tar';
    readonly mimeType = 'application/x-tar';

    async bundle(_projectName: string, files: ProjectFile[]): Promise<Blob> {
        const tar = new TarBuilder();
        
        for (const file of files) {
            let content: Uint8Array | string;
            
            if (file.type === 'sprite' || file.type === 'icon') {
                content = new Uint8Array(await file.data.arrayBuffer());
            } else {
                // maanim, mamodel, imgcut are text
                content = file.data as string;
            }
            
            tar.addFile(file.name, content);
        }

        return tar.build();
    }
}
