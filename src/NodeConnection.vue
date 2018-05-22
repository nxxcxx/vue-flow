<template>
	<g>
		<path
			@dblclick="disconnect"
			@mouseenter="onMouseEnter"
			@mouseleave="onMouseLeave"
			class="connectionGhost"
			:d="getBezierCurveString()"
			stroke-width="6.0"
			fill="rgba(0,0,0,0)"
		/>
		<path
			class="connection"
			:d="getBezierCurveString()"
			:stroke="hover ? '#0bb1f9' : '#e6e6e6'"
			stroke-width="1.0"
			fill="rgba(0,0,0,0)"
		/>
	</g>
</template>

<script>
export default {
	name: 'NodeConnection',
	inject: [ '$EventBus' ],
	props: [ 'conn' ],
	data() {
		return {
			hover: false
		}
	},
	methods: {
		getBezierCurveString() {
			let [ x1, y1 ] = [ this.conn[ 0 ].position.x, this.conn[ 0 ].position.y ]
			let [ x2, y2 ] = [ this.conn[ 1 ].position.x, this.conn[ 1 ].position.y ]
			, hf = Math.abs( x1 - x2 ) * 0.5
			, [ cx1, cx2 ] = [ x1 + hf, x2 - hf ]
			return `M${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
		},
		disconnect() {
			this.$EventBus.$emit( 'io-disconnect', this.conn[ 1 ] )
		},
		onMouseEnter() {
			this.hover = true
		},
		onMouseLeave() {
			this.hover = false
		}
	}
}
</script>

<style lang="sass">
	.connection
		pointer-events: none
	.connectionGhost
		pointer-events: auto

</style>
