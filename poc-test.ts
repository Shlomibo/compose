import Compose from './compose';
import {
	$namespaces,
	$set,
	$decompose,
	$methods,
	_$,
} from './symbols';

declare const global: any;

const t = Compose.from({
	[$namespaces]: global,
	[$methods]: [[console.log, Infinity]],
})
[$set]('world')
	.console
	.log('hello', _$)
[$set]('Success');

console.log(t[$decompose]());
