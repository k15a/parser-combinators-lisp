// @flow

import { InputStream, Parser, ParseResult } from './Types'

export function emptyError<Result>(): Parser<Result> {
	return new ParserWrapper(function parseEmptyError(
		stream: InputStream,
	): ParseResult<Result> {
		return {
			success: false,
			messages: [],
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

export function getParseResult<Result>(
	parser: Parser<Result>,
	stream: InputStream,
): ParseResult<Result> {
	if (parser instanceof ParserWrapper) {
		return parser.run(stream)
	}

	if (typeof parser === 'function') {
		return getParseResult(parser(), stream)
	}

	throw new Error(`Cant't handle ${parser}`)
}

export class ParserWrapper<Result> {
	parser: (input: InputStream) => ParseResult<Result>
	name: string

	constructor(parser: (input: InputStream) => ParseResult<Result>) {
		this.parser = parser
		this.name = parser.name
	}

	run(input: InputStream): ParseResult<Result> {
		return this.parser(input)
	}
}
