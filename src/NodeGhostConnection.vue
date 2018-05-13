<template>
	<line ref="ghostConnection"
		v-show="enable"
		:x1="x1" :y1="y1" :x2="x2" :y2="y2"
		stroke="#0bb1f9"
	/>
</template>

<script>
export default {
	name: 'NodeGhostConnection',
	inject: [ '$EventBus' ],
	data() {
		return {
			enable: false,
			x1: 0,
			y1: 0,
			x2: 0,
			y2: 0
		}
	},
	methods: {
	},
	mounted() {
		this.$EventBus.$on( 'io-start-connecting', io => {
			this.enable = true
			this.x1 = io.position.x
			this.y1 = io.position.y
		} )
		this.$EventBus.$on( 'ghost-connection-disable', io => {
			this.enable = false
		} )
		this.$EventBus.$on( 'ghost-connection-update', pos => {
			this.x2 = pos.x
			this.y2 = pos.y
		} )
	}
}
</script>

<style lang="sass">
</style>
