import * as fs from 'fs'
import * as path from 'path'

import {
	ListItem,
	Identifier,
	ListExpression,
	NumericLiteral,
	StringLiteral,
	Program,
} from './NodeTypes'

const builtins = fs.readFileSync(path.resolve('src', 'Builtins.js'))

/**
 * The "filterComments" function will return true when the node is not a
 * comment. Otherwise, it will return false. It's used to filter out comments.
 */
function filterComments(node: ListItem): boolean {
	return node.type !== 'BlockComment' && node.type !== 'LineComment'
}

/**
 * The "printIdentifier" function will return the name of an Identifier.
 */
function printIdentifier(node: Identifier): string {
	return node.name
}

/**
 * The "printNumericLiteral" function will return the value of a NumericLiteral
 * casted to a string.
 */
function printNumericLiteral(node: NumericLiteral): string {
	return String(node.value)
}

/**
 * The "printStringLiteral" function will return the value of a StringLiteral
 * enclosed in parens.
 */
function printStringLiteral(node: StringLiteral): string {
	return '"' + node.value + '"'
}

/**
 * The "generateFunction" function will create a JavaScript function from a
 * name, parameters and a function body.
 */
function generateFunction(name: string, params: string, body: string): string {
	return `function ${name}(${params}) { return ${body} }`
}

/**
 * The "printListExpression" function will transform a ListExpression to an
 * array, a function call, a function declaration or a Variable declaration.
 */
function printListExpression(node: ListExpression): string {
	// We filter out the comments and split the node into the first element and
	// the rest.
	const [first, ...rest] = node.items.filter(filterComments)

	// When the list is empty we return an empty array.
	if (first === undefined) {
		return '[]'
	}

	// When the list starts with anthing except an identifier we return an array
	// with the elements.
	if (first.type !== 'Identifier') {
		const listItems = [first, ...rest].map(generator).join(', ')
		return '[' + listItems + ']'
	}

	// When the name of the first element, which is an identifier, is "function"
	// we have a function declaration.
	if (first.name === 'function') {
		const [name, params, body, ...last] = rest

		if (name.type !== 'Identifier') {
			throw new Error(
				'The first argument of "function" has to be an identifier.',
			)
		}

		if (
			params.type !== 'ListExpression' ||
			params.items.some(param => param.type !== 'Identifier')
		) {
			throw new Error(
				'The second argument of "function" has to be a list with identifiers',
			)
		}

		if (last.length !== 0) {
			throw new Error('Function declaration can only have 2 arguments.')
		}

		return generateFunction(
			generator(name),
			params.items.map(generator).join(', '),
			generator(body),
		)
	}

	// When the name of the first element is "set" we have a variable
	// declaration.
	if (first.name === 'set') {
		const [name, value, ...last] = rest

		if (name.type !== 'Identifier') {
			throw new Error(
				'The first argument of "set" has to be an identifier.',
			)
		}

		if (last.length !== 0) {
			throw new Error('Variable declaration can only have 2 arguments.')
		}

		return `const ${generator(name)} = ${generator(value)}`
	}

	// Otherwise, we have a function call.
	return `${generator(first)}(${rest.map(generator).join(', ')})`
}

/**
 * The "printProgram" function will take a Program node and combines all the
 * children nodes to a program. It will also prepend all the builtin functions.
 */
function printProgram(node: Program): string {
	return (
		builtins +
		node.body
			.filter(filterComments)
			.map(generator)
			.reduce((acc, current) => acc + current + ';\n', '')
	)
}

/**
 * The "generator" function will take a Node and call the respective print
 * function.
 */
export default function generator(node: ListItem | Program): string {
	switch (node.type) {
		case 'BlockComment':
		case 'LineComment':
			return ''
		case 'Identifier':
			return printIdentifier(node)
		case 'ListExpression':
			return printListExpression(node)
		case 'NumericLiteral':
			return printNumericLiteral(node)
		case 'StringLiteral':
			return printStringLiteral(node)
		case 'Program':
			return printProgram(node)
	}
}
