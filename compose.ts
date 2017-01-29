import * as _ from 'lodash';
import {
	$namespaces,
	$decompose,
	$args,
	$arg,
	$value,
	$thisArg,
	$set,
	$param,
	$funcs,
	$decomposition,
	$methods,
	_$,
} from './symbols';

export type FunctionDescriptor = number | ArrayLike<number>;
export type Func = (...args: any[]) => any;
export type FunctionDefinition = [Func, FunctionDescriptor];
export type FunctionDefinitions = FunctionDefinition[];
export type Composer = { [k: string]: any };

type NextCall = () => any;
type Decomposer = (next?: NextCall) => any;
type FuncMap = Map<Func, FunctionDescriptor>;
type ValueDefinition = [{}, null];
interface Namespace {
	[k: string]: FunctionDefinition | FuncMap | ValueDefinition;
}

const root: Namespace = {
};

export interface ComposingGlobals {
	[k: string]: any;
}
export function from(globals: ComposingGlobals): Composer {
	const namespce = createNamespace(globals);
	const args = { ...(globals[$args] || {}) };
	return createComposer({
		globals: namespce,
		args,
		decomposer: next => next && next(),
		params: globals[$param] || [],
		setArgs: extendedArgs => Object.assign(args, extendedArgs),
		argsStack: [],
	});
}

interface ComposerArgs {
	globals: Namespace;
	parent?: Composer;
	decomposer: Decomposer;
	name?: PropertyKey;
	args: Record<string, any>;
	params: string[];
	setArgs: (args: Record<string, any>) => Record<string, any>;
	argsStack: any[];
	noFuncCall?: boolean;
}
function createComposer(args: ComposerArgs): Composer {
	function noop() { }
	const stab: Composer = Object.assign(noop as any, {
		[$arg]: args.args,

		[$decomposition](next?: NextCall) {
			if (args.parent) {
				args.parent[$decomposition](
					args.decomposer.bind(null, next)
				);
			}
			else {
				args.argsStack = [];
				args.decomposer(next);
			}
		},
		[$decompose](this: Composer, ...decompositionArgs) {
			if (decompositionArgs.length > 0) {
				args.setArgs(
					decompositionArgs.reduce((argsObj, value, index) => {
						argsObj[args.params[index]] = value;
						return argsObj;
					}, {})
				);
			}
			this[$decomposition]();
			return decomposeValue(this[$value]);
		},
		[$set](this: Composer, val): Composer {
			const that = this;
			return createComposer({
				...args,
				parent: stab,
				decomposer(next) {
					that[$thisArg] = null;
					that[$value] = () => val;
					args.argsStack.push(val);
					return next && next();
				},
			});
		}
	});
	const that = new Proxy(stab, {
		setPrototypeOf: () => false,
		defineProperty: () => false,
		get(target, prop, reciever) {
			if (typeof prop === 'symbol' &&
				-1 !== Object.getOwnPropertySymbols(target)
					.indexOf(prop)
			) {
				return Reflect.get(target, prop, reciever);
			}

			return createComposer({
				...args,
				parent: target,
				name: prop,
				decomposer(next) {
					target[$value] = resolveName(target, reciever, prop);
					target[$thisArg] = args.parent && args.parent[$value];
					args.argsStack.push(target[$value]);
					return next && next();
				},
			});
		},
		preventExtensions: () => false,
		set(target, prop, reciever) {
			return typeof prop === 'symbol' &&
				Reflect.set(target, prop, reciever);
		},
		deleteProperty: () => false,
		apply(target, thisArg, funcArgs: any[]) {
			return createComposer({
				...args,
				name: undefined,
				parent: target,
				decomposer(next) {
					const definition = resolveFunction(),
						forcedCall = funcArgs[funcArgs.length - 1] === _$,
						thisArg = args.parent && args.parent[$thisArg];
					let result;

					if (forcedCall) {
						funcArgs.pop();
					}

					if (thisArg && args.argsStack.length > 0) {
						funcArgs.push(args.argsStack.pop());
					}

					if (forcedCall || isCall(definition, funcArgs)) {
						result = call(definition, thisArg, funcArgs);
					}
					else {
						result = partialCall(definition, thisArg, funcArgs);
					}

					target[$value] = decomposeValue(result);
					target[$thisArg] = null;
					args.argsStack.push(result);
					return next && next();
				},
			}
			);
		},
		construct(target, args, newTarget) {
			return createComposer({ ...args });
		},
	});
	return that;

	function partialCall([func, argsMapping]: FunctionDefinition, thisArg: any, args: any[]): FunctionDefinition {
		const resultMapping = typeof argsMapping === 'number'
			? argsMapping - args.length
			: _(asArray(argsMapping))
				.slice(args.length)
				.map(i => i - args.length)
				.value();

		return [function (...laterArgs: any[]): any {
			const resultArgs = typeof argsMapping === 'number'
				? args.concat(laterArgs)
				: asArray(argsMapping).map(i => i < args.length
					? args[i]
					: laterArgs[i - args.length]
				);
			return func.apply(thisArg, resultArgs);
		}, resultMapping];
	}
	function call([func, argsMapping]: FunctionDefinition, thisArg: any, args: any[]): any {
		args = typeof argsMapping === 'number'
			? args
			: asArray(argsMapping).map(i => args[i]);
		return func.apply(decomposeValue(thisArg), args.map(decomposeValue));
	}
	function isCall([, argsMapping]: FunctionDefinition, args: any[]): boolean {
		return typeof argsMapping === 'number'
			? args.length >= argsMapping
			: args.length >= argsMapping.length;
	}
	function resolveFunction(): FunctionDefinition {
		if (args.parent &&
			isFunctionDefinition(args.parent[$value])
		) {
			return args.parent[$value];
		}

		if (args.parent &&
			typeof args.parent[$value] === 'function'
		) {
			return resolveUnamedFunc();
		}

		if (args.name &&
			args.globals[args.name] &&
			typeof args.globals[args.name][0] === 'function'
		) {
			return args.globals[args.name] as any;
		}
		throw new Error('Cannot resolve');


		function resolveUnamedFunc(): FunctionDefinition {
			const func = decomposeValue(args.parent![$value]) as Func,
				funcMap = args.globals[$funcs] as FuncMap;
			if (funcMap.has(func)
			) {
				return [func, funcMap.get(func)!];
			}

			const result: FunctionDefinition = [func, defaultAlloc(func.length)];
			funcMap.set(func, result[1]);
			return result;
		}
	}
	function resolveName(target: Composer, reciever: Composer, name: PropertyKey): any {
		let result;
		if (typeof name === 'symbol' &&
			-1 !== Object.getOwnPropertySymbols(target).indexOf(name)
		) {
			result = reciever[name];
		}
		const parentValue = args.parent && decomposeValue(args.parent[$value]);
		if (parentValue != null &&
			typeof parentValue[name] !== 'undefined'
		) {
			result = parentValue[name];
		}
		if (isPropOf(args.args, name)) {
			result = decomposeValue(args.args[name]);
		}
		if (isPropOf(args.globals, name)) {
			result = args.globals[name];
		}
		return isValueDefinition(result)
			? result[0]
			: result;
	}
}

function isPropOf(val, prop) {
	return Object.prototype.hasOwnProperty.call(val, prop);
}
function asArray<T>(arrayLike: ArrayLike<T>) {
	return arrayLike instanceof Array
		? arrayLike as T[]
		: Array.from(arrayLike);
}

function createNamespace(globals: ComposingGlobals): Namespace {
	const namespace = Object.create(root);
	const funcs = namespace[$funcs] = new Map(root[$funcs] as FuncMap);
	appendNamedFunctions(globals);

	globals[$namespaces] && appendNamedFunctions(globals[$namespaces], true);
	globals[$methods] && (globals[$methods] as FunctionDefinitions)
		.forEach(([func, descriptor]) => void funcs.set(func, descriptor));

	return namespace;

	function appendNamedFunctions(source, noDefinitions = false) {
		Object.keys(source)
			.map(name => [name, source[name]] as [string, Func | FunctionDefinition | {}])
			.forEach(([name, value]) => {
				if (typeof value === 'function') {
					namespace[name] = [value, defaultAlloc(value.length)];
				}
				else if (!noDefinitions && isFunctionDefinition(value)) {
					namespace[name] = value;
					const [func, definition] = value;
					!funcs.has(func) && funcs.set(func, definition);
				}
				else {
					namespace[name] = [value, null];
				}
			});
	}
}

function defaultAlloc(length) {
	return Array.from({ length }, (_, i) => i);
}
// function reverseAlloca(length) {
// 	return Array.from({ length }, (_, i) => length - i - 1);
// }

function isValueDefinition(val): val is ValueDefinition {
	return Array.isArray(val) &&
		val.length === 2 &&
		val[1] == null;
}
function isFunctionDefinition(val): val is FunctionDefinition {
	return (val instanceof Array) &&
		val.length === 2 &&
		typeof val[0] === 'function' &&
		(typeof val[1] === 'number' ||
			Array.isArray(val[1]));
}

function isComposer(val): val is Composer {
	return val && typeof val[$decompose] === 'function';
}

function decomposeValue(val): any {
	return isComposer(val)
		? val[$decompose]()
		: val;
}

export default { from };
