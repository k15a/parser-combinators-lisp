// @flow

import { Parser } from './Types.js'

import {
	map,
	mapErrorTo,
	regex,
} from './Combinators'
//
// export function sign(): Parser<-1 | 1> {
// 	return optional(1, choice(mapTo(string('+'), 1), mapTo(string('-'), -1)))
// }

export function integer(): Parser<number> {
	return mapErrorTo(
		map(regex(/(\+|-)?(0|[1-9][0-9]*)/), n => parseInt(n, 10)),
		'Expected an integer',
	)
}

export function digit(): Parser<number> {
	return mapErrorTo(
		map(regex(/[0-9]/), n => parseInt(n, 10)),
		'Expected a digit',
	)
}

export function float(): Parser<number> {
	return mapErrorTo(
		map(regex(/(\+|-)?(0|[1-9][0-9]*)\.[0-9]+/), n => parseFloat(n)),
		'Expected a float',
	)
}
