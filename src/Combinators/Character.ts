import { InputStream, Parser, ParseResult } from './Types'
import { mapErrorTo, mapTo, or, regex } from './Combinators'
import { moveStream, ParserWrapper } from './Helpers'

/**
 * The "statisfy" parser takes a predicate function and will call it with the
 * first character of the input. It will succeed if the predicate
 * function returns true. Otherwise, it will fail.
 */
function satisfy(predicate: (value: string) => boolean): Parser<string> {
	return new ParserWrapper(function parseSatisfy(
		stream: InputStream,
	): ParseResult<string> {
		if (stream.input === '') {
			return {
				success: false,
				messages: ['Could not satisfy predicate'],
				stream,
			}
		}

		const head: string = stream.input.charAt(0)

		if (predicate(head)) {
			return {
				success: true,
				result: head,
				stream: moveStream(stream, 1),
			}
		}

		return {
			success: false,
			messages: ['Could not satisfy predicate'],
			stream,
		}
	})
}

/**
 * The "char" parser will succeed when the first character of the input equals
 * the expected character. Otherwise, it will fail.
 */
function char(expectedChar: string): Parser<string> {
	return mapErrorTo(
		satisfy(char => char === expectedChar),
		`Expected "${expectedChar}"`,
	)
}

/**
 * The "anyChar" parser will succeed for any character. If there is no character
 * left it will fail.
 */
export function anyChar(): Parser<string> {
	return mapErrorTo(satisfy((): boolean => true), 'Expected any character')
}

/**
 * The "newline" parser will succeed for a line feed character. Otherwise, it
 * will fail.
 */
function newline(): Parser<string> {
	return mapErrorTo(char('\n'), 'Expected newline')
}

/**
 * The "crlf" parser will succeed for a carriage return character followed by a
 * line feed character. Otherwise, it will fail.
 */
function crlf(): Parser<string> {
	return mapErrorTo(mapTo(regex(/\r\n/), '\n'), 'Expected crlf')
}

/**
 * The "eol" parser will succeed if either the "newline" parser or the "crlf"
 * parser will succeed. Otherwise, it wil fail.
 */
export function eol(): Parser<string> {
	return mapErrorTo(or(newline, crlf), 'Expected EOL')
}
