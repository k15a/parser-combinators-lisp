import { InputStream, Parser, ParseResult } from './Types'

/**
 * The "emptyError" parser will always fail with no error message. It's usefull
 * to accumulate errors.
 */
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

/**
 * The "moveStream" function takes an input stream and a length <l> and will
 * return the input stream moved forward by <l> characters.
 */
export function moveStream(stream: InputStream, length: number): InputStream {
	return {
		...stream,
		position: stream.position + length,
		input: stream.input.slice(length),
	}
}

/**
 * The "getParseResult" function takes a parser or a lazy parser and an input
 * stream. If the input is a parser it will call the parser with the input
 * stream and it will return the parse result. If the input is a lazy parser it
 * recursivly calls itself until it has a parse result.
 */
export function getParseResult<Result>(
	parser: Parser<Result>,
	stream: InputStream,
): ParseResult<Result> {
	if (parser instanceof ParserWrapper) {
		return parser.run(stream)
	}

	return getParseResult(parser(), stream)
}

/**
 * The "ParserWrapper" class will wrap a parser so we can check it's instances
 * later in "getParseResult".
 */
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
