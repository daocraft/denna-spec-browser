<script lang="ts">
	import { isRate, isAmount, isDuration, isAddressObject } from '$lib/denna/detect.js';
	import { formatRate, formatAmount, formatDuration, shortenAddress } from '$lib/denna/render.js';
	import { getSchemaTypeHint } from '$lib/denna/schema.js';
	import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-svelte';
	import type { Rate, Amount, Duration } from '$lib/denna/types.js';
	import JsonViewer from './JsonViewer.svelte';

	interface Props {
		value: unknown;
		depth?: number;
		schema?: unknown;
		schemaPath?: (string | number)[];
	}

	let { value, depth = 0, schema = null, schemaPath = [] }: Props = $props();

	let collapsed = $state(depth > 1);
	let copied = $state(false);

	type NodeType =
		| 'null' | 'boolean' | 'number' | 'string' | 'date'
		| 'rate' | 'amount' | 'duration' | 'address'
		| 'primitive-array' | 'uniform-object-array' | 'array' | 'object';

	function isPrimitive(v: unknown): boolean {
		return v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
	}

	function isPrimitiveArray(arr: unknown[]): boolean {
		return arr.every(isPrimitive);
	}

	function isUniformObjectArray(arr: unknown[]): boolean {
		if (arr.length === 0) return false;
		return arr.every(item => item !== null && typeof item === 'object' && !Array.isArray(item));
	}

	function getTableColumns(arr: unknown[]): string[] {
		const keys = new Set<string>();
		for (const item of arr) {
			if (item && typeof item === 'object' && !Array.isArray(item)) {
				for (const k of Object.keys(item as Record<string, unknown>)) {
					keys.add(k);
				}
			}
		}
		return Array.from(keys);
	}

	function getType(v: unknown): NodeType {
		if (v === null || v === undefined) return 'null';
		if (typeof v === 'boolean') return 'boolean';
		if (typeof v === 'number') return 'number';

		// Schema-first: use $ref resolution before duck-typing
		if (schema && schemaPath.length > 0) {
			const hint = getSchemaTypeHint(schema, schemaPath);
			if (hint === 'rate') return 'rate';
			if (hint === 'amount') return 'amount';
			if (hint === 'duration') return 'duration';
			if (hint === 'address') return 'address';
			if (hint === 'date') return 'date';
			// 'chain' is a plain string — falls through to string handling below
		}

		if (typeof v === 'string') {
			if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'date';
			return 'string';
		}
		if (isRate(v)) return 'rate';
		if (isAmount(v)) return 'amount';
		if (isDuration(v)) return 'duration';
		if (isAddressObject(v)) return 'address';
		if (Array.isArray(v)) {
			if (v.length === 0) return 'array';
			if (isPrimitiveArray(v)) return 'primitive-array';
			if (isUniformObjectArray(v)) return 'uniform-object-array';
			return 'array';
		}
		if (typeof v === 'object') return 'object';
		return 'string';
	}

	let type = $derived(getType(value));

	function isAddressString(s: string) {
		return /^0x[0-9a-fA-F]{16,}$/.test(s) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
	}

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#if type === 'null'}
	<span class="font-mono text-xs italic text-muted-foreground/40">null</span>

{:else if type === 'boolean'}
	<span class="text-xs font-medium px-1.5 py-0.5 rounded {(value as boolean)
		? 'bg-badge-success-bg text-badge-success'
		: 'bg-muted text-muted-foreground'}">
		{String(value)}
	</span>

{:else if type === 'number'}
	<span class="font-mono text-sm text-foreground">{value as number}</span>

{:else if type === 'date'}
	<span class="text-sm text-foreground">
		{new Date((value as string) + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
	</span>

{:else if type === 'string'}
	{#if isAddressString(value as string)}
		<button
			onclick={() => copy(value as string)}
			class="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors group"
			title={value as string}
		>
			<span>{shortenAddress(value as string)}</span>
			{#if copied}
				<Check class="w-3 h-3 text-badge-success" />
			{:else}
				<Copy class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
			{/if}
		</button>
	{:else if (value as string).length > 100 || (value as string).includes('\n')}
		<p class="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{value as string}</p>
	{:else}
		<span class="text-sm text-foreground">{value as string}</span>
	{/if}

{:else if type === 'rate'}
	<span class="font-mono text-sm font-semibold text-foreground">{formatRate(value as Rate)}</span>

{:else if type === 'amount'}
	<span class="font-mono text-sm font-semibold text-foreground">{formatAmount(value as Amount)}</span>

{:else if type === 'duration'}
	<span class="font-mono text-sm text-foreground">{formatDuration(value as Duration)}</span>

{:else if type === 'address'}
	{@const addr = value as { value: string; format: string }}
	<button
		onclick={() => copy(addr.value)}
		class="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors group"
		title={addr.value}
	>
		<span class="text-muted-foreground/40">{addr.format}:</span>
		<span>{shortenAddress(addr.value)}</span>
		{#if copied}
			<Check class="w-3 h-3 text-badge-success" />
		{:else}
			<Copy class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
		{/if}
	</button>

{:else if type === 'primitive-array'}
	{@const arr = value as unknown[]}
	{#if arr.length === 0}
		<span class="text-xs italic text-muted-foreground/40">empty</span>
	{:else}
		<div class="flex flex-wrap gap-1.5">
			{#each arr as item}
				<span class="px-2 py-0.5 rounded-full text-xs font-mono bg-muted text-muted-foreground">
					{item === null ? 'null' : String(item)}
				</span>
			{/each}
		</div>
	{/if}

{:else if type === 'uniform-object-array'}
	{@const arr = value as unknown[]}
	{@const columns = getTableColumns(arr)}
	{#if depth > 1}
		<button
			onclick={() => (collapsed = !collapsed)}
			class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
		>
			{#if collapsed}
				<ChevronRight class="w-3.5 h-3.5" />
			{:else}
				<ChevronDown class="w-3.5 h-3.5" />
			{/if}
			<span class="font-mono">{collapsed ? `[ ${arr.length} item${arr.length !== 1 ? 's' : ''} ]` : `[ ${arr.length} ]`}</span>
		</button>
	{/if}
	{#if !collapsed || depth <= 1}
		<div class="overflow-x-auto rounded border border-border/60 {depth > 0 ? 'mt-1' : ''}">
			<table class="w-full text-xs min-w-max">
				<thead>
					<tr class="bg-muted/40 border-b border-border">
						{#each columns as col}
							<th class="px-3 py-2 text-left font-mono font-semibold text-muted-foreground whitespace-nowrap">{col}</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-border/40">
					{#each arr as row}
						{@const rowObj = row as Record<string, unknown>}
						<tr class="hover:bg-muted/20 transition-colors">
							{#each columns as col}
								<td class="px-3 py-2 align-top">
									<JsonViewer value={rowObj[col] ?? null} depth={2} schema={schema} schemaPath={[...schemaPath, 0, col]} />
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

{:else if type === 'array'}
	{@const arr = value as unknown[]}
	{#if depth > 0}
		<button
			onclick={() => (collapsed = !collapsed)}
			class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
		>
			{#if collapsed}
				<ChevronRight class="w-3.5 h-3.5" />
			{:else}
				<ChevronDown class="w-3.5 h-3.5" />
			{/if}
			<span class="font-mono">{collapsed ? `[ ${arr.length} item${arr.length !== 1 ? 's' : ''} ]` : `[ ${arr.length} ]`}</span>
		</button>
	{/if}
	{#if !collapsed || depth === 0}
		{#if arr.length === 0}
			<span class="text-xs italic text-muted-foreground/40">empty</span>
		{:else}
			<div class="{depth > 0 ? 'pl-3 border-l border-border/40 mt-1' : ''} space-y-2">
				{#each arr as item, i}
					<div class="flex items-start gap-2">
						<span class="text-[11px] font-mono text-muted-foreground/40 mt-0.5 w-5 text-right shrink-0 select-none">{i}</span>
						<div class="flex-1 min-w-0">
							<JsonViewer value={item} depth={depth + 1} schema={schema} schemaPath={[...schemaPath, i]} />
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

{:else if type === 'object'}
	{@const entries = Object.entries(value as Record<string, unknown>)}
	{#if depth > 0}
		<button
			onclick={() => (collapsed = !collapsed)}
			class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
		>
			{#if collapsed}
				<ChevronRight class="w-3.5 h-3.5" />
			{:else}
				<ChevronDown class="w-3.5 h-3.5" />
			{/if}
			<span class="font-mono">{collapsed ? `{ ${entries.length} field${entries.length !== 1 ? 's' : ''} }` : `{ ${entries.length} }`}</span>
		</button>
	{/if}
	{#if !collapsed || depth === 0}
		{#if entries.length === 0}
			<span class="text-xs italic text-muted-foreground/40">{'{}'}</span>
		{:else}
			<div class="{depth > 0 ? 'pl-3 border-l border-border/40 mt-1' : ''} space-y-2">
				{#each entries as [k, v]}
					<div class="flex items-start gap-3">
						<span class="text-xs font-mono font-semibold text-muted-foreground shrink-0 pt-0.5" style="min-width: 7rem">{k}</span>
						<div class="flex-1 min-w-0">
							<JsonViewer value={v} depth={depth + 1} schema={schema} schemaPath={[...schemaPath, k]} />
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
{/if}
