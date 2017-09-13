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

const builtins = fs.readFileSync(path.join(__dirname, './Builtins.js'))

function filterComments(node: ListItem) {
	return node.type !== 'BlockComment' && node.type !== 'LineComment'
}

function printIdentifier(node: Identifier): string {
	return node.name
}

function printNumericLiteral(node: NumericLiteral): string {
	return String(node.value)
}

function printStringLiteral(node: StringLiteral): string {
	return '"' + node.value + '"'
}

function generateFunction(name: string, params: string, body: string): string {
	return `function ${name}(${params}) { return ${body} }`
}

function printListExpression(node: ListExpression): string {
	const [first, ...rest] = node.items.filter(filterComments)

	if (first === undefined) {
		return '[]'
	}

	if (first.type !== 'Identifier') {
		const listItems = [first, ...rest].map(generator).join(', ')
		return '[' + listItems + ']'
	}

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

	return `${generator(first)}(${rest.map(generator).join(', ')})`
}

function printProgram(node: Program): string {
	return (
		builtins +
		node.body
			.filter(filterComments)
			.map(generator)
			.reduce((acc, current) => acc + current + ';\n', '')
	)
}

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
