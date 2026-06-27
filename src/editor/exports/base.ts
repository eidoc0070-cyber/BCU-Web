import type { ProjectFile } from '../project-manager';

/**
 * Interface for different export formats (Strategy Pattern)
 */
export interface ExportProvider {
  readonly id: string;
  readonly label: string;
  readonly extension: string;
  readonly mimeType: string;

  /**
   * Packages a collection of project files into a single Blob
   */
  bundle(projectName: string, files: ProjectFile[]): Promise<Blob>;
}

/**
 * Registry to manage available export formats
 */
export class ExportManager {
  private static providers: Map<string, ExportProvider> = new Map();

  public static registerProvider(provider: ExportProvider) {
    ExportManager.providers.set(provider.id, provider);
  }

  public static getProvider(id: string): ExportProvider | undefined {
    return ExportManager.providers.get(id);
  }

  public static listProviders(): ExportProvider[] {
    return Array.from(ExportManager.providers.values());
  }

  /**
   * Executes export using a specific provider and triggers download
   */
  public static async export(
    providerId: string,
    projectName: string,
    files: ProjectFile[],
  ) {
    const provider = ExportManager.getProvider(providerId);
    if (!provider) throw new Error(`Export provider not found: ${providerId}`);

    const blob = await provider.bundle(projectName, files);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = projectName.trim().replace(/\s+/g, '_') || 'BCU_Project';

    a.href = url;
    a.download = `${safeName}.${provider.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
