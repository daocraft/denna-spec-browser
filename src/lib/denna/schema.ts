/**
 * Schema-aware type resolution for Denna Spec files.
 *
 * Walks a fetched domain schema (JSON Schema object) along a data path and
 * returns the Denna semantic type at that location by recognising $refs to
 * https://spec.denna.io/v1/denna-types.schema.json.
 *
 * Falls back to undefined / null so callers can continue with duck-typing.
 */

export type DennaTypeName = 'rate' | 'amount' | 'duration' | 'address' | 'date' | 'chain';

type JSONSchema = Record<string, unknown>;

// Canonical Denna types schema URL (new v1 location)
const DENNA_TYPES_URL = 'https://spec.denna.io/v1/denna-types.schema.json';

// Fragment → semantic type name
const DENNA_TYPE_MAP: Record<string, DennaTypeName> = {
	'$defs/rate': 'rate',
	'$defs/amount': 'amount',
	'$defs/duration': 'duration',
	'$defs/address': 'address',
	'$defs/date': 'date',
	'$defs/chain': 'chain',
};

function parseDennaTypeRef(ref: string): DennaTypeName | null {
	// e.g. "https://spec.denna.io/v1/denna-types.schema.json#/$defs/rate"
	if (!ref.startsWith(DENNA_TYPES_URL + '#/')) return null;
	const fragment = ref.slice(DENNA_TYPES_URL.length + 2); // skip '#/'
	return DENNA_TYPE_MAP[fragment] ?? null;
}

function resolveLocalRef(ref: string, root: JSONSchema): JSONSchema | null {
	if (!ref.startsWith('#/')) return null;
	const parts = ref.slice(2).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
	let node: unknown = root;
	for (const part of parts) {
		if (!node || typeof node !== 'object') return null;
		node = (node as JSONSchema)[part];
	}
	return node !== null && typeof node === 'object' ? (node as JSONSchema) : null;
}

// Fully resolve local $refs; leave external $refs in place for type extraction.
function resolve(node: JSONSchema, root: JSONSchema): JSONSchema {
	if (typeof node.$ref !== 'string') return node;
	const ref = node.$ref as string;
	if (ref.startsWith('#')) {
		const resolved = resolveLocalRef(ref, root);
		return resolved ? resolve(resolved, root) : node;
	}
	return node; // External ref — preserved for parseDennaTypeRef
}

// Step the schema cursor one level deeper at key.
function stepInto(node: JSONSchema, key: string | number, root: JSONSchema): JSONSchema | null {
	const r = resolve(node, root);

	// External $ref node — no further navigation possible (it's a semantic leaf).
	if (typeof r.$ref === 'string' && !r.$ref.startsWith('#')) return null;

	if (typeof key === 'number') {
		const items = r.items;
		if (!items || typeof items !== 'object') return null;
		return resolve(items as JSONSchema, root);
	}

	const props = r.properties as Record<string, JSONSchema> | undefined;
	if (props?.[key]) return resolve(props[key], root);

	const addl = r.additionalProperties;
	if (addl && typeof addl === 'object') return resolve(addl as JSONSchema, root);

	return null;
}

/**
 * Walk `domainSchema` along `path` and return the Denna semantic type at that
 * location, or null if the path is unresolvable or the leaf isn't a Denna type.
 */
export function getSchemaTypeHint(
	domainSchema: unknown,
	path: (string | number)[]
): DennaTypeName | null {
	if (!domainSchema || typeof domainSchema !== 'object') return null;

	const root = domainSchema as JSONSchema;
	let current: JSONSchema = root;

	for (const key of path) {
		const next = stepInto(current, key, root);
		if (!next) return null;
		current = next;
	}

	// At the target node — check for an external $ref to a Denna type.
	const ref = current.$ref;
	if (typeof ref === 'string') {
		return parseDennaTypeRef(ref);
	}

	return null;
}

/**
 * Returns true if the schema declares a top-level `parameters` property,
 * meaning all domain data lives under a `parameters` key in spec files.
 * (e.g. io.denna.defi.pnl-config wraps everything in `parameters`)
 */
export function schemaHasParametersWrapper(domainSchema: unknown): boolean {
	if (!domainSchema || typeof domainSchema !== 'object') return false;
	const props = (domainSchema as JSONSchema).properties as Record<string, unknown> | undefined;
	return typeof props?.parameters === 'object' && props.parameters !== null;
}

/**
 * Extract the kind identifier from a schema's title field.
 * Schema titles follow the convention "io.denna.defi.protocol-config".
 */
export function getSchemaKind(domainSchema: unknown): string | null {
	if (!domainSchema || typeof domainSchema !== 'object') return null;
	const title = (domainSchema as JSONSchema).title;
	return typeof title === 'string' ? title : null;
}
