// @flow

import type {
	InputStream,
	LazyParser,
	ParseFailure,
	Parser,
	ParseResult,
	ParseSuccess,
} from './Types.js'

import {
	emptyError,
	getParseResult,
	moveStream,
	ParserWrapper,
} from './Helpers.js'

export function debug<State, Result>(
	parser: Parser<State, Result>,
	title?: string = parser.name,
): Parser<State, Result> {
	return new ParserWrapper(function parseDebug(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result> {
		const input: string = stream.input
		const parseResult: ParseResult<State, Result> = getParseResult(
			parser,
			state,
			stream,
		)
		const output: string = parseResult.stream.input

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

export default function parse<State, Result>(
	parser: Parser<State, Result>,
	state: State,
): (input: string) => ParseResult<State, Result> {
	return function runParser(input: string): ParseResult<State, Result> {
		const stream: InputStream = initStream(input)

		return getParseResult(parser, state, stream)
	}
}

// Parsers

export function fail<State, Result>(message: string): Parser<State, Result> {
	return new ParserWrapper(function parseFail(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result> {
		return {
			success: false,
			message: [message],
			state,
			stream,
		}
	})
}

export function succeed<State, Result>(result: Result): Parser<State, Result> {
	return new ParserWrapper(function parseSucceed(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result> {
		return {
			success: true,
			result,
			state,
			stream,
		}
	})
}

export function string<State>(
	expectedString: string,
): ParserWrapper<State, string> {
	return new ParserWrapper(function parseString(
		state: State,
		stream: InputStream,
	): ParseResult<State, string> {
		if (stream.input.startsWith(expectedString)) {
			return {
				success: true,
				result: expectedString,
				stream: moveStream(stream, expectedString.length),
				state,
			}
		}

		return {
			success: false,
			message: [`Expected "${expectedString}"`],
			state,
			stream,
		}
	})
}

export function regex<State>(pattern: RegExp): ParserWrapper<State, string> {
	const source: string = pattern.source
	const flags: string = pattern.flags

	const newSource: string = source.startsWith('^') ? source : `^${source}`
	const newFlags: RegExp$flags = (flags.replace(/m|g/g, ''): any)

	const newPattern: RegExp = new RegExp(newSource, newFlags)

	return new ParserWrapper(function parseRegex(
		state: State,
		stream: InputStream,
	): ParseResult<State, string> {
		const match = newPattern.exec(stream.input)

		if (match) {
			const value: string = match[0]

			return {
				success: true,
				result: value,
				stream: moveStream(stream, value.length),
				state,
			}
		}

		return {
			success: false,
			message: [`Expected to match regex ${newPattern.toString()}`],
			state,
			stream,
		}
	})
}

export function end<State>(): Parser<State, null> {
	return new ParserWrapper(function parseEnd(
		state: State,
		stream: InputStream,
	): ParseResult<State, null> {
		if (stream.input === '') {
			return {
				success: true,
				result: null,
				state,
				stream,
			}
		}

		return {
			success: false,
			message: ['Expected end of input'],
			state,
			stream,
		}
	})
}

export function whitespace<State>(options?: {
	atLeastOnce?: boolean,
}): Parser<State, string> {
	const atLeastOnce: boolean | void = options && options.atLeastOnce
	const pattern: RegExp = atLeastOnce ? /\s+/ : /\s*/

	return mapErrorTo(regex(pattern), 'Expected whitespace')
}

// Combinators

export function map<State, Input, Output>(
	parser: Parser<State, Input>,
	fn: Input => Output,
): Parser<State, Output> {
	return new ParserWrapper(function parseMap(
		state: State,
		stream: InputStream,
	): ParseResult<State, Output> {
		const parseResult: ParseResult<State, Input> = getParseResult(
			parser,
			state,
			stream,
		)

		if (parseResult.success) {
			return {
				...parseResult,
				result: fn(parseResult.result),
			}
		}

		return parseResult
	})
}

export function mapTo<State, Input, Output>(
	parser: Parser<State, Input>,
	value: Output,
): Parser<State, Output> {
	return map(parser, (): Output => value)
}

export function mapError<State, Result>(
	parser: Parser<State, Result>,
	fn: Array<string> => Array<string>,
): Parser<State, Result> {
	return new ParserWrapper(function parseMapError(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result> {
		const parseResult: ParseResult<State, Result> = getParseResult(
			parser,
			state,
			stream,
		)

		if (parseResult.success) {
			return parseResult
		}

		return {
			...parseResult,
			message: fn(parseResult.message),
		}
	})
}

export function mapErrorTo<State, Result>(
	parser: Parser<State, Result>,
	message: string,
): Parser<State, Result> {
	return mapError(parser, (): Array<string> => [message])
}

// Chaining

export function andThen<State, Input, Output>(
	fn: Input => Parser<State, Output>,
	parser: Parser<State, Input>,
): Parser<State, Output> {
	return new ParserWrapper(function parseAndThen(
		state: State,
		stream: InputStream,
	): ParseResult<State, Output> {
		const parseResult: ParseResult<State, Input> = getParseResult(
			parser,
			state,
			stream,
		)

		if (parseResult.success) {
			const secondParser: Parser<State, Output> = fn(parseResult.result)

			return getParseResult(
				secondParser,
				parseResult.state,
				parseResult.stream,
			)
		}

		return parseResult
	})
}

export function andMap<State, Input, Output>(
	parser: Parser<State, Input>,
	funcParser: Parser<State, (Input) => Output>,
): Parser<State, Output> {
	return new ParserWrapper(function parseAndMap(
		state: State,
		stream: InputStream,
	): ParseResult<State, Output> {
		const parseResult: ParseResult<State, Input> = getParseResult(
			parser,
			state,
			stream,
		)

		if (parseResult.success) {
			const mapParser = map(funcParser, fn => fn(parseResult.result))
			return getParseResult(
				mapParser,
				parseResult.state,
				parseResult.stream,
			)
		}

		return parseResult
	})
}

export function ignoreLeft<State, Left, Right>(
	leftParser: Parser<State, Left>,
	rightParser: Parser<State, Right>,
): Parser<State, Right> {
	return new ParserWrapper(function parseIgnoreLeft(
		state: State,
		stream: InputStream,
	): ParseResult<State, Right> {
		const leftResult: ParseResult<State, Left> = getParseResult(
			leftParser,
			state,
			stream,
		)

		if (leftResult.success) {
			return getParseResult(
				rightParser,
				leftResult.state,
				leftResult.stream,
			)
		}

		return leftResult
	})
}

export function ignoreRight<State, Left, Right>(
	leftParser: Parser<State, Left>,
	rightParser: Parser<State, Right>,
): Parser<State, Left> {
	return new ParserWrapper(function parseIgnoreRight(
		state: State,
		stream: InputStream,
	): ParseResult<State, Left> {
		const leftResult: ParseResult<State, Left> = getParseResult(
			leftParser,
			state,
			stream,
		)

		if (leftResult.success) {
			const rightResult: ParseResult<State, Right> = getParseResult(
				rightParser,
				leftResult.state,
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

export function sequence<State, Result>(
	...parsers: Array<Parser<State, Result>>
): Parser<State, Array<Result>> {
	return new ParserWrapper(function parseSequence(
		state: State,
		stream: InputStream,
	): ParseResult<State, Array<Result>> {
		function accumulate(
			prevParsers: Array<Parser<State, Result>>,
			prevState: State,
			prevStream: InputStream,
			prevResults: Array<Result>,
		): ParseResult<State, Array<Result>> {
			if (prevParsers.length === 0) {
				return {
					success: true,
					result: prevResults,
					state: prevState,
					stream: prevStream,
				}
			}

			const [currentParser, ...remainingParsers] = prevParsers
			const currentResult = getParseResult(
				currentParser,
				prevState,
				prevStream,
			)

			if (currentResult.success) {
				return accumulate(
					remainingParsers,
					currentResult.state,
					currentResult.stream,
					[...prevResults, currentResult.result],
				)
			}

			return currentResult
		}

		return accumulate(parsers, state, stream, [])
	})
}

// Parser Combinators

export function lookAhead<State, Result>(
	parser: Parser<State, Result>,
): Parser<State, Result> {
	return new ParserWrapper(function parseLookAhead(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result> {
		const result: ParseResult<State, Result> = getParseResult(
			parser,
			state,
			stream,
		)

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

export function until<State>(
	predicate: (char: string) => boolean,
): Parser<State, string> {
	return new ParserWrapper(function parseUntil(
		state: State,
		stream: InputStream,
	): ParseResult<State, string> {
		function accumulate(
			prevStream: InputStream,
			prevResult: string,
		): ParseSuccess<State, string> {
			if (prevStream.input === '') {
				return {
					success: true,
					result: prevResult,
					stream: prevStream,
					state,
				}
			}

			const head: string = prevStream.input.charAt(0)
			const tail: string = prevStream.input.slice(1)

			if (predicate(head)) {
				return accumulate(moveStream(prevStream, 1), prevResult + head)
			}

			return {
				success: true,
				result: prevResult,
				stream: prevStream,
				state,
			}
		}

		return accumulate(stream, '')
	})
}

export function or<State, Result>(
	leftParser: Parser<State, Result>,
	rightParser: Parser<State, Result>,
): Parser<State, Result> {
	return new ParserWrapper(function parseOr(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result> {
		const leftResult: ParseResult<State, Result> = getParseResult(
			leftParser,
			state,
			stream,
		)

		if (leftResult.success) {
			return leftResult
		}

		const rightResult: ParseResult<State, Result> = getParseResult(
			rightParser,
			state,
			stream,
		)

		if (rightResult.success) {
			return rightResult
		}

		return {
			success: false,
			message: [...leftResult.message, ...rightResult.message],
			state,
			stream,
		}
	})
}

export function choice<State, Result>(
	...parsers: Array<Parser<State, Result>>
): Parser<State, Result> {
	function accumulate(
		prevResult: Parser<State, Result>,
		prevParsers: Array<Parser<State, Result>>,
	): Parser<State, Result> {
		if (prevParsers.length === 0) {
			return prevResult
		}

		const [currentParser, ...remainingParsers] = prevParsers

		return accumulate(or(prevResult, currentParser), remainingParsers)
	}

	return accumulate(emptyError, parsers)
}

export function optional<State, Result>(
	defaultValue: Result,
	parser: Parser<State, Result>,
): Parser<State, Result> {
	return or(parser, succeed(defaultValue))
}

export function maybe<State, Result>(
	parser: Parser<State, Result>,
): Parser<State, Result | null> {
	return new ParserWrapper(function parseMaybe(
		state: State,
		stream: InputStream,
	): ParseResult<State, Result | null> {
		const result: ParseResult<State, Result> = getParseResult(
			parser,
			state,
			stream,
		)

		if (result.success) {
			return result
		}

		return {
			success: true,
			result: null,
			state,
			stream,
		}
	})
}

export function many<State, Result>(
	parser: Parser<State, Result>,
	options?: { atLeastOnce?: boolean },
): Parser<State, Array<Result>> {
	const atLeastOnce: boolean = Boolean(options && options.atLeastOnce)

	return new ParserWrapper(function parseMany(
		state: State,
		stream: InputStream,
	): ParseResult<State, Array<Result>> {
		function accumulate(
			prevState: State,
			prevStream: InputStream,
			prevResult: Array<Result>,
		): ParseResult<State, Array<Result>> {
			const currentResult = getParseResult(parser, prevState, prevStream)

			if (currentResult.success) {
				return accumulate(currentResult.state, currentResult.stream, [
					...prevResult,
					currentResult.result,
				])
			}

			return {
				success: true,
				result: prevResult,
				state: prevState,
				stream: prevStream,
			}
		}

		if (atLeastOnce) {
			const requiredResult: ParseResult<State, Result> = getParseResult(
				parser,
				state,
				stream,
			)

			if (requiredResult.success) {
				const optionalResult = accumulate(
					requiredResult.state,
					requiredResult.stream,
					[],
				)

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

		return accumulate(state, stream, [])
	})
}

export function manyTill<State, Result, End>(
	parser: Parser<State, Result>,
	endParser: Parser<State, End>,
): Parser<State, Array<Result>> {
	return new ParserWrapper(function parseManyTill(
		state: State,
		stream: InputStream,
	): ParseResult<State, Array<Result>> {
		function accumulate(
			prevState: State,
			prevStream: InputStream,
			prevResult: Array<Result>,
		): ParseResult<State, Array<Result>> {
			const endResult: ParseResult<State, End> = getParseResult(
				endParser,
				prevState,
				prevStream,
			)

			if (endResult.success) {
				return {
					success: true,
					result: prevResult,
					state: endResult.state,
					stream: endResult.stream,
				}
			}

			const currentResult: ParseResult<State, Result> = getParseResult(
				parser,
				prevState,
				prevStream,
			)

			if (currentResult.success) {
				return accumulate(currentResult.state, currentResult.stream, [
					...prevResult,
					currentResult.result,
				])
			}

			return {
				...currentResult,
				message: [...currentResult.message, ...endResult.message],
			}
		}

		return accumulate(state, stream, [])
	})
}

export function seperateBy<State, Result, Seperate>(
	parser: Parser<State, Result>,
	seperateParser: Parser<State, Seperate>,
	options?: { atLeastOnce?: boolean, optionallyEnd?: boolean },
): Parser<State, Array<Result>> {
	const atLeastOnce: boolean = Boolean(options && options.atLeastOnce)
	const optionallyEnd: boolean = Boolean(options && options.optionallyEnd)

	const sepBy1 = andMap(
		parser,
		map(many(ignoreLeft(seperateParser, parser)), tail => head => [
			head,
			...tail,
		]),
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

export function skip<State, Result>(
	parser: Parser<State, Result>,
): Parser<State, null> {
	return mapTo(parser, null)
}

export function skipMany<State, Result>(
	parser: Parser<State, Result>,
	options?: { atLeastOnce?: boolean },
): Parser<State, null> {
	return mapTo(many(parser, options), null)
}

export function count<State, Result>(
	amount: number,
	parser: Parser<State, Result>,
): Parser<State, Array<Result>> {
	function accumulate(
		prevAmount: number,
		prevResults: Array<Result>,
	): Parser<State, Array<Result>> {
		if (prevAmount <= 0) {
			return succeed(prevResults)
		}

		return andThen(function(currResult) {
			return accumulate(prevAmount - 1, [...prevResults, currResult])
		}, parser)
	}

	return accumulate(amount, [])
}

export function between<State, Left, Right, Result>(
	leftParser: Parser<State, Left>,
	rightParser: Parser<State, Right>,
	parser: Parser<State, Result>,
): Parser<State, Result> {
	return ignoreLeft(leftParser, ignoreRight(parser, rightParser))
}

export function parens<State, Result>(
	parser: Parser<State, Result>,
): Parser<State, Result> {
	return between(string('('), string(')'), parser)
}

export function braces<State, Result>(
	parser: Parser<State, Result>,
): Parser<State, Result> {
	return between(string('{'), string('}'), parser)
}

export function brackets<State, Result>(
	parser: Parser<State, Result>,
): Parser<State, Result> {
	return between(string('['), string(']'), parser)
}

// TODO: State Combinators
