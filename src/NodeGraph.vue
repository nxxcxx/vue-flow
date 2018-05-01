<template>
	<div ref="nodeGraphRoot" id="nodeGraphRoot">

		<div ref="nodeGraphContainer" class="nodeGraphContainer">

			<div ref="nodeGraphContainerBG" class="nodeGraphContainerBG"></div>

			<svg class="nodeContainerSvg">

			</svg>

			<div class="nodeContainer">
				<NodeModule v-for="node in nodes" :key="node.uuid" :node="node"></NodeModule>
			</div>


		</div>

	</div>
</template>

<script>

const testNodeGraph = require( './test_node_graph_01.json' )
import { EventBus } from './EventBus.js'
import NodeModule from './NodeModule.vue'

export default {
	name: 'app',
	components: { NodeModule },
	data() {
		return {
			nodes: testNodeGraph.nodes,
			viewportData: {
				zoomFactor: 1.0,
				prevMouse: { x: 0, y: 0 },
				mouseholdBG: false,
				currentSelectedNode: null,
			}
		}
	},
	methods: {
		pan( delta ) {
			let vp = $( this.$refs.nodeGraphRoot )
			vp.scrollLeft( vp.scrollLeft() - delta.x )
			vp.scrollTop( vp.scrollTop() - delta.y )
		},
		zoom() {

		},
		nodeMouseDown( evt ) {
			console.log( 42 )
			console.log( evt )
		}
	},
	mounted() {
		EventBus.$on( 'vp-set-select-node', nodeCmp => {
			this.viewportData.currentSelectedNode = nodeCmp
		} )
		$( this.$refs.nodeGraphContainerBG )
			.on( 'mousedown', ( evt ) => {
				this.viewportData.mouseholdBG = true
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'mousedown', ( evt ) => {
				this.viewportData.prevMouse = { x: evt.clientX, y: evt.clientY }
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'mouseup', ( evt ) => {
				this.viewportData.mouseholdBG = false
				this.viewportData.currentSelectedNode = null
			} )
		$( this.$refs.nodeGraphContainer )
			.on( 'mousemove', ( evt ) => {
				let [ dx, dy ] = [ evt.clientX - this.viewportData.prevMouse.x, evt.clientY - this.viewportData.prevMouse.y ]
				if ( this.viewportData.mouseholdBG ) {
					this.pan( { x: dx, y: dy } )
					this.viewportData.prevMouse = { x: evt.clientX, y: evt.clientY }
				}
				if ( this.viewportData.currentSelectedNode ) {
					this.viewportData.currentSelectedNode.moveByUnit( dx, dy )
				}
			} )
	}
}
</script>

<style lang="sass">
	#nodeGraphRoot
		background: url( 'assets/grid.png' )
		background-size: 15px
		cursor: default
		transform-style: preserve-3d
		overflow: scroll
		position: absolute
		height: 100%
		width: 100%
	.nodeGraphContainer
		overflow: visible
		pointer-events: none
		position: absolute
		width: 5000px
		height: 5000px
		transform-origin: 0px 0px
		transform: matrix( 1, 0, 0, 1, 0, 0 )
		user-select: none
	.nodeContainer, .nodeContainerSvg
		position: absolute
		height: 100%
		width: 100%
		cursor: default
		background: rgba( 0, 0, 0, 0 )
		overflow: visible
		pointer-events: none
	.nodeGraphContainerBG
		background: yellow
		width: 100%
		height: 100%
		position: absolute
		background: rgba( 0, 0, 0, 0 )
		pointer-events: auto
</style>
