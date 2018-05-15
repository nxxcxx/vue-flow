<template>
	<div class="ioRow" :class="{ inputRow: isInput(), outputRow: isOutput() }">
		<div ref="ioPort" class="ioPort"
			:class="{ inputPort: isInput(), outputPort: isOutput(),
				connected: !io.free && !selected, selected: selected
			}"
		>
		</div>
		<div class="ioLabel" :class="{ inputLabel: isInput(), outputLabel: isOutput() }"
			@click="debug()"
		>
			{{ io.name }}
		</div>
	</div>
</template>

<script>
export default {
	name: 'NodeModuleIO',
	inject: [ '$EventBus' ],
	props: [ 'type', 'io' ],
	data() {
		return {
			selected: false,
		}
	},
	methods: {
		isInput() { return this.type === 'input' },
		isOutput() { return this.type === 'output' },
		updatePosition() {
			if ( !this.$refs.ioPort ) return
			let port = $( this.$refs.ioPort )
			, [ woff, hoff ] = [ ( port.width() + 1.0 ) * ( this.io.type === 0 ? 1 : 0 ) , port.height() * 0.5 + 0.5 ]
			, off = port.offset()
			, vp = $( this.$parent.$parent.$refs.nodeGraphRoot )
			, vpOff = $( this.$parent.$parent.$refs.nodeGraphRoot ).offset()
			, mat = this.$parent.$parent.getContainerMatrix()
			this.io.position.x = ( off.left - vpOff.left + vp.scrollLeft() - mat[ 4 ] ) / mat[ 0 ] + woff
			this.io.position.y = ( off.top - vpOff.top + vp.scrollTop() - mat[ 5 ] ) / mat[ 0 ] + hoff
		},
		debug() {
			console.log( this.io, `${this.io.name} [${this.io.parent.name}]` )
			let pName = this.io.parent.name
			if ( this.io.type === 0 ) {
				let prox = this.io.proxyInput
				console.log( '\tPROXY CONNECTION' )
				prox.forEach( p => console.log( '\t\t', p, `${p.name} [${p.parent.name}]` ) )
				console.log( '\tLOGICAL CONNECTION' )
				this.io.input.forEach( inp => console.log( '\t\t', inp, `${inp.name} [${inp.parent.name}]`) )
			} else {
				let prox = this.io.proxyOutput
				console.log( '\tPROXY CONNECTION' )
				if ( prox ) console.log( '\t\t', `${prox.name} [${prox.parent.name}]` )
				console.log( '\tLOGICAL CONNECTION' )
				if ( this.io.output ) console.log( '\t\t', this.io.output, `${this.io.output.name} [${this.io.output.parent.name}]`)
			}
		}
	},
	mounted() {
		this.updatePosition()
		this.$parent.$on( 'update-io-position', uuid => {
			this.updatePosition()
		} )
		this.$EventBus.$on( 'vp-zoom', () => {
			this.updatePosition()
		} )
		$( this.$refs.ioPort )
		.on( 'mousedown', ev => {
			this.$EventBus.$emit( 'io-start-connecting', this.io )
			this.selected = true
		} )
		.on( 'mouseup', ev => {
			this.$EventBus.$emit( 'io-end-connecting', this.io )
		} )
		.on( 'dblclick', ev => {
			this.$EventBus.$emit( 'io-disconnect', this.io )
		} )
		.on( 'mouseenter', ev => {
			if ( !this.io.free ) this.selected = true
		} )
		.on( 'mouseleave', ev => {
			this.selected = false
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
		background: $g0

		&.selected
			background: $b0

		&.connected
			background: $w1

	.outputRow
		flex-direction: row-reverse

	.outputLabel
		margin-right: 10px

	.outputPort
		background: $g0

		&.selected
			background: $b0

		&.connected
			background: $w1

	.ioHover
		background: $w1

	.active
		background: $b0


</style>
