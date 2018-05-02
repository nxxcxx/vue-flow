<template>
	<div ref="nodeGraphRoot" id="nodeGraphRoot">

		<div ref="nodeGraphBG" class="nodeGraphBG"></div>

		<div ref="nodeGraphContainer" class="nodeGraphContainer">

			<svg class="nodeContainerSvg">
				<NodeConnection v-for="( conn, idx ) in connections" :key="idx"
					:x1="conn[ 0 ].position.x" :y1="conn[ 0 ].position.y"
					:x2="conn[ 1 ].position.x" :y2="conn[ 1 ].position.y"
				></NodeConnection>
			</svg>

			<div class="nodeContainer">
				<NodeModule v-for="node in nodes" :key="node.uuid" :node="node"></NodeModule>
			</div>

		</div>

	</div>
</template>

<script>

import { EventBus } from './EventBus.js'
import NodeModule from './NodeModule.vue'
import NodeConnection from './NodeConnection.vue'
import importGraphConfiguration from './import.svc.js'

export default {
	name: 'app',
	components: { NodeModule, NodeConnection },
	data() {
		return {
			nodes: [],
			connections: [],
			viewportData: {
				minZoom: 0.2,
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
		zoom( anchor, delta ) {
			let nCont = $( this.$refs.nodeGraphContainer )
			let mat = nCont.css( 'transform' ).match( /[\d|\.|\+|-]+/g ).map( v => parseFloat( v ) )
			, dd = - Math.sign( delta ) * 0.1
			, sf = Math.max( mat[ 0 ] * ( 1.0 + dd ), this.viewportData.minZoom )
			, sd = sf / mat[ 0 ]
			, xx = sd * ( mat[ 4 ] - anchor.x ) + anchor.x
			, yy = sd * ( mat[ 5 ] - anchor.y ) + anchor.y
			nCont.css( 'transform', `matrix(${sf},0,0,${sf},${xx},${yy})` )
			this.viewportData.zoomFactor = sf
		},
		importGraph() {
			let graph = importGraphConfiguration()
			this.nodes = graph.nodes
			this.connections = graph.connections
		}
	},
	created() {
		this.importGraph()
	},
	mounted() {
		$( this.$refs.nodeGraphRoot ).animate( { scrollTop: 2000, scrollLeft: 2000 }, 0 )
		EventBus.$on( 'vp-set-select-node', nodeCmp => {
			this.viewportData.currentSelectedNode = nodeCmp
		} )
		$( this.$refs.nodeGraphBG )
			.on( 'mousedown', ( evt ) => {
				this.viewportData.mouseholdBG = true
				console.log( 'bg md' )
			} )
			.on( 'mousemove', ( evt ) => {
				let [ dx, dy ] = [ evt.clientX - this.viewportData.prevMouse.x, evt.clientY - this.viewportData.prevMouse.y ]
				if ( this.viewportData.mouseholdBG ) {
					this.pan( { x: dx, y: dy } )
					this.viewportData.prevMouse = { x: evt.clientX, y: evt.clientY }
				}
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'mousedown', ( evt ) => {
				if ( evt.button === 1 ) evt.preventDefault()
				this.viewportData.prevMouse = { x: evt.clientX, y: evt.clientY }
			} )
			.on( 'mouseup', ( evt ) => {
				this.viewportData.mouseholdBG = false
				this.viewportData.currentSelectedNode = null
				console.log( 'root mu' )
			} )
			.on( 'wheel', ( evt ) => {
				evt.preventDefault()
				let vp = $( this.$refs.nodeGraphRoot )
				let off = vp.offset()
				let anchor = {
					x: evt.clientX - off.left + vp.scrollLeft(),
					y: evt.clientY - off.top + vp.scrollTop()
				}
				this.zoom( anchor, evt.originalEvent.deltaY )
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'mousemove', ( evt ) => {
				let [ dx, dy ] = [ evt.clientX - this.viewportData.prevMouse.x, evt.clientY - this.viewportData.prevMouse.y ]
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
	.nodeGraphBG
		width: calc( 100% - 15px )
		height: calc( 100% - 15px )
		position: fixed
		background: rgba( 0, 0, 0, 0 )
		pointer-events: auto
</style>
