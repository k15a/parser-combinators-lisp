import * as path from 'path'
import * as fs from 'fs'

import * as minimist from 'minimist'
import * as chalk from 'chalk'

import parse from './Parser'
import generator from './Generator'

function compiler(input: string): string {
	const ast = parse(input)
	return generator(ast)
}

const help = fs.readFileSync(path.resolve('src', 'Help.txt'), 'utf-8')
const { _: [inputFile], ...flags } = minimist(process.argv.slice(2))

if (flags.help) {
	console.log(help)
	process.exit(0)
}

if (!inputFile) {
	console.log(chalk.red('You have to specify an input-file.'))
	console.log(help)
	process.exit(1)
}

// Read the content of the inputFile.
const content = fs.readFileSync(path.resolve(inputFile), 'utf-8')
// Compile the content of the inputFile.
const output = compiler(content)

// If there is a output file then write the compiled JavaScript into it.
if (flags.out) {
	fs.writeFileSync(path.resolve(flags.out), output, 'utf-8')
}

// If the run flag is set then run the compiled JavaScript.
if (flags.run) {
	eval(output)
}

// Otherwise log the compiled JavaScript to the user.
if (!flags.run && !flags.out) {
	console.log(output)
}
