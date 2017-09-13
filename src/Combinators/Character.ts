// @flow

import { InputStream, Parser, ParseResult } from './Types'
import { mapErrorTo, mapTo, or, regex } from './Combinators'
import { moveStream, ParserWrapper } from './Helpers'

export function satisfy(predicate: (value: string) => boolean): Parser<string> {
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

export function char(expectedChar: string): Parser<string> {
	return mapErrorTo(
		satisfy(char => char === expectedChar),
		`Expected "${expectedChar}"`,
	)
}

export function anyChar(): Parser<string> {
	return mapErrorTo(satisfy((): boolean => true), 'Expected any character')
}

export function oneOf(chars: string): Parser<string> {
	return mapErrorTo(
		satisfy(char => chars.split('').includes(char)),
		`Expected one character of "${chars}"`,
	)
}

export function noneOf(chars: string): Parser<string> {
	return mapErrorTo(
		satisfy(char => !chars.split('').includes(char)),
		`Expected no character of "${chars}"`,
	)
}

export function space(): Parser<string> {
	return mapErrorTo(char(' '), 'Expected space')
}

export function tab(): Parser<string> {
	return mapErrorTo(char('\t'), 'Expected tab')
}

export function newline(): Parser<string> {
	return mapErrorTo(char('\n'), 'Expected newline')
}

export function crlf(): Parser<string> {
	return mapErrorTo(mapTo(regex(/\x0D\n/), '\n'), 'Expected crlf')
}

export function eol(): Parser<string> {
	return or(newline, crlf)
}

export function lower(): Parser<string> {
	return mapErrorTo(regex(/[a-z]/), 'Expected a lowercase character')
}

export function upper(): Parser<string> {
	return mapErrorTo(regex(/[A-Z]/), 'Expected an uppercase character')
}

export function digit(): Parser<string> {
	return mapErrorTo(regex(/[0-9]/), 'Expected a decimal digit')
}

export function octDigit(): Parser<string> {
	return mapErrorTo(regex(/[0-7]/), 'Expected an octal digit')
}

export function hexDigit(): Parser<string> {
	return mapErrorTo(regex(/[a-f0-9A-F]/), 'Expected an hexadecimal digit')
}
