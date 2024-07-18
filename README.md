# body_validator

Designed for validating HTTP POST bodies in a TypeScript-friendly way

## Install

Not currently on npm.  Download the files from Github.  Sorry!

## Example

<!--js
const v = require('./')
-->

```node
const v = require('body_validator')
// or
import v from 'body_validator'
```

Valid example
```js
const validator = v.object({
	name: v.string,
	age: v.number,
	cool: v.optional(v.boolean),
	powers: v.array(v.string),
})

/** @type {unknown} */
const valid_input = {
	name: 'Batman',
	age: 27,
	cool: true,
	powers: [ 'money' ],
}

if (validator.is_valid(valid_input)) {
	// Should pass the type system
	valid_input.name // => 'Batman'
}

validator.get_messages(valid_input, `input`) // => []
```

Invalid example
```js
/** @type {unknown} */
const invalid_input = {
	name: 'Superman',
}

validator.is_valid(invalid_input) // => false

validator.get_messages(invalid_input, `input`) // => [ '"input"."age" is not a number', '"input"."powers" is not an array' ]
```

## API

```node
import v from 'body_validator'
```

#### `Validator`

- object
	- `is_valid(input): boolean` is a Type Guard function that returns true/false for whether the `input` is that type
	- `get_messages(input): string[]` is a function that returns an array of string error messages



#### `v.boolean`

```js
v.boolean.is_valid(true) // => true
v.boolean.is_valid(false) // => true
v.boolean.is_valid('no') // => false
```


#### `v.string`

```js
v.string.is_valid(':)') // => true
v.string.is_valid(false) // => false
```


#### `v.number`

```js
v.number.is_valid(3) // => true
v.number.is_valid(-17.32) // => true
v.number.is_valid('no') // => false
```


#### `v.integer`

```js
v.integer.is_valid(3) // => true
v.integer.is_valid(3.14159) // => false
v.integer.is_valid({}) // => false
```


#### `v.null`

```js
v.null.is_valid(null) // => true
v.null.is_valid(undefined) // => false
```


#### `v.date`

```js
v.date.is_valid(new Date()) // => true
v.date.is_valid('2024-07-18T14:53:55.123Z') // => false
```


#### `v.exact(value)`

```js
v.exact('hi').is_valid('hi') // => true
v.exact('hi').is_valid('HI') // => false
v.exact({}).is_valid({}) // => false
const x = {}
v.exact(x).is_valid(x) // => true
```


#### `v.array(validator: Validator)`

(No passing in `v.optional`.)

```js
v.array(v.boolean).is_valid([]) // => true
v.array(v.boolean).is_valid([ true ]) // => true
v.array(v.boolean).is_valid(true) // => false
v.array(v.boolean).is_valid([ 'WRONG' ]) // => false
```


#### `v.object(object_of_validators: Record<string, Validator>)`

```js
const cool_validator = v.object({ cool: v.boolean })

cool_validator.is_valid({ cool: true }) // => true

cool_validator.is_valid({}) // => false
cool_validator.is_valid({ cool: 'no' }) // => false
cool_validator.is_valid({ uncool: true }) // => false
```


#### `v.object_values(validator: Validator)`

```js
const str_values_validator = v.object_values(v.string)

str_values_validator.is_valid({ hello: 'world' }) // => true
str_values_validator.is_valid({ non_string: 3 }) // => false
str_values_validator.is_valid({ hello: 'darkness', non_string: 3 }) // => false
str_values_validator.is_valid({}) // => true
```


#### `v.one_of(...validators: Validator[])`

```js
const enum_validator = v.one_of(v.exact('GET'), v.exact('POST'), v.exact('DELETE'))

enum_validator.is_valid('GET') // => true
enum_validator.is_valid('PATCH') // => false
```


#### `v.regex(re: RegExp)`

```js
const enum_validator2 = v.regex(/^(GET|POST|DELETE)$/)

enum_validator2.is_valid('POST') // => true
enum_validator2.is_valid('OPTIONS') // => false
```


#### `v.nullable(validator: Validator)`

```js
v.boolean.is_valid(null) // => false
v.nullable(v.boolean).is_valid(null) // => true
v.nullable(v.boolean).is_valid(false) // => true
```


#### `v.optional(validator: Validator)`

```js
v.boolean.is_valid(undefined) // => false
v.optional(v.boolean).is_valid(undefined) // => true
v.optional(v.boolean).is_valid(false) // => true
```

This is intended for use with `v.object`.
```js
const options_validator = v.object({
	name: v.string,
	age: v.optional(v.integer),
})

options_validator.is_valid({ name: 'Joseph' }) // => true
options_validator.is_valid({ name: 'Joseph', age: 42 }) // => true
options_validator.is_valid({ name: 'Joseph', age: undefined }) // => true
options_validator.is_valid({ age: 42 }) // => false
```


#### `v.custom({ is_valid: (input: any) => boolean, get_messages(input: any, name: string) => string[] })`

```js
function is_valid(input) {
	if (typeof input !== 'string') return false
	if (input.length !== 10) return false
	if (!/\d\d\d\d-\d\d-\d\d/.test(input)) return false

	const [ year, month, day ] = input.split('-')
	if (parseInt(month, 10) > 12) return false
	if (parseInt(day, 10) > 31) return false

	return true
}

function get_messages(input, name) {
	return is_valid(input)
		? []
		: `"${ name}" is not a valid ISO date` // ideally you might give more context, like if the month doesn't exist, or the type if wrong.
}

const iso_date_validator = v.custom({ is_valid, get_messages })

iso_date_validator.is_valid('2024-07-18') // -> true
iso_date_validator.is_valid('2024-07-32') // -> false
iso_date_validator.is_valid('2024-13-18') // -> false
```


## License

MIT