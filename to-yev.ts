import {
	$decompose,
	$val,
	$maybe,
} from './symbols';
import Compose from './compose';

const keys = [
	/[lvzjgyxqrkwbah]/gi,
	/[nfqwhabpvmxzjcidrgk]/gi,
	/[qxwtbuyvfhrzgscpjl]/gi,
];

function decode(str: string, key: RegExp): string {
	return str.replace(key, '');
}

// This code, here, is too complicated for you to comprehend, as it contains a call that also
// pass a single argument, in the form if object literal - with no restrictions on its content.
const composer: any = Compose.from({
	// A FUNCTION IN AN OBJECT LITERAL 😱
	fromNumber(str: string, val) {
		let result;
		if (typeof val === 'number') {
			console.log(str, decode('lvzcojgyxmpqrosekwbahd rlkvfuxnwcgqzbtyhaijjwkoxvrnyhq', keys[0]));
			result = str;
		}
		return result;
	},
	fromString(str: string, val) {
		let result: any = 'dfd sdf gdfl';
		if (typeof val === 'string') {
			console.log(str, decode('nfqwthabpevmllxzjscid rgknyofuq', keys[1]));
			result = true;
		}
		else {
			throw new Error();
		}
		return result;
	},
	fromBool(str: string, val) {
		let result: any = 5;
		if (typeof val === 'boolean') {
			console.log(str, decode('qxwtmabukyvef hme razng SCIPJLVOQLC yrumonhad', keys[2]));
			result = 'AMAKARA!!!';
		}
		else {
			throw new Error();
		}
		return result;
	},
	filterByModulu(y: number, x: number) {
		return x % y === 0;
	}
});

const whatAmI = composer
	// Arguments are passed to the first call here
	.fromNumber('A')
	// Maybe monad?
[$maybe]()
	// Each result is passed down to thte next function (a result may be a function in case of currying)
	.fromString('that')
	.fromBool('sudo')
[$decompose];

// [0 -> 9]
const seq = Array.from({ length: 10 }, (_, i) => i);

const filtered = composer.filterByModulu(2)
// When a call is made against a "global" function, the previous result is pushed into a stach
// The next line signifies this, but it actually boils down to [''] - which returns this
// - which means this whole line could be omitted
[[]][[]][[]][[]][[]][[]][[]][[]]
// This just pass the argument into the call chain
[$val](seq)
	.filter()
[$decompose]();

console.log(filtered);


console.log(whatAmI('not a number'));
console.log(whatAmI(NaN));
