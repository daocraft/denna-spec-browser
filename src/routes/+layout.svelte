<script lang="ts">
	import '../app.css';
	import { user } from '$lib/stores/auth.js';
	import { theme } from '$lib/stores/theme.js';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	$effect(() => {
		user.set(data.user ?? null);
	});

	// Apply theme class to <html> on mount and whenever theme changes
	$effect(() => {
		document.documentElement.classList.toggle('dark', $theme === 'dark');
	});
</script>

{@render children()}
