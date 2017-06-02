// @flow

import type { InputStream, Parser, ParseResult } from './Types.js'
import { mapErrorTo, mapTo, or, regex } from './Combinators.js'
import { moveStream, ParserWrapper } from './Helpers.js'

export function satisfy<State>(
	predicate: string => boolean,
): Parser<State, string> {
	return new ParserWrapper(function parseSatisfy(
		state: State,
		stream: InputStream,
	): ParseResult<State, string> {
		if (stream.input === '') {
			return {
				success: false,
				message: ['Could not satisfy predicate'],
				state,
				stream,
			}
		}

		const head: string = stream.input.charAt(0)

		if (predicate(head)) {
			return {
				success: true,
				result: head,
				stream: moveStream(stream, 1),
				state,
			}
		}

		return {
			success: false,
			message: ['Could not satisfy predicate'],
			state,
			stream,
		}
	})
}

export function char<State>(expectedChar: string): Parser<State, string> {
	return mapErrorTo(
		satisfy(char => char === expectedChar),
		`Expected "${expectedChar}"`,
	)
}

export function anyChar<State>(): Parser<State, string> {
	return mapErrorTo(satisfy((): boolean => true), 'Expected any character')
}

export function oneOf<State>(chars: string): Parser<State, string> {
	return mapErrorTo(
		satisfy(char => chars.split('').includes(char)),
		`Expected one character of "${chars}"`,
	)
}

export function noneOf<State>(chars: string): Parser<State, string> {
	return mapErrorTo(
		satisfy(char => !chars.split('').includes(char)),
		`Expected no character of "${chars}"`,
	)
}

export function space<State>(): Parser<State, string> {
	return mapErrorTo(char(' '), 'Expected space')
}

export function tab<State>(): Parser<State, string> {
	return mapErrorTo(char('\t'), 'Expected tab')
}

export function newline<State>(): Parser<State, string> {
	return mapErrorTo(char('\n'), 'Expected newline')
}

export function crlf<State>(): Parser<State, string> {
	return mapErrorTo(mapTo(regex(/\x0D\n/), '\n'), 'Expected crlf')
}

export function eol<State>(): Parser<State, string> {
	return or(newline, crlf)
}

export function lower<State>(): Parser<State, string> {
	return mapErrorTo(regex(/[a-z]/), 'Expected a lowercase character')
}

export function upper<State>(): Parser<State, string> {
	return mapErrorTo(regex(/[A-Z]/), 'Expected an uppercase character')
}

export function digit<State>(): Parser<State, string> {
	return mapErrorTo(regex(/[0-9]/), 'Expected a decimal digit')
}

export function octDigit<State>(): Parser<State, string> {
	return mapErrorTo(regex(/[0-7]/), 'Expected an octal digit')
}

export function hexDigit<State>(): Parser<State, string> {
	return mapErrorTo(regex(/[a-f0-9A-F]/), 'Expected an hexadecimal digit')
}
