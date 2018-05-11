<template>
	<path
		@dblclick="disconnect"
		class="connection"
		:d="getBezierCurveString()"
		stroke="#e6e6e6"
		stroke-width="1.5"
		fill="rgba(0,0,0,0)"
	/>
</template>

<script>
import EventBus from './EventBus.js'

export default {
	name: 'NodeConnection',
	props: [ 'conn' ],
	methods: {
		getBezierCurveString() {
			let [ x1, y1 ] = [ this.conn[ 0 ].position.x, this.conn[ 0 ].position.y ]
			let [ x2, y2 ] = [ this.conn[ 1 ].position.x, this.conn[ 1 ].position.y ]
			, hf = Math.abs( x1 - x2 ) * 0.5
			, [ cx1, cx2 ] = [ x1 + hf, x2 - hf ]
			return `M${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
		},
		disconnect() {
			EventBus.$emit( 'io-disconnect', this.conn[ 0 ] )
		}
	}
}
</script>

<style lang="sass">
	.connection
		pointer-events: auto

		&:hover
			stroke: #0bb1f9

</style>
