import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import v from './index'

const test = suite(`body_validator`)

test(`body_validator object validator`, () => {
	const validator = v.object({
		cool_number: v.number,
		cool_string: v.string,
		cool_bool: v.boolean,
		other_number: v.optional(v.number),
		other_string: v.optional(v.string),
		other_bool: v.optional(v.boolean),
		cool_array: v.array(v.string),
		other_array: v.optional(v.array(v.number)),
	})

	const valid_input: unknown = {
		cool_number: 3,
		cool_string: `wat`,
		cool_bool: true,
		other_number: 4,
		cool_array: [ `totes a string`, `still a string` ],
	}

	if (validator.is_valid(valid_input)) {
		// Should pass the type system
		valid_input.cool_number
	}

	assert.ok(validator.is_valid(valid_input))

	assert.not.ok(validator.is_valid({
		cool_number: `3`,
		cool_string: `wat`,
		cool_bool: true,
	}), `should fail when cool_number is a string`)

	assert.not.ok(validator.is_valid({
		cool_number: 3,
		cool_string: `wat`,
		other_string: `wut`,
	}), `should fail when cool_bool is not provided`)

	assert.not.ok(validator.is_valid({
		...valid_input,
		some_other_property: true,
	}), `should fail when passed an unknown property`)

	assert.not.ok(validator.is_valid({
		...valid_input,
		cool_array: [ 1, 2 ],
	}), `should fail when cool_array contains non-strings`)

	assert.not.ok(validator.is_valid({
		...valid_input,
		cool_array: undefined,
	}), `should fail when cool_array is not provided`)
})

test(`body_validator optional object validator`, () => {
	const input: unknown = {
		cool_number: 3,
		cool_string: `wat`,
		cool_bool: true,
		other_number: 4,
	}

	const optional_validator = v.optional(v.object({
		cool_number: v.number,
		cool_string: v.string,
		cool_bool: v.boolean,
		other_number: v.optional(v.number),
		other_string: v.optional(v.string),
		other_bool: v.optional(v.boolean),
	}))

	if (optional_validator.is_valid(input)) {
		// @ts-expect-error input could still be undefined
		input.cool_number
	}

	assert.ok(optional_validator.is_valid(undefined))
	assert.ok(optional_validator.is_valid(input))
})

test(`body_validator array validator`, () => {
	const validator = v.array(v.object({
		cool_number: v.number,
		other_bool: v.optional(v.boolean),
	}))

	assert.ok(validator.is_valid([{
		cool_number: 3,
		other_bool: true,
	}, {
		cool_number: 4,
	}]))

	assert.ok(validator.is_valid([]))

	// @ts-expect-error "optional elements" don't make sense for arrays
	v.array(v.optional(v.object({})))
	// @ts-expect-error "optional elements" don't make sense for arrays
	v.optional(v.array(v.optional(v.object({}))))
})

test(`Output messages`, () => {
	const validator = v.object({
		cool_number: v.number,
		cool_string: v.string,
		cool_bool: v.boolean,
		other_number: v.optional(v.number),
		other_string: v.optional(v.string),
		other_bool: v.optional(v.boolean),
		cool_array: v.array(v.string),
		other_array: v.optional(v.array(v.number)),
	})

	const invalid_input: unknown = {
		cool_number: `WRONG`,
		cool_string: `wat`,
		other_number: 4,
		other_array: [ `WRONG`, 2 ],
		WRONG: `:-o`,
	}

	const output = validator.get_messages(invalid_input, `invalid_input`)

	assert.equal(output, [
		`"invalid_input" should not have a property named "WRONG" `,
		`"invalid_input"."cool_number" is not a number`,
		`"invalid_input"."cool_bool" is not a boolean`,
		`"invalid_input"."cool_array" is not an array`,
		`"invalid_input"."other_array": "other_array[0]" is not a number, or "other_array" should be undefined`,
	])
})

test(`nullable`, () => {
	const validator = v.nullable(v.string)

	assert.ok(validator.is_valid(null))
	assert.ok(validator.is_valid(`yarp`))

	assert.not.ok(validator.is_valid(false))
})

test(`integer`, () => {
	const validator = v.integer

	assert.ok(validator.is_valid(3))

	assert.not.ok(validator.is_valid(3.4))
})

test(`one_of`, () => {
	const validator = v.one_of(v.string, v.number)

	assert.ok(validator.is_valid(9))
	assert.ok(validator.is_valid(`yarp`))

	assert.not.ok(validator.is_valid(true))
})

test(`regex`, () => {
	const validator = v.regex(/howdy/)

	assert.ok(validator.is_valid(`well howdy`))
	assert.ok(validator.is_valid(`howdy there`))
	assert.not.ok(validator.is_valid(3))
	assert.not.ok(validator.is_valid(null))
	assert.not.ok(validator.is_valid(`yarp`))
})

test(`regex custom_message`, () => {
	const validator = v.regex(/howdy/, `ya did wrong by me`)

	const output = validator.get_messages(undefined, `whatever`)

	assert.equal(output, [ `ya did wrong by me` ])
})

test(`optional`, () => {
	const validator = v.optional(v.string)

	assert.ok(validator.is_valid(undefined))
	assert.ok(validator.is_valid(`yarp`))

	assert.not.ok(validator.is_valid(null))
})

test(`exact`, () => {
	const validator = v.exact(`wat`)

	assert.ok(validator.is_valid(`wat`))

	assert.not.ok(validator.is_valid(`wuuuuuuuutt`))
})

test.run()
