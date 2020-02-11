export default function checkFilename(filename: string): void {
    if (/\.\.\//.test(filename)) {
        throw new Error(
            `Relative paths in filenames are not allowed: ${filename} is illegal`
        );
    }
    if (filename.startsWith('/')) {
        throw new Error(
            `Absolute paths in filenames are not allowed: ${filename} is illegal`
        );
    }
}
