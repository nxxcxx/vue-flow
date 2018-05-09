<template>
	<div class="ioRow" :class="{ inputRow: isInput(), outputRow: isOutput() }">
		<div ref="ioPort" class="ioPort deselected"
			:class="{ inputPort: isInput(), outputPort: isOutput() }"
		>
		</div>
		<div class="ioLabel" :class="{ inputLabel: isInput(), outputLabel: isOutput() }">
			{{ io.name }}
		</div>
	</div>
</template>

<script>
import EventBus from './EventBus.js'

export default {
	name: 'NodeModuleIO',
	props: [ 'type', 'io' ],
	methods: {
		isInput() { return this.type === 'input' },
		isOutput() { return this.type === 'output' },
		updatePosition() {
			let port = $( this.$refs.ioPort )
			, [ hw, hh ] = [ port.width() * 0.5, port.height() * 0.5 ]
			, off = port.offset()
			, vp = $( this.$parent.$parent.$refs.nodeGraphRoot )
			, vpOff = $( this.$parent.$parent.$refs.nodeGraphRoot ).offset()
			, mat = $( this.$parent.$parent.$refs.nodeGraphContainer ).css( 'transform' ).match( /[\d|\.|\+|-]+/g ).map( v => parseFloat( v ) )
			, d = - 4584.56 + ( 0.00108889 + 4584.56 ) / ( 1 + Math.pow( mat[ 0 ] / 799053.8, 1.090814 ) ) // fix scale discrepacy ( calculated using curve fitting )
			this.io.position.x = ( off.left - vpOff.left + vp.scrollLeft() + hw - mat[ 4 ] ) / ( mat[ 0 ] + d )
			this.io.position.y = ( off.top - vpOff.top + vp.scrollTop() + hh - mat[ 5 ] ) / ( mat[ 0 ] + d )
		}
	},
	mounted() {
		this.io.__vue__ = this
		this.updatePosition()
		this.$parent.$on( 'updatePosition', ( uuid ) => {
			this.updatePosition()
		} )
		EventBus.$on( 'vp-zoom', () => {
			this.updatePosition()
		} )
	}
}
</script>

<style lang="sass">
	$g0: #5d5d5d
	$w1: #e6e6e6
	$w0: #bababa
	$t0: rgba(0,0,0,0)
	$b0: #0bb1f9

	.ioRow
		display: flex

	.ioPort
		width: 7px
		height: 7px
		align-self: center

	.ioLabel
		align-self: center

	.ioActive
		background: $w1

	.ioDisabled
		background: $t0

	.inputRow
		flex-direction: row

	.inputLabel
		margin-left: 10px

	.inputPort

		&.deselected
			border: 1px solid $g0
			border-left: 0px

		&:hover
			border: 1px solid $b0
			border-left: 0px

	.outputRow
		flex-direction: row-reverse

	.outputLabel
		margin-right: 10px

	.outputPort

		&.deselected
			border: 1px solid $g0
			border-right: 0px

		&:hover
			border: 1px solid $b0
			border-right: 0px


	.ioHover
		background: $w1
</style>
