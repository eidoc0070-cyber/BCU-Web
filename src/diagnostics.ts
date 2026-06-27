export interface DiagnosticResult {
  secureContext: boolean;
  webGpuSupported: boolean;
  webGpuAdapter: string | null;
  webGl2Supported: boolean;
  webGl2Renderer: string | null;
  userAgent: string;
  errors: string[];
}

export async function runDiagnostics(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    secureContext: window.isSecureContext,
    webGpuSupported: 'gpu' in navigator,
    webGpuAdapter: null,
    webGl2Supported: false,
    webGl2Renderer: null,
    userAgent: navigator.userAgent,
    errors: [],
  };

  // 1. WebGPU Check
  if (result.webGpuSupported) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        const info = (await adapter.requestAdapterInfo?.()) || {};
        result.webGpuAdapter =
          info.description || adapter.name || 'Generic WebGPU Adapter';
      } else {
        result.errors.push(
          'WebGPU navigator.gpu.requestAdapter() returned null.',
        );
      }
    } catch (e: any) {
      result.errors.push(`WebGPU Error: ${e.message}`);
    }
  } else {
    result.errors.push('WebGPU is not supported by this browser.');
  }

  // 2. WebGL2 Check
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (gl) {
    result.webGl2Supported = true;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.webGl2Renderer = gl.getParameter(
        debugInfo.UNMASKED_RENDERER_WEBGL,
      );
    } else {
      result.webGl2Renderer = gl.getParameter(gl.RENDERER);
    }
  } else {
    result.errors.push('WebGL2 context creation failed.');
  }

  // 3. Secure Context Analysis
  if (!result.secureContext) {
    result.errors.push(
      'NOT IN SECURE CONTEXT: WebGPU requires HTTPS or localhost. If you are using an IP address, WebGPU will be disabled.',
    );
  }

  return result;
}

export function formatDiagnosticReport(result: DiagnosticResult): string {
  let report = `--- BCU Graphics Diagnostics ---\n`;
  report += `User Agent: ${result.userAgent}\n`;
  report += `Secure Context: ${result.secureContext ? '✅ YES' : '❌ NO'}\n`;
  report += `WebGPU Support: ${result.webGpuSupported ? '✅ YES' : '❌ NO'}\n`;
  report += `WebGPU Adapter: ${result.webGpuAdapter || 'N/A'}\n`;
  report += `WebGL2 Support: ${result.webGl2Supported ? '✅ YES' : '❌ NO'}\n`;
  report += `WebGL2 Renderer: ${result.webGl2Renderer || 'N/A'}\n`;

  if (result.errors.length > 0) {
    report += `\nDetected Issues:\n`;
    result.errors.forEach((err) => {
      report += `- ${err}\n`;
    });
  } else {
    report += `\nNo obvious environment issues detected.\n`;
  }

  report += `\nPossible Solution: If "No available adapters" persists, try starting the browser with --disable-software-rasterizer or check if a specialized extension is blocking Canvas access.`;
  return report;
}
