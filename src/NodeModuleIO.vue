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
			, [ hw, hh ] = [ port.width() * 0.5 + 1.0 , port.height() * 0.5 + 1.0 ]
			, off = port.offset()
			, vp = $( this.$parent.$parent.$refs.nodeGraphRoot )
			, vpOff = $( this.$parent.$parent.$refs.nodeGraphRoot ).offset()
			, mat = this.$parent.$parent.getContainerMatrix()
			this.io.position.x = ( off.left - vpOff.left + vp.scrollLeft() - mat[ 4 ] ) / mat[ 0 ] + hw
			this.io.position.y = ( off.top - vpOff.top + vp.scrollTop() - mat[ 5 ] ) / mat[ 0 ] + hh
		}
	},
	mounted() {
		this.io.__vue__ = this
		this.updatePosition()
		this.$parent.$on( 'update-io-position', ( uuid ) => {
			this.updatePosition()
		} )
		EventBus.$on( 'vp-zoom', () => {
			this.updatePosition()
		} )
		$( this.$refs.ioPort )
		.on( 'mousedown', ev => {
			EventBus.$emit( 'io-start-connecting', this.io )
		} )
		.on( 'mouseup', ev => {
			EventBus.$emit( 'io-end-connecting', this.io )
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
			border-left: 0px
			background: white

	.outputRow
		flex-direction: row-reverse

	.outputLabel
		margin-right: 10px

	.outputPort

		&.deselected
			border: 1px solid $g0
			border-right: 0px

		&:hover
			background: white
			border-right: 0px


	.ioHover
		background: $w1
</style>
