import LibraryPatcher from '../src/helpers/LibraryPatcher';

describe('LibraryPatcher', () => {
    const echo360Library = {
        machineName: 'H5P.Echo360',
        majorVersion: 1,
        minorVersion: 0
    };

    describe('built-in patches', () => {
        it('applies the built-in echo360.js patch', () => {
            const patcher = new LibraryPatcher();
            const input = 'var x = 1; delete previousTickMS; var y = 2;';
            const result = patcher.applyPatches(
                input,
                'js/echo360.js',
                echo360Library
            );
            expect(result).toBe(
                'var x = 1; previousTickMS = undefined; var y = 2;'
            );
        });

        it('does not apply the echo360 patch to other libraries', () => {
            const patcher = new LibraryPatcher();
            const input = 'delete previousTickMS';
            const result = patcher.applyPatches(input, 'js/echo360.js', {
                machineName: 'H5P.Other',
                majorVersion: 1,
                minorVersion: 0
            });
            expect(result).toBe(input);
        });

        it('does not apply the echo360 patch to other filenames', () => {
            const patcher = new LibraryPatcher();
            const input = 'delete previousTickMS';
            const result = patcher.applyPatches(
                input,
                'other.js',
                echo360Library
            );
            expect(result).toBe(input);
        });
    });

    describe('filename matching (endsWith)', () => {
        it('matches when filename ends with patch filename', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'main.js',
                    search: 'foo',
                    replace: 'bar'
                }
            ]);
            const result = patcher.applyPatches('foo', 'scripts/main.js', {
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            });
            expect(result).toBe('bar');
        });

        it('matches exact filename', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'main.js',
                    search: 'foo',
                    replace: 'bar'
                }
            ]);
            const result = patcher.applyPatches('foo', 'main.js', {
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            });
            expect(result).toBe('bar');
        });

        it('does not match when filename does not end with patch filename', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'main.js',
                    search: 'foo',
                    replace: 'bar'
                }
            ]);
            const result = patcher.applyPatches('foo', 'main.js.bak', {
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            });
            expect(result).toBe('foo');
        });
    });

    describe('version range matching', () => {
        const makePatcher = (
            minVersion?: { majorVersion: number; minorVersion: number },
            maxVersion?: { majorVersion: number; minorVersion: number }
        ): LibraryPatcher =>
            new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    minVersion,
                    maxVersion,
                    search: 'old',
                    replace: 'new'
                }
            ]);

        const lib = (major: number, minor: number) => ({
            machineName: 'H5P.Test',
            majorVersion: major,
            minorVersion: minor
        });

        it('applies patch when no version constraints are set', () => {
            const patcher = makePatcher();
            expect(patcher.applyPatches('old', 'test.js', lib(99, 99))).toBe(
                'new'
            );
        });

        it('applies patch when version equals minVersion', () => {
            const patcher = makePatcher({ majorVersion: 2, minorVersion: 3 });
            expect(patcher.applyPatches('old', 'test.js', lib(2, 3))).toBe(
                'new'
            );
        });

        it('applies patch when version is above minVersion (minor)', () => {
            const patcher = makePatcher({ majorVersion: 2, minorVersion: 3 });
            expect(patcher.applyPatches('old', 'test.js', lib(2, 5))).toBe(
                'new'
            );
        });

        it('applies patch when version is above minVersion (major)', () => {
            const patcher = makePatcher({ majorVersion: 2, minorVersion: 3 });
            expect(patcher.applyPatches('old', 'test.js', lib(3, 0))).toBe(
                'new'
            );
        });

        it('does not apply patch when version is below minVersion (minor)', () => {
            const patcher = makePatcher({ majorVersion: 2, minorVersion: 3 });
            expect(patcher.applyPatches('old', 'test.js', lib(2, 2))).toBe(
                'old'
            );
        });

        it('does not apply patch when version is below minVersion (major)', () => {
            const patcher = makePatcher({ majorVersion: 2, minorVersion: 3 });
            expect(patcher.applyPatches('old', 'test.js', lib(1, 9))).toBe(
                'old'
            );
        });

        it('applies patch when version equals maxVersion', () => {
            const patcher = makePatcher(undefined, {
                majorVersion: 3,
                minorVersion: 5
            });
            expect(patcher.applyPatches('old', 'test.js', lib(3, 5))).toBe(
                'new'
            );
        });

        it('applies patch when version is below maxVersion (minor)', () => {
            const patcher = makePatcher(undefined, {
                majorVersion: 3,
                minorVersion: 5
            });
            expect(patcher.applyPatches('old', 'test.js', lib(3, 4))).toBe(
                'new'
            );
        });

        it('does not apply patch when version is above maxVersion (minor)', () => {
            const patcher = makePatcher(undefined, {
                majorVersion: 3,
                minorVersion: 5
            });
            expect(patcher.applyPatches('old', 'test.js', lib(3, 6))).toBe(
                'old'
            );
        });

        it('does not apply patch when version is above maxVersion (major)', () => {
            const patcher = makePatcher(undefined, {
                majorVersion: 3,
                minorVersion: 5
            });
            expect(patcher.applyPatches('old', 'test.js', lib(4, 0))).toBe(
                'old'
            );
        });

        it('applies patch when version is within min-max range', () => {
            const patcher = makePatcher(
                { majorVersion: 1, minorVersion: 2 },
                { majorVersion: 3, minorVersion: 5 }
            );
            expect(patcher.applyPatches('old', 'test.js', lib(2, 0))).toBe(
                'new'
            );
        });

        it('does not apply patch when version is outside min-max range', () => {
            const patcher = makePatcher(
                { majorVersion: 1, minorVersion: 2 },
                { majorVersion: 3, minorVersion: 5 }
            );
            expect(patcher.applyPatches('old', 'test.js', lib(4, 0))).toBe(
                'old'
            );
        });
    });

    describe('string replacement', () => {
        it('replaces the first occurrence by default', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: 'foo',
                    replace: 'bar'
                }
            ]);
            expect(
                patcher.applyPatches('foo foo foo', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('bar foo foo');
        });

        it('replaces all occurrences when replaceAll is true', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: 'foo',
                    replace: 'bar',
                    replaceAll: true
                }
            ]);
            expect(
                patcher.applyPatches('foo foo foo', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('bar bar bar');
        });
    });

    describe('regex replacement', () => {
        it('replaces using a regex pattern', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: /broken\(\s*\)/,
                    replace: 'fixed()'
                }
            ]);
            expect(
                patcher.applyPatches('call broken(  ); done', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('call fixed(); done');
        });

        it('replaces only the first match when regex has no g flag and replaceAll is false', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: /\bx\b/,
                    replace: 'y'
                }
            ]);
            expect(
                patcher.applyPatches('x + x + x', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('y + x + x');
        });

        it('replaces all matches when replaceAll is true', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: /\bx\b/,
                    replace: 'y',
                    replaceAll: true
                }
            ]);
            expect(
                patcher.applyPatches('x + x + x', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('y + y + y');
        });

        it('replaces all matches when regex already has g flag', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: /\bx\b/g,
                    replace: 'y'
                }
            ]);
            expect(
                patcher.applyPatches('x + x + x', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('y + y + y');
        });

        it('supports capture groups in replacement', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: /(\w+)\.old/g,
                    replace: '$1.new'
                }
            ]);
            expect(
                patcher.applyPatches('obj.old and thing.old', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('obj.new and thing.new');
        });
    });

    describe('disabled patches', () => {
        it('does not apply a disabled patch', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: 'foo',
                    replace: 'bar',
                    disabled: true
                }
            ]);
            expect(
                patcher.applyPatches('foo', 'test.js', {
                    machineName: 'H5P.Test',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('foo');
        });

        it('can disable a built-in patch by providing a disabled custom patch', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Echo360',
                    filename: 'echo360.js',
                    disabled: true
                }
            ]);
            const input = 'delete previousTickMS';
            const result = patcher.applyPatches(
                input,
                'js/echo360.js',
                echo360Library
            );
            expect(result).toBe(input);
        });
    });

    describe('custom patch override behavior', () => {
        it('custom patch with same machineName + filename overrides built-in', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Echo360',
                    filename: 'echo360.js',
                    search: 'delete previousTickMS',
                    replace: '/* custom fix */'
                }
            ]);
            const result = patcher.applyPatches(
                'delete previousTickMS',
                'js/echo360.js',
                echo360Library
            );
            expect(result).toBe('/* custom fix */');
        });

        it('custom patch does not affect unrelated built-in patches', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Other',
                    filename: 'other.js',
                    search: 'a',
                    replace: 'b'
                }
            ]);
            // The built-in echo360 patch should still work
            const result = patcher.applyPatches(
                'delete previousTickMS',
                'js/echo360.js',
                echo360Library
            );
            expect(result).toBe('previousTickMS = undefined');
        });

        it('multiple custom patches can target the same library', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'a.js',
                    search: 'old_a',
                    replace: 'new_a'
                },
                {
                    machineName: 'H5P.Test',
                    filename: 'b.js',
                    search: 'old_b',
                    replace: 'new_b'
                }
            ]);
            const lib = {
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            };
            expect(patcher.applyPatches('old_a', 'a.js', lib)).toBe('new_a');
            expect(patcher.applyPatches('old_b', 'b.js', lib)).toBe('new_b');
        });

        it('multiple patches can apply to the same file', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: 'alpha',
                    replace: 'beta'
                },
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: 'gamma',
                    replace: 'delta'
                }
            ]);
            const lib = {
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            };
            expect(
                patcher.applyPatches('alpha and gamma', 'test.js', lib)
            ).toBe('beta and delta');
        });
    });

    describe('core and editor files', () => {
        it('returns text unchanged when library is undefined', () => {
            const patcher = new LibraryPatcher([
                {
                    machineName: 'H5P.Test',
                    filename: 'test.js',
                    search: 'foo',
                    replace: 'bar'
                }
            ]);
            expect(patcher.applyPatches('foo', 'test.js', undefined)).toBe(
                'foo'
            );
        });
    });

    describe('no patches configured', () => {
        it('returns text unchanged when no custom patches and file does not match built-in', () => {
            const patcher = new LibraryPatcher();
            expect(
                patcher.applyPatches('some content', 'unrelated.js', {
                    machineName: 'H5P.Unrelated',
                    majorVersion: 1,
                    minorVersion: 0
                })
            ).toBe('some content');
        });

        it('returns text unchanged when custom patches array is empty', () => {
            const patcher = new LibraryPatcher([]);
            expect(
                patcher.applyPatches(
                    'delete previousTickMS',
                    'js/echo360.js',
                    echo360Library
                )
            ).toBe('previousTickMS = undefined');
        });
    });
});
