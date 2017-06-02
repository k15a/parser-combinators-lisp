// @flow

import type { InputStream, Parser, ParseResult } from './Types.js'

export function emptyError<State, Result>(): Parser<State, Result> {
	return new ParserWrapper(function parseEmptyError(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result> {
		return {
			success: false,
			message: [],
			state,
			stream,
		}
	})
}

export function moveStream(stream: InputStream, length: number): InputStream {
	return {
		...stream,
		position: stream.position + length,
		input: stream.input.slice(length),
	}
}

export function getParseResult<State, Result>(
	parser: Parser<State, Result>,
	state: State,
	stream: InputStream,
): ParseResult<State, Result> {
	if (parser instanceof ParserWrapper) {
		return parser.run(state, stream)
	}

	if (typeof parser === 'function') {
		return getParseResult(parser(), state, stream)
	}

	throw new Error(`Cant't handle ${parser}`)
}

export class ParserWrapper<State, Result> {
	parser: (State, InputStream) => ParseResult<State, Result>
	name: string

	constructor(parser: (State, InputStream) => ParseResult<State, Result>) {
		this.parser = parser
		this.name = parser.name
	}

	run(state: State, input: InputStream): ParseResult<State, Result> {
		return this.parser(state, input)
	}
}
