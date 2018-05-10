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
				<NodeModule v-for="node in nodes" :key="node.uuid"
					:node="node"
					:selected="isNodeSelected( node )"
				></NodeModule>
				<div
					style="width: 10px; height: 10px; position: absolute; background: red; pointer-events: none;"
					:style="{ left: tx + 'px', top: ty + 'px' }"
				></div>
			</div>

		</div>

		<SelectionBox></SelectionBox>

	</div>
</template>

<script>

import EventBus from './EventBus.js'
import NodeModule from './NodeModule.vue'
import NodeConnection from './NodeConnection.vue'
import SelectionBox from './SelectionBox.vue'
import importGraphConfiguration from './import.svc.js'

export default {
	name: 'app',
	components: { NodeModule, NodeConnection, SelectionBox },
	data() {
		return {
			nodes: [],
			connections: [],
			selectedNodes: [],
			viewportData: {
				minZoom: 0.2,
				zoomFactor: 1.0,
				prevMouse: { x: 0, y: 0 },
				mouseHoldBg: false,
				mouseHoldNode: false,
				middleMouseHold: false,
				currentSelectedNode: null,
			},
			tx: 0,
			ty: 0
		}
	},
	methods: {
		getContainerMatrix() {
			return $( this.$refs.nodeGraphContainer ).css( 'transform' ).match( /[\d|\.|\+|-]+/g ).map( v => parseFloat( v ) )
		},
		getMousePositionRelative( ev ) {
			let vp = $( this.$refs.nodeGraphRoot )
			, offset = vp.offset()
			, mat = this.getContainerMatrix()
			return {
				x: ( ev.clientX - offset.left + vp.scrollLeft() - mat[ 4 ] ) / this.viewportData.zoomFactor,
				y: ( ev.clientY - offset.top + vp.scrollTop() - mat[ 5 ] ) / this.viewportData.zoomFactor
			}
		},
		pan( delta ) {
			let vp = $( this.$refs.nodeGraphRoot )
			vp.scrollLeft( vp.scrollLeft() - delta.x )
			vp.scrollTop( vp.scrollTop() - delta.y )
		},
		zoom( anchor, delta ) {
			let nCont = $( this.$refs.nodeGraphContainer )
			let mat = this.getContainerMatrix()
			, dd = - Math.sign( delta ) * 0.1
			, sf = Math.max( mat[ 0 ] * ( 1.0 + dd ), this.viewportData.minZoom )
			, sd = sf / mat[ 0 ]
			, xx = sd * ( mat[ 4 ] - anchor.x ) + anchor.x
			, yy = sd * ( mat[ 5 ] - anchor.y ) + anchor.y
			nCont.css( 'transform', `matrix(${sf},0,0,${sf},${xx},${yy})` )
			this.viewportData.zoomFactor = sf
			EventBus.$emit( 'vp-zoom' )
		},
		importGraph() {
			let graph = importGraphConfiguration()
			this.nodes = graph.nodes
			this.connections = graph.connections
		},
		clearSelectedNodes() {
			this.selectedNodes = []
		},
		addNodeToSelection( node, clear ) {
			if ( clear )
				return this.selectedNodes = [ node ]
			if ( this.isNodeSelected( node ) ) {
				console.log( 'dupe selection' )
			} else {
				this.selectedNodes.push( node )
			}
		},
		isNodeSelected( node ) {
			return this.selectedNodes.find( n => n.uuid === node.uuid ) !== undefined
		}
	},
	created() {
		this.importGraph()
	},
	mounted() {
		this.nodes.forEach( n => {
			n.__vue__.moveByUnit( n.position.x, n.position.y )
			n.__vue__.recordPrevPos()
		} )
		$( this.$refs.nodeGraphRoot ).animate( { scrollTop: 2000, scrollLeft: 2000 }, 0 )
		EventBus.$on( 'node-mousedown', ev => {
			this.nodes.forEach( n => n.__vue__.recordPrevPos() )
			if ( !this.isNodeSelected( ev.node ) ) {
				if ( ev.shiftKey ) {
					console.log( 1 )
					this.addNodeToSelection( ev.node )
				} else {
					console.log( 2 )
					this.addNodeToSelection( ev.node, true )
				}
			}
			this.viewportData.mouseHoldNode = true
			console.log( this.selectedNodes )
		} )
		EventBus.$on( 'node-mouseup', ev => {
			this.viewportData.mouseHoldNode = false
			this.selectedNodes.forEach( node => {
				node.__vue__.recordPrevPos()
			} )
		} )
		$( this.$refs.nodeGraphBG )
			.on( 'mousedown', ( ev ) => {
				this.viewportData.mouseHoldBg = true
			} )
			.on( 'mousemove', ( ev ) => {
				let [ dx, dy ] = [ ev.clientX - this.viewportData.prevMouse.x, ev.clientY - this.viewportData.prevMouse.y ]
				if ( this.viewportData.mouseHoldBg && this.viewportData.middleMouseHold ) {
					this.pan( { x: dx, y: dy } )
					this.viewportData.prevMouse = { x: ev.clientX, y: ev.clientY }
				}
			} )
			.on( 'mouseup', ev => {

			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'contextmenu', ev => {
				ev.preventDefault()
			} )
			.on( 'mousedown', ev => {
				if ( ev.button === 1 ) {
					ev.preventDefault()
					this.viewportData.middleMouseHold = true
				}
				this.viewportData.prevMouse = { x: ev.clientX, y: ev.clientY }
			} )
			.on( 'mouseup', ev => {
				this.viewportData.mouseHoldBg = false
				this.viewportData.middleMouseHold = false
				if ( ev.button !== 1 ) {
					this.clearSelectedNodes()
					this.nodes.forEach( n => {
						if ( n.__vue__.selecting ) {
							this.addNodeToSelection( n )
							n.__vue__.clearSelecting()
						}
					} )
				}
			} )
			.on( 'wheel', ev => {
				ev.preventDefault()
				let vp = $( this.$refs.nodeGraphRoot )
				let off = vp.offset()
				let anchor = {
					x: ev.clientX - off.left + vp.scrollLeft(),
					y: ev.clientY - off.top + vp.scrollTop()
				}
				this.zoom( anchor, ev.originalEvent.deltaY )
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'mousemove', ev => {

				let rm = this.getMousePositionRelative( ev )
				this.tx = rm.x
				this.ty = rm.y

				let [ dx, dy ] = [ ev.clientX - this.viewportData.prevMouse.x, ev.clientY - this.viewportData.prevMouse.y ]
				if ( this.selectedNodes.length > 0 && this.viewportData.mouseHoldNode ) {
					this.selectedNodes.forEach( node => {
						node.__vue__.moveByUnit( dx, dy )
					} )
				}
			} )
	}
}
</script>

<style lang="sass">
	#nodeGraphRoot
		user-select: none
		cursor: default
		transform-style: preserve-3d
		overflow: scroll
		position: absolute
		height: 90%
		width: 80%
		left: 20%
		top: 10%
	.nodeGraphContainer
		background: url( 'assets/grid.png' )
		background-size: 20px
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
		transform-origin: 0px 0px
		transform: matrix( 1, 0, 0, 1, 0, 0 )
	.nodeGraphBG
		width: calc( 80% - 15px )
		height: calc( 90% - 15px )
		position: fixed
		background: rgba( 0, 0, 0, 0 )
		pointer-events: auto
</style>
