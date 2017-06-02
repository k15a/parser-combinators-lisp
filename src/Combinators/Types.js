// @flow

import { ParserWrapper } from './Helpers.js'

// Input Stream

export type InputStream = {
	data: string,
	input: string,
	position: number,
}

// Parse Result

export type ParseResult<State, Result> =
	| ParseSuccess<State, Result>
	| ParseFailure<State>

export type ParseSuccess<State, Result> = {
	success: true,
	result: Result,
	state: State,
	stream: InputStream,
}

export type ParseFailure<State> = {
	success: false,
	message: Array<string>,
	state: State,
	stream: InputStream,
}

// Parser Types

export type Parser<State, Result> =
	| LazyParser<State, Result>
	| ParserWrapper<State, Result>

export type LazyParser<State, Result> = () => Parser<State, Result>
