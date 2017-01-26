import {
	$namspaces,
	$funcs,
	$methods,
} from './symbols';

export type Func = (...args: any[]) => any;
export type FunctionDefinition = Func | [Func, number];
export type FunctionDefinitions = [Func, number][];
export type Composer = { [k: string]: any };
type FuncMap = Map<Func, number>;

interface Namespace {
	[k: string]: [Func, number] | FuncMap;
}

const root: Namespace = {};

export interface ComposingGlobals {
	[k: string]: FunctionDefinition | FunctionDefinitions | {};
}

export function from(globals: ComposingGlobals): Composer {
	const namespce = createGlobalNamespace(globals);
	return createComposer({ globalNamespace: namespce });
}

interface ComposerArgs {
	globalNamespace: Namespace;
}
function createComposer(args: ComposerArgs): Composer {
	return new Proxy({}, {

	});
}

function createGlobalNamespace(globals: ComposingGlobals): Namespace {
	const namespace = Object.create(root);
	const funcs = namespace[$funcs] = new Map(root[$funcs] as FuncMap);
	appendNamedFunctions(globals);

	globals[$namspaces] && appendNamedFunctions(globals[$namspaces], true);
	globals[$methods] && (globals[$methods] as FunctionDefinitions)
		.forEach(([func, length]) => void funcs.set(func, length));

	return namespace;

	function appendNamedFunctions(source, noDefinitions = false) {
		Object.keys(source)
			.map(name => [name, globals[name]] as [string, FunctionDefinition | {}])
			.forEach(([name, value]) => {
				if (typeof value === 'function') {
					namespace[name] = [value, value.length];
				}
				else if (!noDefinitions && isFunctionDefinition(value)) {
					namespace[name] = value;
					!funcs.has(value[0]) && funcs.set(value[0], value[1]);
				}
				else {
					namespace[name] = [() => value, 0];
				}
			});
	}
}

function isFunctionDefinition(val): val is FunctionDefinition {
	return (val instanceof Array) &&
		val.length === 2 &&
		typeof val[0] === 'function' &&
		typeof val[1] === 'number';
}

export default { from };
