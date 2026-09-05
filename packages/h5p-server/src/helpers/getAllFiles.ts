import { readdir } from 'fs/promises';
import { sep } from 'path';

/**
 * Recursively lists all files (not directories) under dirname. Paths are
 * built by concatenating dirname verbatim (not path.join, which would
 * normalize away any `..` segments) with each file's relative path, since
 * several callers strip the literal `dirname` string off the front of each
 * result.
 */
export async function getAllFiles(dirname: string): Promise<string[]> {
    const base = dirname.endsWith(sep) ? dirname : `${dirname}${sep}`;
    const entries = await readdir(base, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const fullPath = `${base}${entry.name}`;
            return entry.isDirectory() ? getAllFiles(fullPath) : [fullPath];
        })
    );
    return files.flat();
}
