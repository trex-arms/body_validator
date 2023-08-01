type MessageReturningFunction = (input: unknown, name: string) => string[]

type PredicateFunction<T> = ((input: unknown) => input is T)

export type Validator<T> = {
	is_valid: PredicateFunction<T>
	get_messages: MessageReturningFunction
}
type NonOptionalPredicateFunction<T> = PredicateFunction<T extends undefined ? never : T>

type NonOptionalValidator<T> = {
	is_valid: NonOptionalPredicateFunction<T>
	get_messages: MessageReturningFunction
}

type StringIndexedObject = {
	[key: string]: unknown
}

const double_quote = (str: string) => `"${ str }"`

const is_string = (input: unknown): input is string => typeof input === `string`

const string_validator: Validator<string> = {
	is_valid: is_string,
	get_messages: (input: unknown, name: string) => is_string(input) ? [] : [ `${ double_quote(name) } is not a string` ],
}

const is_number = (input: unknown): input is number => typeof input === `number`

const number_validator: Validator<number> = {
	is_valid: is_number,
	get_messages: (input: unknown, name: string) => is_number(input) ? [] : [ `${ double_quote(name) } is not a number` ],
}

const is_integer = (input: unknown): input is number => Number.isInteger(input)

const integer_validator: Validator<number> = {
	is_valid: is_integer,
	get_messages: (input: unknown, name: string) => is_number(input) ? [] : [ `${ double_quote(name) } is not an integer` ],
}

const is_boolean = (input: unknown): input is boolean => typeof input === `boolean`

const boolean_validator: Validator<boolean> = {
	is_valid: is_boolean,
	get_messages: (input: unknown, name: string) => is_boolean(input) ? [] : [ `${ double_quote(name) } is not a boolean` ],
}

const is_object = (input: unknown): input is StringIndexedObject => !!input && typeof input === `object`

type ValidatorShape<DESIRED_OBJECT extends { [key: string]: any }> = {
	[key in keyof DESIRED_OBJECT]: Validator<DESIRED_OBJECT[key]>
}

const keys_plz = <const KEY extends string>(object: { [key in KEY]: any }): KEY[] => Object.keys(object) as KEY[]
const values_plz = <const VALUE>(object: { [key: string]: VALUE }): VALUE[] => Object.values(object) as VALUE[]

const make_object_validator = <const OBJECT extends { [key: string]: any }>(shape: ValidatorShape<OBJECT>) => {
	const is_valid = (input: unknown): input is OBJECT => {
		if (!is_object(input)) {
			return false
		}

		const all_input_keys_exist_in_shape = keys_plz(input).every(key => key in shape)

		if (!all_input_keys_exist_in_shape) {
			return false
		}

		return keys_plz(shape).every(key => {
			const validator = shape[key]

			return validator.is_valid(input[key])
		})
	}

	const get_messages = (input: unknown, name: string) => {
		const quoted_name = double_quote(name)

		if (!is_object(input)) {
			return [ `${ quoted_name } is not an object` ]
		}

		const keys_that_dont_exist_in_shape = keys_plz(input).filter(key => !(key in shape))
		const property_messages = keys_plz(shape).flatMap(key => {
			const validator = shape[key]

			return validator.get_messages(input[key], key)
		})

		return [
			...keys_that_dont_exist_in_shape.map(key => `${ quoted_name } should not have a property named ${ double_quote(key) } `),
			...property_messages.map(message => `${ quoted_name }.${ message }`),
		]
	}

	return {
		is_valid,
		get_messages,
	}
}


const make_array_validator = <T>(element_validator: NonOptionalValidator<T>) => {
	const is_valid = (input: unknown): input is T[] => {
		if (!Array.isArray(input)) {
			return false
		}

		return input.every(element_validator.is_valid)
	}

	const get_messages = (input: unknown, name: string) => {
		if (!Array.isArray(input)) {
			return [ `${ double_quote(name) } is not an array` ]
		}

		return input.flatMap((element, index) => element_validator.get_messages(element, `${ name }[${ index }]`))
	}

	return {
		is_valid,
		get_messages,
	}
}

const make_object_values_validator = <T>(element_validator: NonOptionalValidator<T>) => {
	const array_validator = make_array_validator(element_validator)

	const is_valid = (input: unknown): input is { [key: string]: T } => {
		if (!is_object(input)) {
			return false
		}

		return array_validator.is_valid(values_plz(input))
	}

	const get_messages = (input: unknown, name: string) => {
		if (!is_object(input)) {
			return [ `${ double_quote(name) } is not an object` ]
		}

		return array_validator.get_messages(values_plz(input), name)
	}

	return {
		is_valid,
		get_messages,
	}
}

type OneOf = {
	<A, B>(a: Validator<A>, b: Validator<B>): Validator<A | B>
	<A, B, C>(a: Validator<A>, b: Validator<B>, c: Validator<C>): Validator<A | B | C>
	<A, B, C, D>(a: Validator<A>, b: Validator<B>, c: Validator<C>, d: Validator<D>): Validator<A | B | C | D>
}

const one_of: OneOf = <T>(...validators: Validator<T>[]): Validator<T> => {
	const is_valid = (input: unknown): input is T => validators.some(validator => validator.is_valid(input))

	const get_messages = (input: unknown, name: string) => {
		if (!is_valid(input)) {
			const messages = validators
				.filter(validator => !validator.is_valid(input))
				.flatMap(validator => validator.get_messages(input, name))

			return [ `${ double_quote(name) }: ${ messages.join(`, or `) }` ]
		}
		return []
	}

	return {
		is_valid,
		get_messages,
	}
}

const null_validator: Validator<null> = ({
	is_valid(input: unknown): input is null {
		return input === null
	},
	get_messages(input: unknown, name: string) {
		if (input !== null) {
			return [ `${ double_quote(name) } should be null` ]
		}

		return []
	},
})

const nullable = <T>(validator: Validator<T>): Validator<T | null> => one_of(validator, null_validator)

const make_regex_validator = <T extends string>(regex: RegExp, custom_message?: string) => ({
	is_valid(input: unknown): input is T {
		return typeof input === `string` && regex.test(input)
	},
	get_messages(input: unknown, name: string) {
		if (typeof input !== `string` || !regex.test(input)) {
			return [ custom_message || `${ double_quote(name) } should be a string that matches ${ double_quote(regex.toString()) }` ]
		}
		return []
	},
})

const undefined_validator: Validator<undefined> = ({
	is_valid(input: unknown): input is undefined {
		return input === undefined
	},
	get_messages(input: unknown, name: string) {
		if (input !== undefined) {
			return [ `${ double_quote(name) } should be undefined` ]
		}

		return []
	},
})

const make_exact_validator = <T>(value: T): Validator<T> => ({
	is_valid(input: unknown): input is T {
		return input === value
	},
	get_messages(input: unknown, name: string) {
		if (input !== value) {
			return [ `${ double_quote(name) } should be "${ value }"` ]
		}
		return []
	},
})

const optional = <T>(validator: Validator<T>): Validator<T | undefined> => one_of(validator, undefined_validator)


export default {
	object: make_object_validator,
	array: make_array_validator,
	object_values: make_object_values_validator,
	string: string_validator,
	number: number_validator,
	integer: integer_validator,
	boolean: boolean_validator,
	one_of,
	null: null_validator,
	nullable,
	regex: make_regex_validator,
	optional,
	exact: make_exact_validator,
} as const
