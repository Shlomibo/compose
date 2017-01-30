import Compose from './compose';
import {
	$namespaces,
	$val,
	$decompose,
	$methods,
	_$,
} from './symbols';

declare const global: any;

const t = Compose.from({
	[$namespaces]: global,
	[$methods]: [[console.log, Infinity]],
})
[$val]('world')
	.console
	.log('hello', _$)
[$val]('Success');

console.log(t[$decompose]());
