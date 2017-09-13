// @flow

import {
	InputStream,
	Parser,
	ParseResult,
	ParseSuccess,
} from './Types'

import {
	emptyError,
	getParseResult,
	moveStream,
	ParserWrapper,
} from './Helpers'

export function debug<Result>(
	parser: Parser<Result>,
	title: string = parser.name,
): Parser<Result> {
	return new ParserWrapper(function parseDebug(
		stream: InputStream,
	): ParseResult<Result> {
		const parseResult: ParseResult<Result> = getParseResult(parser, stream)

		if (parseResult.success) {
			console.log(`${title} succeed: ${String(parseResult.result)}`)
		} else {
			console.log(`${title} failed`)
		}

		return parseResult
	})
}

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

export function fail<Result>(message: string): Parser<Result> {
	return new ParserWrapper(function parseFail(
		stream: InputStream,
	): ParseResult<Result> {
		return {
			success: false,
			messages: [message],
			stream,
		}
	})
}

export function succeed<Result>(result: Result): Parser<Result> {
	return new ParserWrapper(function parseSucceed(
		stream: InputStream,
	): ParseResult<Result> {
		return {
			success: true,
			result,
			stream,
		}
	})
}

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

export function mapTo<Input, Output>(
	parser: Parser<Input>,
	value: Output,
): Parser<Output> {
	return map(parser, (): Output => value)
}

export function mapError<Result>(
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

export function mapErrorTo<Result>(
	parser: Parser<Result>,
	message: string,
): Parser<Result> {
	return mapError(parser, (): Array<string> => [message])
}

// Chaining

export function andThen<Input, Output>(
	func: (input: Input) => Parser<Output>,
	parser: Parser<Input>,
): Parser<Output> {
	return new ParserWrapper(function parseAndThen(
		stream: InputStream,
	): ParseResult<Output> {
		const parseResult: ParseResult<Input> = getParseResult(parser, stream)

		if (parseResult.success) {
			const secondParser: Parser<Output> = func(parseResult.result)

			return getParseResult(secondParser, parseResult.stream)
		}

		return parseResult
	})
}

export function andMap<Input, Output>(
	parser: Parser<Input>,
	funcParser: Parser<(input: Input) => Output>,
): Parser<Output> {
	return new ParserWrapper(function parseAndMap(
		stream: InputStream,
	): ParseResult<Output> {
		const parseResult: ParseResult<Input> = getParseResult(parser, stream)

		if (parseResult.success) {
			const mapParser = map(funcParser, func => func(parseResult.result))
			return getParseResult(mapParser, parseResult.stream)
		}

		return parseResult
	})
}

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

export function sequence<Result>(
	...parsers: Array<Parser<Result>>
): Parser<Array<Result>> {
	return new ParserWrapper(function parseSequence(
		stream: InputStream,
	): ParseResult<Array<Result>> {
		function accumulate(
			prevParsers: Array<Parser<Result>>,
			prevStream: InputStream,
			prevResults: Array<Result>,
		): ParseResult<Array<Result>> {
			if (prevParsers.length === 0) {
				return {
					success: true,
					result: prevResults,
					stream: prevStream,
				}
			}

			const [currentParser, ...remainingParsers] = prevParsers
			const currentResult = getParseResult(currentParser, prevStream)

			if (currentResult.success) {
				return accumulate(remainingParsers, currentResult.stream, [
					...prevResults,
					currentResult.result,
				])
			}

			return currentResult
		}

		return accumulate(parsers, stream, [])
	})
}

// Parser Combinators

export function lookAhead<Result>(parser: Parser<Result>): Parser<Result> {
	return new ParserWrapper(function parseLookAhead(
		stream: InputStream,
	): ParseResult<Result> {
		const result: ParseResult<Result> = getParseResult(parser, stream)

		if (result.success) {
			return {
				...result,
				stream,
			}
		}

		return {
			...result,
			stream,
		}
	})
}

export function until(predicate: (char: string) => boolean): Parser<string> {
	return new ParserWrapper(function parseUntil(
		stream: InputStream,
	): ParseResult<string> {
		function accumulate(
			prevStream: InputStream,
			prevResult: string,
		): ParseSuccess<string> {
			if (prevStream.input === '') {
				return {
					success: true,
					result: prevResult,
					stream: prevStream,
				}
			}

			const head: string = prevStream.input.charAt(0)

			if (predicate(head)) {
				return accumulate(moveStream(prevStream, 1), prevResult + head)
			}

			return {
				success: true,
				result: prevResult,
				stream: prevStream,
			}
		}

		return accumulate(stream, '')
	})
}

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

export function optional<Result>(
	defaultValue: Result,
	parser: Parser<Result>,
): Parser<Result> {
	return or(parser, succeed(defaultValue))
}

export function maybe<Result>(parser: Parser<Result>): Parser<Result | null> {
	return new ParserWrapper(function parseMaybe(
		stream: InputStream,
	): ParseResult<Result | null> {
		const result: ParseResult<Result> = getParseResult(parser, stream)

		if (result.success) {
			return result
		}

		return {
			success: true,
			result: null,
			stream,
		}
	})
}

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

export function seperateBy<Result, Seperate>(
	parser: Parser<Result>,
	seperateParser: Parser<Seperate>,
	options: {
		atLeastOnce: boolean
		optionallyEnd: boolean
	} = {
		atLeastOnce: false,
		optionallyEnd: false,
	},
): Parser<Array<Result>> {
	const atLeastOnce: boolean = options.atLeastOnce
	const optionallyEnd: boolean = options.optionallyEnd

	const sepBy1 = andMap(
		parser,
		map(
			many(ignoreLeft(seperateParser, parser)),
			(tail: Result[]) => (head: Result): Result[] => [head, ...tail],
		),
	)

	if (optionallyEnd) {
		const sepEndBy1 = ignoreRight(sepBy1, maybe(seperateParser))

		if (atLeastOnce) {
			return sepEndBy1
		}

		return or(sepEndBy1, succeed([]))
	}

	if (atLeastOnce) {
		return sepBy1
	}

	return or(sepBy1, succeed([]))
}

export function skip<Result>(parser: Parser<Result>): Parser<null> {
	return mapTo(parser, null)
}

export function skipMany<Result>(
	parser: Parser<Result>,
	options: {
		atLeastOnce: boolean
	} = {
		atLeastOnce: false,
	},
): Parser<null> {
	return mapTo(many(parser, options), null)
}

export function count<Result>(
	amount: number,
	parser: Parser<Result>,
): Parser<Array<Result>> {
	function accumulate(
		prevAmount: number,
		prevResults: Array<Result>,
	): Parser<Array<Result>> {
		if (prevAmount <= 0) {
			return succeed(prevResults)
		}

		return andThen(function(currResult) {
			return accumulate(prevAmount - 1, [...prevResults, currResult])
		}, parser)
	}

	return accumulate(amount, [])
}

export function between<Left, Right, Result>(
	leftParser: Parser<Left>,
	rightParser: Parser<Right>,
	parser: Parser<Result>,
): Parser<Result> {
	return ignoreLeft(leftParser, ignoreRight(parser, rightParser))
}

export function parens<Result>(parser: Parser<Result>): Parser<Result> {
	return between(string('('), string(')'), parser)
}

export function braces<Result>(parser: Parser<Result>): Parser<Result> {
	return between(string('{'), string('}'), parser)
}

export function brackets<Result>(parser: Parser<Result>): Parser<Result> {
	return between(string('['), string(']'), parser)
}
