<script lang="ts">
	import type { Duration } from '$lib/denna/types.js';

	interface Props {
		label: string;
		value: Duration;
		onChange: (value: Duration) => void;
	}

	let { label, value, onChange }: Props = $props();

	function handleValueChange(e: Event) {
		const num = parseFloat((e.target as HTMLInputElement).value);
		if (!isNaN(num)) onChange({ ...value, value: num });
	}

	function handleUnitChange(e: Event) {
		onChange({ ...value, unit: (e.target as HTMLSelectElement).value as Duration['unit'] });
	}
</script>

<div class="space-y-1.5">
	{#if label}<label for="duration-value" class="text-xs font-medium text-muted-foreground">{label}</label>{/if}
	<div class="flex gap-2">
		<input
			id="duration-value"
			type="number"
			value={value.value}
			min="0"
			oninput={handleValueChange}
			class="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		/>
		<select
			value={value.unit}
			onchange={handleUnitChange}
			class="px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		>
			<option value="months">months</option>
			<option value="days">days</option>
			<option value="hours">hours</option>
			<option value="seconds">seconds</option>
		</select>
	</div>
</div>
