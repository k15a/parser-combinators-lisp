# Lisp to JS compiler

The binaries for the operation systems are the following:
- `./bin/compiler-linux` for Linux
- `./bin/compiler-macos` for MacOS
- `./bin/compiler-win` for Windows

Usage:
- `compiler --help`
- `compiler examples/HelloWorld.lisp --run`
- `compiler examples/HelloWorld.lisp --out output.js`

There are example Lisp programs in the example directory.

Options:
-  `--out`    Specify the file where the output should be saved.
-  `--run`    Will run the compiled JavaScript program.

The source code is in the src directory and the main entry file is `src/compiler.js`.

This compiler is written in [TypeScript](http://www.typescriptlang.org/) and packaged with [pkg](https://npm.im/pkg).

If you want to compile from source you have to install [`node@v8` & `npm`](https://nodejs.org/en/).

First of all install all dependencies with `npm install` and then either run the project with `npm start` or build the binaries with `npm run build`.
