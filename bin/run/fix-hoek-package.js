/*
This shouldn't ever be required. There's some issue with the build environment
that's throwing hoek off... I've tried changing the Node versions and changing the dependency
versions to no result.

TODO figure out why this is neccessary
*/

const fs = require('node:fs');

const packageJsonPath = "./node_modules/@hapi/hoek/package.json";

function addLibPackages(exports) {
    let nonLibs = Object.keys(exports)
        .filter(val => val !== ".")
        .filter(val => !val.startsWith("./lib"));

    let libs = new Set(Object.keys(exports)
        .filter(val => val.startsWith("./lib"))
        .map(val => val.replace(/^\.\/lib\//, "./"))
    );

    let exportsToFix = nonLibs.filter(val => !libs.has(val)); // how does Node not have set subtract yet?!

    exportsToFix.forEach(val => {
        let key = val.replace("./", "./lib/");

        console.log(`Patching "${val}" with supplementary {"${key}": "${exports[val]}"}`);

        exports[key] = exports[val];
    });

    return exports;
}

async function main() {
    try {
        let package = JSON.parse(fs.readFileSync(packageJsonPath).toString());
        package["exports"] = addLibPackages(package["exports"]);
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(package));
        console.log(`Successfully patched ${packageJsonPath}`);
    } catch (err) {
        console.error(err);
        throw err;
    }
}

main()