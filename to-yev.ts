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

const composer: any = Compose.from({
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
	.fromNumber('A')
[$maybe]()
	.fromString('that')
	.fromBool('sudo')
[$decompose];

// [0 -> 9]
const seq = Array.from({ length: 10 }, (_, i) => i);

const filtered = composer.filterByModulu(2)
[$val](seq)
	.filter()
[$decompose]();

console.log(filtered);


console.log(whatAmI('not a number'));
console.log(whatAmI(NaN));
