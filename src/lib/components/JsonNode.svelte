<script lang="ts">
	import { isRate, isAmount, isDuration, isAddressObject } from '$lib/denna/detect.js';
	import RateField from './fields/RateField.svelte';
	import AmountField from './fields/AmountField.svelte';
	import DurationField from './fields/DurationField.svelte';
	import AddressField from './fields/AddressField.svelte';
	import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-svelte';
	// Self-referential import for recursion
	import JsonNode from './JsonNode.svelte';

	interface Props {
		value: unknown;
		onChange: (v: unknown) => void;
		depth?: number;
		/** key name in parent, used for display hints */
		keyName?: string;
	}

	let { value, onChange, depth = 0, keyName = '' }: Props = $props();

	// Collapse objects/arrays by default when nested
	let collapsed = $state(depth > 1);

	type NodeType =
		| 'null'
		| 'boolean'
		| 'number'
		| 'string'
		| 'date'
		| 'rate'
		| 'amount'
		| 'duration'
		| 'address'
		| 'array'
		| 'object';

	function getType(v: unknown): NodeType {
		if (v === null || v === undefined) return 'null';
		if (typeof v === 'boolean') return 'boolean';
		if (typeof v === 'number') return 'number';
		if (typeof v === 'string') {
			if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'date';
			return 'string';
		}
		if (isRate(v)) return 'rate';
		if (isAmount(v)) return 'amount';
		if (isDuration(v)) return 'duration';
		if (isAddressObject(v)) return 'address';
		if (Array.isArray(v)) return 'array';
		if (typeof v === 'object') return 'object';
		return 'string';
	}

	let type = $derived(getType(value));

	// --- Object helpers ---
	let newObjKey = $state('');

	function updateObjKey(k: string, newVal: unknown) {
		onChange({ ...(value as Record<string, unknown>), [k]: newVal });
	}

	function removeObjKey(k: string) {
		const obj = { ...(value as Record<string, unknown>) };
		delete obj[k];
		onChange(obj);
	}

	function addObjKey() {
		if (!newObjKey.trim()) return;
		onChange({ ...(value as Record<string, unknown>), [newObjKey.trim()]: '' });
		newObjKey = '';
	}

	// --- Array helpers ---
	function updateArrItem(i: number, newVal: unknown) {
		const arr = [...(value as unknown[])];
		arr[i] = newVal;
		onChange(arr);
	}

	function removeArrItem(i: number) {
		const arr = [...(value as unknown[])];
		arr.splice(i, 1);
		onChange(arr);
	}

	function addArrItem() {
		const arr = [...(value as unknown[])];
		// Infer sensible default from existing items
		const last = arr[arr.length - 1];
		let newItem: unknown = '';
		if (last !== undefined) {
			const t = getType(last);
			if (t === 'number') newItem = 0;
			else if (t === 'boolean') newItem = false;
			else if (t === 'null') newItem = null;
			else if (t === 'rate') newItem = { value: 0, unit: 'bps' };
			else if (t === 'amount') newItem = { value: 0, currency: 'USD' };
			else if (t === 'duration') newItem = { value: 0, unit: 'days' };
			else if (t === 'address') newItem = { value: '', format: 'evm' };
			else if (t === 'object') newItem = JSON.parse(JSON.stringify(last));
			else if (t === 'array') newItem = [];
			else newItem = '';
		}
		arr.push(newItem);
		onChange(arr);
	}

	// Determine if a string value should use a textarea
	function isMultiline(s: string) {
		return s.includes('\n') || s.length > 80;
	}

	const inputClass =
		'w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono';

	const indentClass = 'pl-3 border-l border-border/50';
</script>

{#if type === 'null'}
	<div class="flex items-center gap-2">
		<span class="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground font-mono">null</span>
		<button
			onclick={() => onChange('')}
			class="text-xs text-muted-foreground hover:text-foreground underline"
		>set to string</button>
		<button
			onclick={() => onChange(0)}
			class="text-xs text-muted-foreground hover:text-foreground underline"
		>set to number</button>
	</div>

{:else if type === 'boolean'}
	<button
		role="switch"
		aria-checked={value as boolean}
		onclick={() => onChange(!(value as boolean))}
		class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {value ? 'bg-primary' : 'bg-muted-foreground/30'}"
	>
		<span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform {value ? 'translate-x-[18px]' : 'translate-x-[2px]'}"></span>
	</button>

{:else if type === 'number'}
	<input
		type="number"
		value={value as number}
		step="any"
		oninput={(e) => {
			const n = parseFloat((e.target as HTMLInputElement).value);
			if (!isNaN(n)) onChange(n);
		}}
		class={inputClass}
	/>

{:else if type === 'date'}
	<input
		type="date"
		value={value as string}
		oninput={(e) => onChange((e.target as HTMLInputElement).value)}
		class={inputClass}
	/>

{:else if type === 'string'}
	{#if isMultiline(value as string)}
		<textarea
			value={value as string}
			oninput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
			rows={3}
			class="{inputClass} resize-y"
		></textarea>
	{:else}
		<input
			type="text"
			value={value as string}
			oninput={(e) => onChange((e.target as HTMLInputElement).value)}
			class={inputClass}
		/>
	{/if}

{:else if type === 'rate'}
	<RateField
		label=""
		value={value as import('$lib/denna/types.js').Rate}
		onChange={(v) => onChange(v)}
	/>

{:else if type === 'amount'}
	<AmountField
		label=""
		value={value as import('$lib/denna/types.js').Amount}
		onChange={(v) => onChange(v)}
	/>

{:else if type === 'duration'}
	<DurationField
		label=""
		value={value as import('$lib/denna/types.js').Duration}
		onChange={(v) => onChange(v)}
	/>

{:else if type === 'address'}
	<AddressField
		label=""
		value={value as { value: string; format: string }}
		onChange={(v) => onChange(v)}
	/>

{:else if type === 'array'}
	{@const arr = value as unknown[]}
	<div class="space-y-1">
		{#if arr.length === 0}
			<span class="text-xs text-muted-foreground italic">empty array</span>
		{:else}
			<div class="{depth > 0 ? indentClass : ''} space-y-1.5">
				{#each arr as item, i}
					<div class="flex items-start gap-2 group">
						<span class="text-[11px] text-muted-foreground/50 font-mono mt-2 w-5 shrink-0 text-right select-none">{i}</span>
						<div class="flex-1 min-w-0">
							<JsonNode value={item} onChange={(v) => updateArrItem(i, v)} depth={depth + 1} />
						</div>
						<button
							onclick={() => removeArrItem(i)}
							aria-label="Remove item"
							class="mt-1.5 p-1 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
						>
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
		<button
			onclick={addArrItem}
			class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
		>
			<Plus class="w-3.5 h-3.5" />
			Add item
		</button>
	</div>

{:else if type === 'object'}
	{@const obj = value as Record<string, unknown>}
	{@const entries = Object.entries(obj)}
	<div>
		{#if depth > 0}
			<!-- Collapse toggle for nested objects -->
			<button
				onclick={() => (collapsed = !collapsed)}
				class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
			>
				{#if collapsed}
					<ChevronRight class="w-3.5 h-3.5" />
				{:else}
					<ChevronDown class="w-3.5 h-3.5" />
				{/if}
				<span class="font-mono">{collapsed ? `{ ${entries.length} fields }` : ''}</span>
			</button>
		{/if}

		{#if !collapsed}
			<div class="{depth > 0 ? indentClass : ''} space-y-3">
				{#each entries as [k, v]}
					<div class="group">
						<div class="flex items-start gap-2 justify-between mb-1">
							<span class="text-xs font-mono font-semibold text-muted-foreground pt-1.5 shrink-0">{k}</span>
							<button
								onclick={() => removeObjKey(k)}
								aria-label="Remove key"
								class="p-1 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
							>
								<Trash2 class="w-3 h-3" />
							</button>
						</div>
						<JsonNode value={v} onChange={(nv) => updateObjKey(k, nv)} depth={depth + 1} keyName={k} />
					</div>
				{/each}

				<!-- Add new key -->
				<div class="flex gap-2 pt-1">
					<input
						type="text"
						bind:value={newObjKey}
						placeholder="new key..."
						onkeydown={(e) => { if (e.key === 'Enter') addObjKey(); }}
						class="flex-1 px-2.5 py-1.5 text-xs font-mono border border-border/60 border-dashed rounded-md bg-transparent text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-border"
					/>
					<button
						onclick={addObjKey}
						class="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/60 border-dashed rounded-md hover:bg-muted/40 transition-colors"
					>
						<Plus class="w-3 h-3" />
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
