import { Octokit } from '@octokit/rest';
import type { DennaSpec, SpecFile } from './denna/types.js';

export function parseRepoUrl(url: string): { owner: string; repo: string } {
	try {
		const u = new URL(url.trim());
		const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
		if (parts.length < 2 || !parts[0] || !parts[1]) {
			throw new Error('Invalid GitHub URL');
		}
		return { owner: parts[0], repo: parts[1] };
	} catch {
		throw new Error('Invalid GitHub repository URL');
	}
}

function getOctokit(token?: string) {
	return new Octokit({ auth: token });
}

export async function discoverSpecFiles(
	owner: string,
	repo: string,
	token?: string
): Promise<SpecFile[]> {
	const octokit = getOctokit(token);

	// Get default branch
	const { data: repoData } = await octokit.repos.get({ owner, repo });
	const defaultBranch = repoData.default_branch;

	// Get full tree recursively
	const { data: treeData } = await octokit.git.getTree({
		owner,
		repo,
		tree_sha: defaultBranch,
		recursive: '1'
	});

	return (treeData.tree ?? [])
		.filter((item) => item.path?.endsWith('.denna-spec.json') && item.type === 'blob')
		.map((item) => ({
			path: item.path!,
			sha: item.sha!
		}));
}

export async function fetchRepoTags(
	owner: string,
	repo: string,
	token?: string
): Promise<{ name: string }[]> {
	const octokit = getOctokit(token);
	const { data } = await octokit.repos.listTags({ owner, repo, per_page: 50 });
	return data.map((t) => ({ name: t.name }));
}

export async function fetchSpecFile(
	owner: string,
	repo: string,
	path: string,
	token?: string,
	ref?: string
): Promise<{ content: DennaSpec; sha: string; rawText: string }> {
	const octokit = getOctokit(token);

	const { data } = await octokit.repos.getContent({ owner, repo, path, ...(ref ? { ref } : {}) });

	if (Array.isArray(data) || data.type !== 'file') {
		throw new Error('Expected a file, got directory');
	}

	// atob returns a binary string (each char = one byte).
	// Use TextDecoder so multi-byte UTF-8 characters (em-dashes, ×, etc.) are preserved.
	const binaryStr = atob(data.content.replace(/\n/g, ''));
	const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
	const rawText = new TextDecoder().decode(bytes);
	const content = JSON.parse(rawText) as DennaSpec;

	return { content, sha: data.sha, rawText };
}

function detectIndent(raw: string): string | number {
	for (const line of raw.split('\n')) {
		const m = line.match(/^(\t+| {2,})/);
		if (m) return m[1].startsWith('\t') ? '\t' : m[1].length;
	}
	return 2;
}

// Maps canonical JSON.stringify(value) → original inline representation (compact objects/arrays).
// Used as a fallback when formatting structurally-changed values.
function buildCompactMap(rawText: string): Map<string, string> {
	const map = new Map<string, string>();
	for (const line of rawText.split('\n')) {
		const valueStr = line.trim().replace(/^"[^"]*"\s*:\s*/, '').replace(/,$/, '').trim();
		if (
			(valueStr.startsWith('{') && valueStr.endsWith('}')) ||
			(valueStr.startsWith('[') && valueStr.endsWith(']'))
		) {
			try {
				const parsed = JSON.parse(valueStr);
				const key = JSON.stringify(parsed);
				if (!map.has(key)) map.set(key, valueStr);
			} catch {
				// not a complete inline JSON value on this line
			}
		}
	}
	return map;
}

// Serialize value preserving compact-object style (fallback for structural changes).
function formatJson(
	value: unknown,
	indent: string | number,
	compactMap: Map<string, string>,
	depth = 0
): string {
	if (value === null || value === undefined) return 'null';
	if (typeof value !== 'object') return JSON.stringify(value);

	const key = JSON.stringify(value);
	if (compactMap.has(key)) return compactMap.get(key)!;

	const indentStr = typeof indent === 'number' ? ' '.repeat(indent) : indent;
	const pad = indentStr.repeat(depth + 1);
	const closePad = indentStr.repeat(depth);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = (value as unknown[]).map((v) => pad + formatJson(v, indent, compactMap, depth + 1));
		return `[\n${items.join(',\n')}\n${closePad}]`;
	}

	const entries = Object.entries(value as Record<string, unknown>);
	if (entries.length === 0) return '{}';
	const items = entries.map(
		([k, v]) => `${pad}${JSON.stringify(k)}: ${formatJson(v, indent, compactMap, depth + 1)}`
	);
	return `{\n${items.join(',\n')}\n${closePad}}`;
}

// Find the exact character range of the JSON value at a given path in rawText.
function findValueRange(
	text: string,
	path: (string | number)[]
): { start: number; end: number } | null {
	let pos = 0;
	const n = text.length;

	const ws = () => {
		while (pos < n && (text[pos] === ' ' || text[pos] === '\t' || text[pos] === '\n' || text[pos] === '\r'))
			pos++;
	};
	const scanStr = () => {
		pos++; // opening "
		while (pos < n) {
			if (text[pos] === '\\') pos += 2;
			else if (text[pos] === '"') { pos++; return; }
			else pos++;
		}
	};
	const scanVal = () => {
		ws();
		if (pos >= n) return;
		const ch = text[pos];
		if (ch === '"') {
			scanStr();
		} else if (ch === '{') {
			pos++; ws();
			if (pos < n && text[pos] === '}') { pos++; return; }
			while (pos < n) { ws(); scanStr(); ws(); pos++; ws(); scanVal(); ws();
				if (text[pos] === ',') { pos++; continue; }
				if (text[pos] === '}') { pos++; return; }
				break;
			}
		} else if (ch === '[') {
			pos++; ws();
			if (pos < n && text[pos] === ']') { pos++; return; }
			while (pos < n) { ws(); scanVal(); ws();
				if (text[pos] === ',') { pos++; continue; }
				if (text[pos] === ']') { pos++; return; }
				break;
			}
		} else {
			while (pos < n && text[pos] !== ',' && text[pos] !== '}' && text[pos] !== ']' &&
				text[pos] !== ' ' && text[pos] !== '\t' && text[pos] !== '\n' && text[pos] !== '\r')
				pos++;
		}
	};

	const traverse = (depth: number): { start: number; end: number } | null => {
		ws();
		if (depth === path.length) {
			const start = pos;
			scanVal();
			return { start, end: pos };
		}
		const key = path[depth];
		const ch = text[pos];
		if (ch === '{' && typeof key === 'string') {
			pos++; ws();
			if (pos >= n || text[pos] === '}') return null;
			while (pos < n) {
				ws();
				const ks = pos; scanStr();
				const k = JSON.parse(text.slice(ks, pos));
				ws(); pos++; ws(); // skip ':'
				if (k === key) return traverse(depth + 1);
				scanVal(); ws();
				if (text[pos] === ',') { pos++; continue; }
				break;
			}
		} else if (ch === '[' && typeof key === 'number') {
			pos++; ws();
			if (pos >= n || text[pos] === ']') return null;
			for (let idx = 0; pos < n; idx++) {
				ws();
				if (idx === key) return traverse(depth + 1);
				scanVal(); ws();
				if (text[pos] === ',') { pos++; continue; }
				break;
			}
		}
		return null;
	};

	return traverse(0);
}

type Diff = { path: (string | number)[]; value: unknown };

// Compute leaf-level diffs: returns only the paths where values changed.
function computeDiffs(original: unknown, updated: unknown, path: (string | number)[] = []): Diff[] {
	if (JSON.stringify(original) === JSON.stringify(updated)) return [];

	if (
		typeof original !== 'object' || original === null ||
		typeof updated !== 'object' || updated === null ||
		Array.isArray(original) !== Array.isArray(updated)
	) {
		return [{ path, value: updated }];
	}

	if (Array.isArray(original) && Array.isArray(updated)) {
		if (original.length !== updated.length) return [{ path, value: updated }];
		const diffs: Diff[] = [];
		for (let i = 0; i < original.length; i++)
			diffs.push(...computeDiffs(original[i], updated[i], [...path, i]));
		return diffs;
	}

	const orig = original as Record<string, unknown>;
	const upd = updated as Record<string, unknown>;
	const origKeys = Object.keys(orig);
	const updKeys = Object.keys(upd);

	// Keys added or removed → replace the whole object at this level
	if (origKeys.length !== updKeys.length || origKeys.some((k, i) => k !== updKeys[i])) {
		return [{ path, value: updated }];
	}

	const diffs: Diff[] = [];
	for (const k of origKeys)
		diffs.push(...computeDiffs(orig[k], upd[k], [...path, k]));
	return diffs;
}

// Apply only the changed values into rawText, leaving everything else byte-for-byte identical.
function patchRawText(
	rawText: string,
	original: unknown,
	updated: unknown,
	indent: string | number,
	compactMap: Map<string, string>
): string {
	const diffs = computeDiffs(original, updated);
	if (diffs.length === 0) return rawText;

	const patches: Array<{ start: number; end: number; replacement: string }> = [];
	for (const { path, value } of diffs) {
		const range = findValueRange(rawText, path);
		if (!range) continue;
		const replacement =
			value === null || typeof value !== 'object'
				? JSON.stringify(value)
				: formatJson(value, indent, compactMap, path.length);
		patches.push({ ...range, replacement });
	}

	// Apply end-to-start so earlier offsets stay valid
	patches.sort((a, b) => b.start - a.start);
	let result = rawText;
	for (const { start, end, replacement } of patches) {
		result = result.slice(0, start) + replacement + result.slice(end);
	}
	return result;
}

export async function createSpecPr(
	token: string,
	owner: string,
	repo: string,
	path: string,
	originalSha: string,
	newContent: DennaSpec,
	commitMessage: string,
	rawText?: string
): Promise<string> {
	const octokit = getOctokit(token);

	// Check write access
	let targetOwner = owner;
	let targetRepo = repo;

	try {
		const { data: repoData } = await octokit.repos.get({ owner, repo });
		if (!repoData.permissions?.push) {
			// Fork the repo
			const { data: forkData } = await octokit.repos.createFork({ owner, repo });
			targetOwner = forkData.owner.login;
			targetRepo = forkData.name;

			// Wait briefly for fork to be ready
			await new Promise((r) => setTimeout(r, 3000));
		}
	} catch {
		// If we can't check permissions, try forking
		const { data: forkData } = await octokit.repos.createFork({ owner, repo });
		targetOwner = forkData.owner.login;
		targetRepo = forkData.name;
		await new Promise((r) => setTimeout(r, 3000));
	}

	// Get default branch of target
	const { data: targetRepoData } = await octokit.repos.get({
		owner: targetOwner,
		repo: targetRepo
	});
	const defaultBranch = targetRepoData.default_branch;

	// Get the SHA of the default branch HEAD
	const { data: refData } = await octokit.git.getRef({
		owner: targetOwner,
		repo: targetRepo,
		ref: `heads/${defaultBranch}`
	});
	const headSha = refData.object.sha;

	// Create a new branch
	const branchName = `denna-edit/${Date.now()}`;
	await octokit.git.createRef({
		owner: targetOwner,
		repo: targetRepo,
		ref: `refs/heads/${branchName}`,
		sha: headSha
	});

	// Surgically patch only the changed values; everything else stays byte-for-byte identical.
	const indent = rawText ? detectIndent(rawText) : 2;
	const compactMap = rawText ? buildCompactMap(rawText) : new Map<string, string>();
	const originalParsed = rawText ? (JSON.parse(rawText) as unknown) : null;
	let newContentStr =
		rawText && originalParsed !== null
			? patchRawText(rawText, originalParsed, newContent, indent, compactMap)
			: formatJson(newContent, indent, compactMap);
	if (rawText?.endsWith('\n') && !newContentStr.endsWith('\n')) newContentStr += '\n';
	const encodedContent = btoa(unescape(encodeURIComponent(newContentStr)));

	await octokit.repos.createOrUpdateFileContents({
		owner: targetOwner,
		repo: targetRepo,
		path,
		message: commitMessage,
		content: encodedContent,
		sha: originalSha,
		branch: branchName
	});

	// Create a PR back to the original repo
	const specName = newContent.metadata?.name ?? path.split('/').pop() ?? path;
	const { data: prData } = await octokit.pulls.create({
		owner,
		repo,
		title: `Update ${specName} spec`,
		body: `Updated via [Denna Spec Browser](https://browser.spec.denna.io)\n\n${commitMessage}`,
		head: targetOwner === owner ? branchName : `${targetOwner}:${branchName}`,
		base: defaultBranch
	});

	return prData.html_url;
}
