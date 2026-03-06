<script lang="ts">
	import { Copy, Check } from 'lucide-svelte';
	import type { DennaSpec } from '$lib/denna/types.js';

	interface Props {
		content: DennaSpec;
	}

	let { content }: Props = $props();

	let copied = $state(false);

	let highlighted = $derived(() => {
		const json = JSON.stringify(content, null, 2);
		return json
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(
				/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
				(match) => {
					let cls = 'text-blue-500 dark:text-blue-400';
					if (/^"/.test(match)) {
						if (/:$/.test(match)) {
							cls = 'text-orange-500 dark:text-orange-400 font-medium';
						} else {
							cls = 'text-green-600 dark:text-green-400';
						}
					} else if (/true|false/.test(match)) {
						cls = 'text-purple-500 dark:text-purple-400';
					} else if (/null/.test(match)) {
						cls = 'text-gray-400';
					}
					return `<span class="${cls}">${match}</span>`;
				}
			);
	});

	async function copyJson() {
		await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="relative">
	<button
		onclick={copyJson}
		class="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-card border border-border rounded-md px-2 py-1"
	>
		{#if copied}
			<Check class="w-3.5 h-3.5 text-green-500" />
			Copied
		{:else}
			<Copy class="w-3.5 h-3.5" />
			Copy
		{/if}
	</button>
	<pre
		class="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed max-h-[70vh] overflow-y-auto"
	><code>{@html highlighted()}</code></pre>
</div>
