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

/**
 * The "blockComment" parser is a combination of 2 "string" parsers which will
 * parse the beginning and the end of a block comment and an "anyChar" parser
 * which will parse the content of the comment.
 *
 * Example:
 * #| This is a block
 *    Comment
 * |#
 */
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

/**
 * The "lineComment" is a combination of a "string" parser which will parse the
 * beginning of a line comment, a "eol" parser which will parse the end of the
 * comment and a "anyChar" parser which will parse the content of the comment.
 *
 * Example:
 * ; A really cool line comment
 */
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

/**
 * The "identifier" parser is a "regex" parser which will match any identifier.
 *
 * Example:
 * log
 * map
 * split
 */
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

/**
 * The "numericLiteral" parser is a combination of the "integer" and "float"
 * parser.
 *
 * Example:
 * 42
 * 3.14
 */
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

/**
 * The "stringLiteral" parser is a combination of 2 "string" parsers which are
 * parsing the beginning and the end of a string and an "anyChar" parser which
 * will parse the content of the string. Currently the parser can't handle
 * escaped quotes in a string.
 *
 * Example:
 * "string"
 */
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

/**
 * The "ListExpression" parser is a combination of a "parens" parser which will
 * wrap a "many" parser which will parse many instances of a "listItem" parser.
 *
 * Example:
 * (1 2 3)
 * (log "Hello World")
 */
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

/**
 * The "listItem" parser will parse an expression, identifier, numericLiteral
 * or stringLiteral in between of any whitespace.
 *
 * Example:
 *    1
 * "string"
 */
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

/**
 * The "expression" parser will parse a blockComment, lineComment or
 * listExpression in between of any whitespace.
 *
 * Example:
 *    1
 * "string"
 *   ; comment
 */
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

/**
 * The "program" parser will parse any amount of expressions until the end of
 * the input.
 */
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

/**
 * The "transformPosition" function takes an input stream and will return a
 * tuple of the current line and column.
 */
function transformPosition({ data, position }: InputStream): [number, number] {
	let column = position
	const lines = data.split(/(?:\r\n|\n)/)

	for (const [index, line] of lines.entries()) {
		if (column <= line.length) {
			return [index + 1, column]
		}

		column = column - line.length
	}

	return [0, 0]
}

/**
 * The "printError" function takes a ParseFailure and returns a pretty printed
 * error message.
 */
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

export default function parse(input: string): Program {
	const parser = createParser(program)
	const parseResult = parser(input)

	if (parseResult.success) {
		return parseResult.result
	}

	throw new Error(printError(parseResult))
}
