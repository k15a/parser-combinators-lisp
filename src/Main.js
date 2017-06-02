// @flow

import type { Parser } from './Combinators/Types.js'
import * as Char from './Combinators/Character.js'
import * as Num from './Combinators/Number.js'

import runParser, {
	between,
	choice,
	debug,
	end,
	ignoreLeft,
	ignoreRight,
	many,
	manyTill,
	map,
	mapTo,
	maybe,
	parens,
	regex,
	seperateBy,
	string,
	whitespace,
} from './Combinators/Combinators.js'

import type { Node, Program } from './NodeTypes.js'

type State = void

function blockComment(): Parser<State, Node> {
	const blockCommentParser: Parser<State, Array<string>> = ignoreLeft(
		string('#|'),
		manyTill(Char.anyChar, string('|#')),
	)
	function mapBlockCommentToNode(values: Array<string>): Node {
		return {
			type: 'block_comment',
			value: values.join(''),
		}
	}

	return map(blockCommentParser, mapBlockCommentToNode)
}

function expression(): Parser<State, Node> {
	const parsers: Array<Parser<State, Node>> = [
		blockComment,
		identifier,
		lineComment,
		listExpression,
		numericLiteral,
		stringLiteral,
	]

	return ignoreLeft(
		whitespace(),
		ignoreRight(choice(...parsers), whitespace()),
	)
}

function identifier(): Parser<State, Node> {
	const identifierParser: Parser<State, string> = regex(/[a-zA-Z_]\w*/)
	function mapIdentifierToNode(result: string): Node {
		return {
			type: 'identifier',
			name: result,
		}
	}
	return map(identifierParser, mapIdentifierToNode)
}

function lineComment(): Parser<State, Node> {
	const lineCommentParser: Parser<State, Array<string>> = ignoreLeft(
		string(';'),
		manyTill(Char.anyChar, choice(mapTo(Char.eol, null), end)),
	)
	function mapLineCommentToNode(values: Array<string>): Node {
		return {
			type: 'line_comment',
			value: values.join(''),
		}
	}

	return map(lineCommentParser, mapLineCommentToNode)
}

function listExpression(): Parser<State, Node> {
	const listExpressionParser: Parser<State, Array<Node>> = parens(
		many(expression),
	)
	function mapListExpressionToNode(elements: Array<Node>): Node {
		return {
			type: 'list_expression',
			elements,
		}
	}

	return map(listExpressionParser, mapListExpressionToNode)
}

function numericLiteral(): Parser<State, Node> {
	const numericLiteralParser: Parser<State, number> = choice(
		Num.integer,
		Num.float,
	)
	function mapNumericLiteralToNode(value: number): Node {
		return {
			type: 'numeric_literal',
			value,
		}
	}

	return map(numericLiteralParser, mapNumericLiteralToNode)
}

function program(): Parser<State, Node> {
	const programParser = manyTill(expression, end)
	function mapProgramToNode(body: Array<Node>): Node {
		return {
			type: 'program',
			body,
		}
	}

	return map(programParser, mapProgramToNode)
}

function stringLiteral(): Parser<State, Node> {
	const stringLiteralParser: Parser<State, string> = map(
		regex(/"(\"|[^"])+"/),
		str => str.slice(1, -1),
	)
	function mapStringLiteralToNode(value: string): Node {
		return {
			type: 'string_literal',
			value,
		}
	}

	return map(stringLiteralParser, mapStringLiteralToNode)
}

function parse(input: string): Program {
	const parser = runParser(program)
	const parseResult = parser(input)

	if (parseResult.success) {
		return parseResult.result
	}

	throw new Error(parseResult)
}

function transform(node: Node): Node {
	switch (node.type) {
		case 'block_comment': {
			return node
		}
		case 'identifier': {
			return node
		}
		case 'line_comment': {
			return node
		}
		case 'list_expression': {
			const [head, ...tail] = node.elements

			if (head.type === 'identifier') {
				return {
					type: 'call_expression',
					callee: head,
					arguments: tail.map(transform),
				}
			}

			return node
		}
		case 'numeric_literal': {
			return node
		}
		case 'program': {
			const body = node.body.map(transform)

			return {
				type: 'program',
				body,
			}
		}
		case 'string_literal': {
			return node
		}
	}

	throw new Error(`Can't transform ${node.type}`)
}

function generator(node: Node): string {
	switch (node.type) {
		case 'block_comment': {
			return `/*${node.value}*/`
		}
		case 'call_expression': {
			const callee = generator(node.callee)
			const args = node.arguments.map(generator).join(', ')

			return `${callee}(${args})`
		}
		case 'identifier': {
			return node.name
		}
		case 'line_comment': {
			return `//${node.value}`
		}
		case 'list_expression': {
			const elements = node.elements.map(generator).join(', ')
			return `[${elements}]`
		}
		case 'numeric_literal': {
			return String(node.value)
		}
		case 'program': {
			return node.body.map(generator).join(';\n\n')
		}
		case 'string_literal': {
			return `"${node.value}"`
		}
	}

	throw new Error(`Can't stringify ${node.type}`)
}

function compiler(input) {
	const ast: Node = parse(input)
	const transformedAst: Node = transform(ast)
	const output: string = generator(transformedAst)

	return output
}

const output = compiler(`
	; Hello World

	(hello 123 #| Hello How Are You
		Fucking Multi Line Comment


	|# world)

	(map 1 2 3)
	(moin (moin ("moin") (1 2 3)) 2 3 4)
`)

console.log(output)
