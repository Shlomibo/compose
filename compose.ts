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
export interface Composer {
	[k: string]: any;
	[k: number]: any;
	(...args): any;
	new (): Composer;
}

type NextCall = (parentVal) => any;
type Decomposer = (next?: NextCall, parentValue?) => any;
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
		decomposer: (next, parentValue) => next && next(parentValue),
		params: globals[$param] || [],
		setArgs: extendedArgs => Object.assign(args, extendedArgs),
		argsStack: [],
	});
}

enum CallType {
	partial,
	consumeArg,
	leaveArg,
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
		[$value]: undefined,

		[$decomposition](next?: NextCall) {
			let result;
			if (args.parent) {
				result = args.parent[$decomposition](
					args.decomposer.bind(null, next)
				);
			}
			else {
				args.argsStack = [];
				result = args.decomposer(next);
			}
			return result;
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
			return decomposeValue(this[$decomposition]());
		},
		[$set](this: Composer, val): Composer {
			return createComposer({
				...args,
				parent: stab,
				decomposer(next) {
					stab[$thisArg] = null;
					stab[$value] = val;
					pushArg();
					return !!next
						? next(val)
						: val;
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
				decomposer(next, parentValue) {
					const value = target[$value] = resolveName(target, reciever, prop, parentValue);
					target[$thisArg] = parentValue;
					return !!next
						? next(value)
						: value;
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
				decomposer(next, parentValue) {
					const definition = resolveFunction(parentValue),
						forcedCall = funcArgs[funcArgs.length - 1] === _$,
						thisArg = args.parent && args.parent[$thisArg];
					let result;

					if (forcedCall) {
						funcArgs.pop();
					}

					let callType = checkCallType(definition, funcArgs);

					if (args.argsStack.length > 0 &&
						(forcedCall ||
							callType !== CallType.leaveArg)
					) {
						funcArgs.push(args.argsStack.pop());
					}
					else if (args.argsStack.length === 0 &&
						callType === CallType.consumeArg
					) {
						callType = CallType.partial;
					}


					if (forcedCall || callType !== CallType.partial) {
						result = call(definition, thisArg, funcArgs);
					}
					else {
						result = partialCall(definition, thisArg, funcArgs);
					}

					const decomposedResult = target[$value] = decomposeValue(result);
					target[$thisArg] = null;
					args.argsStack.push(result);
					return !!next
						? next(decomposedResult)
						: decomposedResult;
				},
			}
			);
		},
		construct(target, [globalsExt]: [ComposingGlobals], newTarget) {
			const newGlobals = createNamespace(globalsExt || {}),
				newFuncs = newGlobals[$funcs] as FuncMap,
				existingFuncs = args.globals[$funcs] as FuncMap;

			existingFuncs.forEach((descriptor, func) => void newFuncs.set(func, descriptor));

			return createComposer({
				...args,
				parent: newTarget,
				globals: {
					...args.globals,
					...newGlobals,
				}
			});
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
	function checkCallType([, argsMapping]: FunctionDefinition, args: any[]): CallType {
		const funcLength = typeof argsMapping === 'number'
			? argsMapping
			: argsMapping.length;

		return args.length < funcLength - 1 ? CallType.partial :
			args.length < funcLength ? CallType.consumeArg :
				CallType.leaveArg;
	}
	function resolveFunction(parentValue): FunctionDefinition {
		if (args.parent &&
			isFunctionDefinition(parentValue)
		) {
			return parentValue;
		}

		if (args.parent &&
			typeof parentValue === 'function'
		) {
			return resolveUnamedFunc();
		}

		if (args.name &&
			args.globals[args.name] &&
			typeof args.globals[args.name][0] === 'function'
		) {
			pushArg();
			return args.globals[args.name] as any;
		}
		throw new Error('Cannot resolve');


		function resolveUnamedFunc(): FunctionDefinition {
			const func = decomposeValue(args.parent![$value]) as Func,
				funcMap = args.globals[$funcs] as FuncMap;
			if (funcMap.has(func)
			) {
				return [func, funcMap.get(func) !];
			}

			const result: FunctionDefinition = [func, defaultAlloc(func.length)];
			funcMap.set(func, result[1]);
			return result;
		}

	}
	function pushArg() {
		if (args.parent) {
			args.argsStack.push(args.parent[$value]);
		}
	}
	function resolveName(target: Composer, reciever: Composer, name: PropertyKey, parentValue): any {
		if (typeof name === 'symbol' &&
			-1 !== Object.getOwnPropertySymbols(target).indexOf(name)
		) {
			return reciever[name];
		}

		let result;
		if (parentValue != null &&
			typeof parentValue[name] !== 'undefined'
		) {
			result = parentValue[name];
		}
		else if (isPropOf(args.args, name)) {
			pushArg();
			result = decomposeValue(args.args[name]);
		}
		else if (isPropOf(args.globals, name)) {
			pushArg();
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
