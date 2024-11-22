// unpack apkg file
// taken from: https://github.com/74Genesis/anki-apkg-parser and the help of ChatGPT :P
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { unzip } from 'unzipit';

export default class APKGUnpacker {
  constructor() {
    const unzstdCommand = process.platform === 'win32' ? 'where unzstd' : 'which unzstd';
    try {
      const res = child_process.execSync(unzstdCommand).toString().trim();
      if (!res) throw new Error();
    } catch (error) {
      throw new Error('unzstd library not found. Please install it and ensure it is accessible from your PATH.');
    }
  }

  /**
   * Unzip apkg file
   * @param p path to .apkg file
   * @param o folder for unpacking
   */
  async unpack(p: string, o: string): Promise<void> {
    if (!fs.existsSync(p)) throw new Error('Deck file not found in: ' + p);

    this.createDir(o);

    const buf = fs.readFileSync(p);
    const { entries } = await unzip(new Uint8Array(buf));

    for (const entry of Object.values(entries)) {
      if (entry.isDirectory) {
        continue;
      }
      const data = await entry.arrayBuffer();

      const output = path.join(o, entry.name);

      if (/\.\./.test(output)) {
        console.warn('[zip warn]: ignoring maliciously crafted paths in zip file:', entry.name);
        throw new Error('File name contains special characters');
      }

      // save unzipped files
      fs.mkdirSync(path.dirname(output), { recursive: true });

      // try to decompress
      fs.writeFileSync(output, new Uint8Array(data));

			try {
        const unzstdCommand = `unzstd "${output}" -o "${output}_unzst" --rm`;
        child_process.execSync(unzstdCommand);
        fs.renameSync(`${output}_unzst`, `${output}`);
      } catch (e: any) {
        console.log('File not decompressed', output);
      }
    }
  }

  /**
   * Creates new dir if it doesn't exist
   * @param path folder path
   */
  private createDir(path: string) {
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
		} catch (e) {
			console.error(e);
      throw new Error('Failed to create directory: ' + path);
    }
  }
}