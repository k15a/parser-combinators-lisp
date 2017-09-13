// @flow

import { ParserWrapper } from './Helpers'

// Input Stream

export interface InputStream {
	data: string
	input: string
	position: number
}

// Parse Result

export type ParseResult<Result> = ParseSuccess<Result> | ParseFailure

export interface ParseSuccess<Result> {
	success: true
	result: Result
	stream: InputStream
}

export interface ParseFailure {
	success: false
	messages: Array<string>
	stream: InputStream
}

// Parser Types

export type Parser<Result> = LazyParser<Result> | ParserWrapper<Result>

export type LazyParser<Result> = () => Parser<Result>
