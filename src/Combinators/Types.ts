import { ParserWrapper } from './Helpers'

/**
 * The "InputStream" interface declares the properties of an input stream.
 */
export interface InputStream {
	// The "data" property is the whole data on which the parser operates.
	data: string
	// The "input" property is the data which is left.
	input: string
	// The "position" property is the current position of the parser.
	// position = data.length - input.length
	position: number
}

// Parse Result

/**
 * The "ParseResult" type is either a "ParseSuccess" or a "ParseFailure".
 */
export type ParseResult<Result> = ParseSuccess<Result> | ParseFailure

/**
 * The "ParseSuccess" interface declares the properties of a successful parse.
 */
export interface ParseSuccess<Result> {
	success: true
	// The "result" property is the result of a parse process. It can be of any
	// type like "string", "object" or "null"
	result: Result
	// The "stream" property is output stream of a parser which will be passed
	// into the next parser.
	stream: InputStream
}

/**
 * The "ParseFailure" interface declares the properties of a failed parse.
 */
export interface ParseFailure {
	success: false
	// The "messages" property contains all the error messages
	messages: Array<string>
	// The "stream" property is output stream of a parser which can be used by
	// another parser to recover or continue.
	stream: InputStream
}

// Parser Types

/**
 * A "Parser" is either a LazyParser or a ParserWrapper.
 * This is needed so we can declare new parsers as a function which will return
 * a combination of old parsers. We need to declare new parser as a function so
 * recursive parsers which call each other are possible.
 */
export type Parser<Result> = LazyParser<Result> | ParserWrapper<Result>

/**
 * A "LazyParser" is a function which will resolve to a parser.
 */
export type LazyParser<Result> = () => Parser<Result>
