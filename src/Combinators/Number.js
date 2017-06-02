// @flow

import type { Parser } from './Types.js'

import {
	choice,
	map,
	mapErrorTo,
	mapTo,
	optional,
	regex,
	string,
} from './Combinators.js'

export function sign<State>(): Parser<State, -1 | 1> {
	return optional(1, choice(mapTo(string('+'), 1), mapTo(string('-'), -1)))
}

export function integer<State>(): Parser<State, number> {
	return mapErrorTo(
		map(regex(/(\+|-)?(0|[1-9][0-9]*)/), n => parseInt(n, 10)),
		'Expected an integer',
	)
}

export function digit<State>(): Parser<State, number> {
	return mapErrorTo(
		map(regex(/[0-9]/), n => parseInt(n, 10)),
		'Expected a digit',
	)
}

export function float<State>(): Parser<State, number> {
	return mapErrorTo(
		map(regex(/(\+|-)?(0|[1-9][0-9]*)\.[0-9]+/), n => parseFloat(n)),
		'Expected a float',
	)
}
