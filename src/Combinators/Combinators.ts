import { InputStream, Parser, ParseResult } from './Types'

import {
	emptyError,
	getParseResult,
	moveStream,
	ParserWrapper,
} from './Helpers'

// Running Parsers

function initStream(input: string): InputStream {
	return {
		input,
		data: input,
		position: 0,
	}
}

export default function createParser<Result>(
	parser: Parser<Result>,
): (input: string) => ParseResult<Result> {
	return function runParser(input: string): ParseResult<Result> {
		const stream: InputStream = initStream(input)

		return getParseResult(parser, stream)
	}
}

// Parsers

/**
 * The "string" parser will match a given string.
 */
export function string(expectedString: string): ParserWrapper<string> {
	return new ParserWrapper(function parseString(
		stream: InputStream,
	): ParseResult<string> {
		if (stream.input.startsWith(expectedString)) {
			return {
				success: true,
				result: expectedString,
				stream: moveStream(stream, expectedString.length),
			}
		}

		return {
			success: false,
			messages: [`Expected "${expectedString}"`],
			stream,
		}
	})
}

/**
 * The "regex" parser will match a given regex.
 */
export function regex(pattern: RegExp): ParserWrapper<string> {
	const source: string = pattern.source
	const flags: string = pattern.flags

	const newSource: string = source.startsWith('^') ? source : `^${source}`
	const newFlags = flags.replace(/m|g/g, '')

	const newPattern: RegExp = new RegExp(newSource, newFlags)

	return new ParserWrapper(function parseRegex(
		stream: InputStream,
	): ParseResult<string> {
		const match = newPattern.exec(stream.input)

		if (match) {
			const value: string = match[0]

			return {
				success: true,
				result: value,
				stream: moveStream(stream, value.length),
			}
		}

		return {
			success: false,
			messages: [`Expected to match regex ${newPattern.toString()}`],
			stream,
		}
	})
}

/**
 * The end parser will match the end of the input.
 */
export function end(): Parser<null> {
	return new ParserWrapper(function parseEnd(
		stream: InputStream,
	): ParseResult<null> {
		if (stream.input === '') {
			return {
				success: true,
				result: null,
				stream,
			}
		}

		return {
			success: false,
			messages: ['Expected end of input'],
			stream,
		}
	})
}

/**
 * The "whitespace" parser will match any whitespace
 */
export function whitespace(
	options: {
		atLeastOnce: boolean
	} = {
		atLeastOnce: false,
	},
): Parser<string> {
	const atLeastOnce: boolean = options.atLeastOnce
	const pattern: RegExp = atLeastOnce ? /\s+/ : /\s*/

	return mapErrorTo(regex(pattern), 'Expected whitespace')
}

// Combinators

/**
 * The "map" parser takes a parser and a map function. If the given parser
 * succeeds it will run the map function over the parse result.
 */
export function map<Input, Output>(
	parser: Parser<Input>,
	func: (input: Input) => Output,
): Parser<Output> {
	return new ParserWrapper(function parseMap(
		stream: InputStream,
	): ParseResult<Output> {
		const parseResult: ParseResult<Input> = getParseResult(parser, stream)

		if (parseResult.success) {
			return {
				...parseResult,
				result: func(parseResult.result),
			}
		}

		return parseResult
	})
}

/**
 * The "mapTo" parser takes a parser and a value. If the given parser succeeds
 * it will map the result to the value.
 */
export function mapTo<Input, Output>(
	parser: Parser<Input>,
	value: Output,
): Parser<Output> {
	return map(parser, (): Output => value)
}

/**
 * The "mapError" parser takes a parser and a map function. If the given parser
 * fails it will run the map function over the error messages.
 */
function mapError<Result>(
	parser: Parser<Result>,
	func: (errors: Array<string>) => Array<string>,
): Parser<Result> {
	return new ParserWrapper(function parseMapError(
		stream: InputStream,
	): ParseResult<Result> {
		const parseResult: ParseResult<Result> = getParseResult(parser, stream)

		if (parseResult.success) {
			return parseResult
		}

		return {
			...parseResult,
			messages: func(parseResult.messages),
		}
	})
}

/**
 * The "mapErrorTo" parser takes a parser and an error message. If the given
 * parser fails it will map the error message to the given error message.
 */
export function mapErrorTo<Result>(
	parser: Parser<Result>,
	message: string,
): Parser<Result> {
	return mapError(parser, (): Array<string> => [message])
}

// Chaining

/**
 * The "ignoreLeft" parser will take two parser. It will run the parsers in a
 * chain while ignoring the result of the first parser.
 */
export function ignoreLeft<Left, Right>(
	leftParser: Parser<Left>,
	rightParser: Parser<Right>,
): Parser<Right> {
	return new ParserWrapper(function parseIgnoreLeft(
		stream: InputStream,
	): ParseResult<Right> {
		const leftResult: ParseResult<Left> = getParseResult(leftParser, stream)

		if (leftResult.success) {
			return getParseResult(rightParser, leftResult.stream)
		}

		return leftResult
	})
}

/**
 * The "ignoreRight" parser will take two parser. It will run the parsers in a
 * chain while ignoring the result of the second parser.
 */
export function ignoreRight<Left, Right>(
	leftParser: Parser<Left>,
	rightParser: Parser<Right>,
): Parser<Left> {
	return new ParserWrapper(function parseIgnoreRight(
		stream: InputStream,
	): ParseResult<Left> {
		const leftResult: ParseResult<Left> = getParseResult(leftParser, stream)

		if (leftResult.success) {
			const rightResult: ParseResult<Right> = getParseResult(
				rightParser,
				leftResult.stream,
			)

			if (rightResult.success) {
				return {
					...rightResult,
					result: leftResult.result,
				}
			}

			return rightResult
		}

		return leftResult
	})
}

// Parser Combinators

/**
 * The "or" parser takes two parsers. It will try the first parser and if it
 * fails it will try the second one.
 */
export function or<Result>(
	leftParser: Parser<Result>,
	rightParser: Parser<Result>,
): Parser<Result> {
	return new ParserWrapper(function parseOr(
		stream: InputStream,
	): ParseResult<Result> {
		const leftResult: ParseResult<Result> = getParseResult(
			leftParser,
			stream,
		)

		if (leftResult.success) {
			return leftResult
		}

		const rightResult: ParseResult<Result> = getParseResult(
			rightParser,
			stream,
		)

		if (rightResult.success) {
			return rightResult
		}

		return {
			success: false,
			messages: [...leftResult.messages, ...rightResult.messages],
			stream,
		}
	})
}

/**
 * The "choice" parser takes a multiple parsers. It will combine them with the
 * "or" parser.
 */
export function choice<Result>(
	...parsers: Array<Parser<Result>>
): Parser<Result> {
	function accumulate(
		prevResult: Parser<Result>,
		prevParsers: Array<Parser<Result>>,
	): Parser<Result> {
		if (prevParsers.length === 0) {
			return prevResult
		}

		const [currentParser, ...remainingParsers] = prevParsers

		return accumulate(or(prevResult, currentParser), remainingParsers)
	}

	return accumulate(emptyError, parsers)
}

/**
 * The "many" parser takes a parser and will run the parser until it fails. Then
 * it will succeed with the accumulated results.
 */
export function many<Result>(
	parser: Parser<Result>,
	options: {
		atLeastOnce: boolean
	} = {
		atLeastOnce: false,
	},
): Parser<Array<Result>> {
	const atLeastOnce: boolean = options.atLeastOnce

	return new ParserWrapper(function parseMany(
		stream: InputStream,
	): ParseResult<Array<Result>> {
		function accumulate(
			prevStream: InputStream,
			prevResult: Array<Result>,
		): ParseResult<Array<Result>> {
			const currentResult = getParseResult(parser, prevStream)

			if (currentResult.success) {
				return accumulate(currentResult.stream, [
					...prevResult,
					currentResult.result,
				])
			}

			return {
				success: true,
				result: prevResult,
				stream: prevStream,
			}
		}

		if (atLeastOnce) {
			const requiredResult: ParseResult<Result> = getParseResult(
				parser,
				stream,
			)

			if (requiredResult.success) {
				const optionalResult = accumulate(requiredResult.stream, [])

				if (optionalResult.success) {
					return {
						...optionalResult,
						result: [
							requiredResult.result,
							...optionalResult.result,
						],
					}
				}

				return optionalResult
			}

			return requiredResult
		}

		return accumulate(stream, [])
	})
}

/**
 * The "manyTill" parser takes two parsers. It will try the first parser as long
 * as the second parser fails. It will return the accumulated results.
 */
export function manyTill<Result, End>(
	parser: Parser<Result>,
	endParser: Parser<End>,
): Parser<Array<Result>> {
	return new ParserWrapper(function parseManyTill(
		stream: InputStream,
	): ParseResult<Array<Result>> {
		function accumulate(
			prevStream: InputStream,
			prevResult: Array<Result>,
		): ParseResult<Array<Result>> {
			const endResult: ParseResult<End> = getParseResult(
				endParser,
				prevStream,
			)

			if (endResult.success) {
				return {
					success: true,
					result: prevResult,
					stream: endResult.stream,
				}
			}

			const currentResult: ParseResult<Result> = getParseResult(
				parser,
				prevStream,
			)

			if (currentResult.success) {
				return accumulate(currentResult.stream, [
					...prevResult,
					currentResult.result,
				])
			}

			return {
				...currentResult,
				messages: [...currentResult.messages, ...endResult.messages],
			}
		}

		return accumulate(stream, [])
	})
}

/**
 * The "between" parser will take three parser. It will run the first parser
 * then the third and then the second one ignoring the result of the first and
 * second parser.
 */
function between<Left, Right, Result>(
	leftParser: Parser<Left>,
	rightParser: Parser<Right>,
	parser: Parser<Result>,
): Parser<Result> {
	return ignoreLeft(leftParser, ignoreRight(parser, rightParser))
}

/**
 * The "parens" parser take a parser and runs it in between of two parens.
 */
export function parens<Result>(parser: Parser<Result>): Parser<Result> {
	return between(string('('), string(')'), parser)
}
