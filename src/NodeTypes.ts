export type Expression = BlockComment | LineComment | ListExpression

export interface BlockComment {
	type: 'BlockComment'
	comment: string
}

export interface LineComment {
	type: 'LineComment'
	comment: string
}

export type ListItem = Expression | Identifier | NumericLiteral | StringLiteral

export interface Identifier {
	type: 'Identifier'
	name: string
}

export interface NumericLiteral {
	type: 'NumericLiteral'
	value: number
}

export interface StringLiteral {
	type: 'StringLiteral'
	value: string
}

export interface ListExpression {
	type: 'ListExpression'
	items: Array<ListItem>
}

export interface Program {
	type: 'Program'
	body: Array<Expression>
}
