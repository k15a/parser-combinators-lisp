/**
 * Builtins
 */

function log(...args) {
	console.log(...args)
	return args
}

function list(...args) {
	return args
}

function add(...args) {
	return args.reduce((sum, n) => sum + n, 0)
}

function multiply(...args) {
	return args.reduce((product, n) => product + n, 1)
}

function subtract(a, b) {
	return a - b
}

function divide(a, b) {
	return a / b
}

function modulo(a, b) {
	return a % b
}

function concat(a, b) {
	return a.concat(b)
}

function map(func, array) {
	return array.map(func)
}

function head(list) {
	return list[0]
}

function tail(list) {
	return list.slice(1)
}

function cond(condition, yes, no) {
	if (condition) {
		return yes
	}

	return no
}

function eq(left, right) {
	return left === right
}

function not(value) {
	return !value
}

/**
 * Program code
 */
