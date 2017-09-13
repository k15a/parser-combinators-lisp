// @flow

import * as chalk from 'chalk'

import { Parser, ParseFailure, InputStream } from './Combinators/Types'
import * as Char from './Combinators/Character'
import * as Num from './Combinators/Number'

import createParser, {
	choice,
	end,
	ignoreLeft,
	ignoreRight,
	many,
	manyTill,
	map,
	mapErrorTo,
	mapTo,
	parens,
	regex,
	string,
	whitespace,
} from './Combinators/Combinators'

import {
	Expression,
	BlockComment,
	LineComment,
	Identifier,
	ListItem,
	NumericLiteral,
	StringLiteral,
	ListExpression,
	Program,
} from './NodeTypes'

import generator from './Generator'

function blockComment(): Parser<BlockComment> {
	const blockCommentParser: Parser<Array<string>> = ignoreLeft(
		string('#|'),
		manyTill(Char.anyChar, string('|#')),
	)

	function mapBlockCommentToNode(chars: Array<string>): BlockComment {
		return {
			type: 'BlockComment',
			comment: chars.join(''),
		}
	}

	return map(blockCommentParser, mapBlockCommentToNode)
}

function lineComment(): Parser<LineComment> {
	const lineCommentParser: Parser<Array<string>> = ignoreLeft(
		string(';'),
		manyTill(Char.anyChar, choice(mapTo(Char.eol, null), end)),
	)

	function mapLineCommentToNode(chars: Array<string>): LineComment {
		return {
			type: 'LineComment',
			comment: chars.join(''),
		}
	}

	return map(lineCommentParser, mapLineCommentToNode)
}

function identifier(): Parser<Identifier> {
	const identifierParser: Parser<string> = regex(/[a-zA-Z_]\w*/)

	function mapIdentifierToNode(name: string): Identifier {
		return {
			type: 'Identifier',
			name,
		}
	}

	return map(identifierParser, mapIdentifierToNode)
}

function numericLiteral(): Parser<NumericLiteral> {
	const numericLiteralParser: Parser<number> = choice(Num.integer, Num.float)

	function mapNumericLiteralToNode(value: number): NumericLiteral {
		return {
			type: 'NumericLiteral',
			value,
		}
	}

	return map(numericLiteralParser, mapNumericLiteralToNode)
}

function stringLiteral(): Parser<StringLiteral> {
	const stringLiteralParser: Parser<Array<string>> = ignoreLeft(
		string('"'),
		manyTill(Char.anyChar, string('"')),
	)

	function mapStringLiteralToNode(chars: Array<string>): StringLiteral {
		return {
			type: 'StringLiteral',
			value: chars.join(''),
		}
	}

	return map(stringLiteralParser, mapStringLiteralToNode)
}

function listExpression(): Parser<ListExpression> {
	const listExpressionParser: Parser<Array<ListItem>> = parens(many(listItem))

	function mapListExpressionToNode(items: Array<ListItem>): ListExpression {
		return {
			type: 'ListExpression',
			items,
		}
	}

	return map(listExpressionParser, mapListExpressionToNode)
}

function listItem(): Parser<ListItem> {
	const parsers: Array<Parser<ListItem>> = [
		expression,
		identifier,
		numericLiteral,
		stringLiteral,
	]

	return mapErrorTo(
		ignoreLeft(whitespace(), ignoreRight(choice(...parsers), whitespace())),
		'Expected an identifier, a number, a string or another list',
	)
}

function expression(): Parser<Expression> {
	const parsers: Array<Parser<Expression>> = [
		blockComment,
		lineComment,
		listExpression,
	]

	return mapErrorTo(
		ignoreLeft(whitespace(), ignoreRight(choice(...parsers), whitespace())),
		'Expected a list or a comment',
	)
}

function program(): Parser<Program> {
	const programParser = manyTill(expression, end)

	function mapProgramToNode(body: Array<Expression>): Program {
		return {
			type: 'Program',
			body,
		}
	}

	return map(programParser, mapProgramToNode)
}

function transformPosition({ data, position }: InputStream): [number, number] {
	let column = position
	const lines = data.split(/(?:\x0D\n|\n)/)

	for (const [index, line] of lines.entries()) {
		if (column <= line.length) {
			return [index + 1, column]
		}

		column = column - line.length
	}

	return [0, 0]
}

function printError(error: ParseFailure): string {
	const [line, column] = transformPosition(error.stream)
	const position = chalk.cyan(line + ':' + column)
	const title = `There was an error at position ${position}`
	const message = error.messages
		.map(message => {
			return '  — ' + chalk.red(message)
		})
		.join('\n')
	return title + '\n\n' + message
}

function parse(input: string): Program {
	const parser = createParser(program)
	const parseResult = parser(input)

	if (parseResult.success) {
		return parseResult.result
	}

	throw new Error(printError(parseResult))
}

function compiler(input: string): string {
	const ast = parse(input)
	return generator(ast)
}

function run(code: string) {
	eval(code)
}

const output = compiler(`
	; Hello World

	(log "Hello World")
`)

run(output)
