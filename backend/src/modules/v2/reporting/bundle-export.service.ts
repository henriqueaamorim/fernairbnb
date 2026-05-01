import Archiver from "archiver";
import { PassThrough } from "stream";

export class BundleExportService {
  async zip(files: Array<{ name: string; content: Buffer }>): Promise<Buffer> {
    const stream = new PassThrough();
    const archive = Archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const output = new Promise<Buffer>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      archive.on("error", reject);
    });

    archive.pipe(stream);
    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }
    await archive.finalize();
    return output;
  }
}
