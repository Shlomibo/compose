import {
	$decompose,
	$maybe,
} from './symbols';
import Compose from './compose';

const composer: any = Compose.from({
	fromNumber(str: string, val) {
		let result;
		if (typeof val === 'number') {
			console.log(str, 'composed function');
			result = str;
		}
		return result;
	},
	fromString(str: string, val) {
		let result: any = 'dfd sdf gdfl';
		if (typeof val === 'string') {
			console.log(str, 'tells you');
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
			console.log(str, 'make me an IO monad');
			result = 'AMAKARA!!!';
		}
		else {
			throw new Error();
		}
		return result;
	},
});

const whatAmI = composer
	.fromNumber('A')
	[$maybe]()
	.fromString('that')
	.fromBool('sudo')
[$decompose];

console.log(whatAmI('not a number'));
console.log(whatAmI(NaN));
