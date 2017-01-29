import Compose from './compose';
import {
	$namespaces,
	$set,
	$decompose,
} from './symbols';

declare const global: any;

const t = Compose.from({ [$namespaces]: global })
[$set]('hello')
	.console
	.log;

console.log(t()[$decompose]());
