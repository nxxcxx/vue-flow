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
import NodeModule from './NodeModule.vue'

let mousehold = false
let prevMouse = { x: 0, y: 0 }

export default {
	name: 'app',
	components: { NodeModule },
	data() {
		return {
			nodes: testNodeGraph.nodes
		}
	},
	methods: {
		pan( delta ) {
			let vp = $( this.$refs.nodeGraphRoot )
			vp.scrollLeft( vp.scrollLeft() - delta.x )
			vp.scrollTop( vp.scrollTop() - delta.y )
		},
		zoom() {

		}
	},
	mounted() {
		$( this.$refs.nodeGraphContainerBG )
			.on( 'mousedown', ( evt ) => {
				console.log( 'd' )
				mousehold = true
				prevMouse = { x: evt.clientX, y: evt.clientY }
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'mouseup', () => {
				console.log( 'u' )
				mousehold = false
			} )
		$( this.$refs.nodeGraphContainer )
			.on( 'mousemove', ( evt ) => {
				if ( mousehold ) {
					this.pan( { x: evt.clientX - prevMouse.x, y: evt.clientY - prevMouse.y } )
					prevMouse = { x: evt.clientX, y: evt.clientY }
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
		// left: 20%
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
