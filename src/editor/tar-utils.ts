export class TarBuilder {
    private blocks: Uint8Array[] = [];

    addFile(name: string, content: string | Uint8Array) {
        const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
        const header = this.createHeader(name, data.length);
        this.blocks.push(header);
        
        // Content blocks
        this.blocks.push(data);
        
        // Padding to 512 bytes
        const padding = (512 - (data.length % 512)) % 512;
        if (padding > 0) {
            this.blocks.push(new Uint8Array(padding));
        }
    }

    private createHeader(name: string, size: number): Uint8Array {
        const buf = new Uint8Array(512);
        const encoder = new TextEncoder();

        // 0-99: Name
        buf.set(encoder.encode(name).slice(0, 100), 0);
        
        // 100-107: Mode (0000644\0)
        buf.set(encoder.encode('0000644\0'), 100);
        
        // 108-115: UID (0000000\0)
        buf.set(encoder.encode('0000000\0'), 108);
        
        // 116-123: GID (0000000\0)
        buf.set(encoder.encode('0000000\0'), 116);

        // 124-135: Size (Octal)
        const sizeStr = size.toString(8).padStart(11, '0') + '\0';
        buf.set(encoder.encode(sizeStr), 124);

        // 136-147: Mtime
        const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
        buf.set(encoder.encode(mtime), 136);

        // 156: Typeflag ('0' for normal file)
        buf[156] = '0'.charCodeAt(0);

        // Magic
        buf.set(encoder.encode('ustar\0'), 257);
        buf.set(encoder.encode('00'), 263);

        // Checksum (148-155)
        // Fill checksum with spaces first
        for (let i = 0; i < 8; i++) buf[148 + i] = 32;

        let checksum = 0;
        for (let i = 0; i < 512; i++) checksum += buf[i];
        
        const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
        buf.set(encoder.encode(checksumStr), 148);

        return buf;
    }

    build(): Blob {
        // End of archive: two 512-byte zero blocks
        this.blocks.push(new Uint8Array(1024));
        return new Blob(this.blocks as any[], { type: 'application/x-tar' });
    }
}
