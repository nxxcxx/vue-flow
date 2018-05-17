<template>
	<div>
		<pre style="margin: 0px;">{{ indent }} {{ depth !== 0 ? '└─' : '' }} {{ xpack.name }}</pre>
		<TreeView
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
		}
	},
	computed: {
		indent() {
			return '  '.repeat( this.depth )
		}
	},
	methods: {
		shouldRender( xpack ) {
			return !( xpack instanceof RouterNode )
		},
	},
	mounted() {
	}
}
</script>

<style lang="sass">
</style>
