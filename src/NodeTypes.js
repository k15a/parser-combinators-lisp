type Node =
	| BlockComment
	| FunctionDeclaration
	| Identifier
	| LineComment
	| ListExpression
	| NumericLiteral
	| Program
	| StringLiteral

type BlockComment = {
	type: 'block_comment',
	value: string,
}

type CallExpression = {
	type: 'call_expression',
	callee: Node,
	arguments: Array<Node>,
}

type Identifier = {
	type: 'identifier',
	name: string,
}

type LineComment = {
	type: 'line_comment',
	value: string,
}

type ListExpression = {
	type: 'list_expression',
	elements: Array<Node>,
}

type NumericLiteral = {
	type: 'numeric_literal',
	value: number,
}

type Program = {
	type: 'program',
	body: Array<Node>,
}

type StringLiteral = {
	type: 'string_literal',
	value: string,
}
