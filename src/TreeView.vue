<template>
	<div style="user-select: none;">
		<div @click="toggleExpandTree" :style="{ 'margin-left': `${indent}px` }">
			<!-- <div>{{ depth !== 0 ? `└${expand ? '─' : '+'}` : '' }} {{ xpack.name }}</div> -->
			<div>{{ depth !== 0 ? `${expand ? '-' : '+'}` : '' }} {{ xpack.name }}</div>
		</div>
		<TreeView
			v-show="expand"
			v-for="xp in xpack.nodes"
			v-if="shouldRender( xp )"
			:key="xp.uuid"
			:xpack="xp"
			:depth="depth + 1"
		>
		</TreeView>
	</div>
</template>

<script>
import { XPack, RouterNode } from './xpack.js'

export default {
	name: 'TreeView',
	props: [ 'xpack', 'depth' ],
	data() {
		return {
			expand: true
		}
	},
	computed: {
		indent() {
			return 10 * this.depth
		},
	},
	methods: {
		shouldRender( xpack ) {
			return !( xpack instanceof RouterNode )
		},
		toggleExpandTree() {
			if ( this.xpack.nodes.length > 0 )
				this.expand = !this.expand
		}
	},
}
</script>

<style lang="sass">
</style>
