<template>
	<div ref="nodeModule" class="nodeModule"
		:style="{ transform: `matrix(1,0,0,1,${node.position.x},${node.position.y})` }"
		:class="{ selected, tmpSelected: node._selecting }"
	>
		<div class="header">
			{{ node.name }}&nbsp;<span style="float: right;">[{{ node.order }}]</span>
		</div>
		<div class="ioContainer">
			<div class="inputColumn">
				<NodeModuleIO v-for="input of node.input" :key="input.uuid" :io="input"></NodeModuleIO>
			</div>

			<div class="separator"></div>

			<div class="outputColumn">
				<NodeModuleIO v-for="output of node.output" :key="output.uuid" :io="output"></NodeModuleIO>
			</div>
		</div>

	</div>
</template>

<script>
import NodeModuleIO from './NodeModuleIO.vue'

export default {
	name: 'NodeModule',
	components: { NodeModuleIO },
	inject: [ '$EventBus' ],
	props: [ 'node', 'selected' ],
	data() {
		return {
			prevPos: { left: 0, top: 0 },
		}
	},
	methods: {
		setSelecting() {
			this.node._selecting = true
		},
		clearSelecting() {
			this.node._selecting = false
		},
		setPosition( x, y ) {
			this.node.position = { x, y }
			this.$emit( 'update-child-io-position' )
		},
		recordPrevPos() {
			this.prevPos = $( this.$refs.nodeModule ).position() || this.prevPos
		},
		moveByUnit( dx, dy ) {
			let zf = this.$parent.vpd.zoomFactor
			, [ x, y ] = [ ( this.prevPos.left + dx ) / zf, ( this.prevPos.top + dy ) / zf ]
			this.setPosition( x, y )
		},
		updateDimension() {
			let w = $( this.$refs.nodeModule ).outerWidth()
			let h = $( this.$refs.nodeModule ).outerHeight()
			this.node._dimension = { w, h }
		}
	},
	mounted() {
		this.updateDimension()
		this.$EventBus.$on( 'node-set-selecting', node => {
			if ( node === this.node ) this.setSelecting()
		} )
		this.$EventBus.$on( 'node-clear-selecting', node => {
			if ( node === this.node ) this.clearSelecting()
		} )
		this.$EventBus.$on( 'update-io-position', () => {
			this.$emit( 'update-child-io-position' )
		} )
		this.$EventBus.$on( 'node-record-prev-pos', () => {
			this.recordPrevPos()
		} )
		this.$EventBus.$on( 'node-move', payload => {
			if ( payload.nodes.indexOf( this.node ) >= 0 ) {
				this.moveByUnit( payload.delta.dx, payload.delta.dy )
			}
		} )
		this.$EventBus.$on( 'update-node-position', payload => {
			if ( payload.node === this.node )
				this.setPosition( payload.pos.x, payload.pos.y )
		} )
		$( this.$refs.nodeModule )
			.on( 'click', ev => {
				this.$EventBus.$emit( 'node-click', ev )
			} )
			.on( 'dblclick', ev => {
				this.$EventBus.$emit( 'node-dblclick', {
					node: this.node, event: ev
				} )
			} )
			.on( 'mousedown', ev => {
				if ( ev.button !== 0 ) return
				this.recordPrevPos()
				this.$EventBus.$emit( 'node-mousedown', {
					node: this.node, event: ev
				} )
			} )
			.on( 'mouseup', ev => {
				this.$EventBus.$emit( 'node-mouseup' )
			} )
	}
}
</script>

<style lang="sass">
	$d0: rgb(24,26,28)
	$b0: #0bb1f9
	$w1: #e6e6e6
	$r0: #777777
	.nodeModule
		position: absolute
		padding: 4px 0px 4px 0px
		background: $d0
		pointer-events: auto
		box-sizing: border-box
		border: 1px solid transparent
		&:hover
			border: 1px solid $r0
		&.tmpSelected
			border: 1px solid red
		&.selected
			border: 1px solid $b0
	.header
		padding: 0px 4px 2px 4px
	.ioContainer
		display: flex
		justify-content: space-between
	.separator
		width: 16px
		display: inline-block
	.inputColumn
		padding: 0px
		display: inline-block
	.outputColumn
		padding: 0px
		display: inline-block
</style>
