<template>
	<div ref="nodeModule" class="nodeModule" :style="{ transform: `matrix(1,0,0,1,${node.position.x},${node.position.y})` }">
		<div class="header">
			{{ node.name }}
		</div>
		<div class="ioContainer">
			<div class="inputColumn">
				<NodeModuleIO v-for="input of node.input" :key="input.uuid" :io="input" type="input"></NodeModuleIO>
			</div>

			<div class="separator"></div>

			<div class="outputColumn">
				<NodeModuleIO v-for="output of node.output" :key="output.uuid" :io="output" type="output"></NodeModuleIO>
			</div>
		</div>
	</div>
</template>

<script>
import { EventBus } from './EventBus.js'
import NodeModuleIO from './NodeModuleIO.vue'

let prevPos = { left: 0, top: 0 }

export default {
	name: 'NodeModule',
	components: { NodeModuleIO },
	props: [ 'node' ],
	methods: {
		setPosition( x, y ) {
			this.node.position = { x, y }
		},
		moveByUnit( dx, dy ) {
			let zf = this.$parent.viewportData.zoomFactor
			, [ x, y ] = [ ( prevPos.left + dx ) / zf, ( prevPos.top + dy ) / zf ].map( v => +v.toFixed( 2 ) )
			this.setPosition( x, y )
			this.$emit( 'updatePosition', this.node.uuid )
		},
	},
	mounted() {
		console.log( this.node )
		$( this.$refs.nodeModule )
			.on( 'mousedown', ( evt ) => {
				prevPos = $( this.$refs.nodeModule ).position()
				EventBus.$emit( 'vp-set-select-node', evt.currentTarget.__vue__ )
			} )
	}
}
</script>

<style lang="sass">
	$d0: rgb(24,26,28)
	$g5: #5d5d5d
	$g6: #bababa

	.nodeModule
		position: absolute
		padding: 4px 0px 4px 0px
		background: $d0
		pointer-events: auto
		border: 1px solid $g5

	.ioContainer
		display: flex
		justify-content: space-between
	.inputColumn
		padding: 0px
		display: inline-block
	.separator
		width: 16px
		display: inline-block
	.outputColumn
		padding: 0px
		display: inline-block
</style>
