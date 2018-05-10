<template>
	<div ref="nodeModule" class="nodeModule"
		:style="{ transform: `matrix(1,0,0,1,${node.position.x},${node.position.y})` }"
		:class="{ selected, tmpSelected: selecting }"
	>
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
import EventBus from './EventBus.js'
import NodeModuleIO from './NodeModuleIO.vue'

export default {
	name: 'NodeModule',
	components: { NodeModuleIO },
	props: [ 'node', 'selected' ],
	data() {
		return {
			prevPos: { left: 0, top: 0 },
			selecting: false
		}
	},
	methods: {
		setSelecting() {
			this.selecting = true
		},
		clearSelecting() {
			this.selecting = false
		},
		setPosition( x, y ) {
			this.node.position = { x, y }
		},
		recordPrevPos() {
			this.prevPos = $( this.$refs.nodeModule ).position()
		},
		moveByUnit( dx, dy ) {
			let zf = this.$parent.viewportData.zoomFactor
			, [ x, y ] = [ ( this.prevPos.left + dx ) / zf, ( this.prevPos.top + dy ) / zf ]
			this.setPosition( x, y )
			this.$emit( 'update-io-position', this.node.uuid )
		},
	},
	created() {
		this.node.__vue__ = this
	},
	mounted() {
		$( this.$refs.nodeModule )
			// .on( 'click', ev => {
			// 	EventBus.$emit( 'node-click', {
			// 		node: this.node,
			// 		shiftKey: ev.shiftKey
			// 	} )
			// } )
			.on( 'mousedown', ev => {
				this.recordPrevPos()
				EventBus.$emit( 'node-mousedown', {
					node: this.node,
					shiftKey: ev.shiftKey
				} )
			} )
			.on( 'mouseup', ev => {
				EventBus.$emit( 'node-mouseup' )
			} )
	}
}
</script>

<style lang="sass">
	$d0: rgb(24,26,28)
	$g5: #5d5d5d
	$g6: #bababa
	$b0: #0bb1f9

	.nodeModule
		position: absolute
		padding: 4px 0px 4px 0px
		background: $d0
		pointer-events: auto
		border: 1px solid $g5
		&:hover
			// border: 1px solid $b0
		&.tmpSelected
			border: 1px solid #d03b26
		&.selected
			border: 1px solid $b0
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
