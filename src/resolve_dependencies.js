const load_library = require('./load_library');

function resolve_dependencies(dependencies, library_directory) {
    const js_dependencies = [];
    const css_dependencies = [];

    function load(dependency) {
        if (dependency.preloadedDependencies) {
            dependency.preloadedDependencies.forEach(_dep => {
                const library = load_library(
                    `${_dep.machineName}-${_dep.majorVersion}.${
                        _dep.minorVersion
                    }`,
                    library_directory
                );
                load(library);
            });
        }
        if (dependency.preloadedJs) {
            dependency.preloadedJs.forEach(script => {
                js_dependencies.push(
                    `/${dependency.machineName}-${dependency.majorVersion}.${
                        dependency.minorVersion
                    }/${script.path}`
                );
            });
        }
        if (dependency.preloadedCss) {
            dependency.preloadedCss.forEach(style => {
                css_dependencies.push(
                    `/${dependency.machineName}-${dependency.majorVersion}.${
                        dependency.minorVersion
                    }/${style.path}`
                );
            });
        }
    }

    if (dependencies) {
        dependencies.forEach(dependency => {
            const library = load_library(
                `${dependency.machineName}-${dependency.majorVersion}.${
                    dependency.minorVersion
                }`,
                library_directory
            );
            load(library);
        });
    }

    return {
        js: js_dependencies,
        css: css_dependencies
    };
}

module.exports = resolve_dependencies;
