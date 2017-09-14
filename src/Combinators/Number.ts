import { Parser } from './Types'

import { map, mapErrorTo, regex } from './Combinators'

/**
 * The "integer" parser will succeed for a number. Otherwise, it will fail.
 */
export function integer(): Parser<number> {
	return mapErrorTo(
		map(regex(/(\+|-)?(0|[1-9][0-9]*)/), n => parseInt(n, 10)),
		'Expected an integer',
	)
}

/**
 * The "float" parser will succeed for a floating point number. Otherwise, it
 * will fail.
 */
export function float(): Parser<number> {
	return mapErrorTo(
		map(regex(/(\+|-)?(0|[1-9][0-9]*)\.[0-9]+/), n => parseFloat(n)),
		'Expected a float',
	)
}
