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
			</div>

			<svg class="nodeContainerSvg" style="pointer-events: none;">
				<line ref="ghostConnection" v-show="enableConnectionGhost"
					:x1="gx1" :y1="gy1" :x2="gx2" :y2="gy2" stroke="#0bb1f9" />
			</svg>

		</div>

		<SelectionBox :enable="enableSelectionBox"></SelectionBox>

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
			tempConnectionPair: [ null, null ],
			vpd: {
				minZoom: 0.2,
				zoomFactor: 1.0,
				prevMouse: { x: 0, y: 0 },
				mouseHoldBg: false,
				mouseHoldNode: false,
				middleMouseHold: false,
				currentSelectedNode: null,
			},
			gx1: 0,
			gy1: 0,
			gx2: 100,
			gy2: 100,
			enableSelectionBox: false,
			enableConnectionGhost: false,
		}
	},
	methods: {
		init() {
			$( this.$refs.nodeGraphRoot ).animate( { scrollTop: 2000, scrollLeft: 2000 }, 0 )
			this.nodes.forEach( n => {
				n.__vue__.moveByUnit( n.position.x, n.position.y )
				n.__vue__.recordPrevPos()
			} )
		},
		getContainerMatrix() {
			return $( this.$refs.nodeGraphContainer ).css( 'transform' ).match( /[\d|\.|\+|-]+/g ).map( v => parseFloat( v ) )
		},
		getMousePositionRelative( ev ) {
			let vp = $( this.$refs.nodeGraphRoot )
			, offset = vp.offset()
			, mat = this.getContainerMatrix()
			return {
				x: ( ev.clientX - offset.left + vp.scrollLeft() - mat[ 4 ] ) / this.vpd.zoomFactor,
				y: ( ev.clientY - offset.top + vp.scrollTop() - mat[ 5 ] ) / this.vpd.zoomFactor
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
			, sf = Math.max( mat[ 0 ] * ( 1.0 + dd ), this.vpd.minZoom )
			, sd = sf / mat[ 0 ]
			, xx = sd * ( mat[ 4 ] - anchor.x ) + anchor.x
			, yy = sd * ( mat[ 5 ] - anchor.y ) + anchor.y
			nCont.css( 'transform', `matrix(${sf},0,0,${sf},${xx},${yy})` )
			this.vpd.zoomFactor = sf
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
				// console.log( 'dupe selection' )
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
		this.init()
		EventBus.$on( 'node-click', ev => {
			// console.log( 'node-click' )
		} )
		EventBus.$on( 'node-mousedown', ev => {
			// console.log( 'node-mousedown' )
			this.nodes.forEach( n => n.__vue__.recordPrevPos() )
			if ( !this.isNodeSelected( ev.node ) ) {
				if ( ev.shiftKey ) {
					this.addNodeToSelection( ev.node )
				} else {
					this.addNodeToSelection( ev.node, true )
				}
			}
			this.vpd.mouseHoldNode = true
			this.movingNode = true
			// console.log( this.selectedNodes )
		} )
		EventBus.$on( 'node-mouseup', ev => {
			// console.log( 'node-mouseup' )
			this.selectedNodes.forEach( node => {
				node.__vue__.recordPrevPos()
			} )
			this.nodes.forEach( n => {
				n.__vue__.$emit( 'update-io-position' )
			} )
		} )
		EventBus.$on( 'io-start-connecting', io => {
			this.ioConnecting = true
			this.enableConnectionGhost = true
			this.tempConnectionPair[ io.type ] = io
			this.gx1 = io.position.x
			this.gy1 = io.position.y
		} )
		EventBus.$on( 'io-end-connecting', io => {
			this.ioConnecting = false
			this.enableConnectionGhost = false
			this.tempConnectionPair[ io.type ] = io
			console.log( this.tempConnectionPair )
			if (
				/* validate connection
					if not null
					if not same parent
					if not already exists
					if valid topological order
				*/
				this.tempConnectionPair.indexOf( null ) < 0 &&
				this.tempConnectionPair[ 0 ].parent.uuid !== this.tempConnectionPair[ 1 ].parent.uuid
			) {
				// disconnect inp
				// this.connections.push( [ this.tempConnectionPair[ 0 ], this.tempConnectionPair[ 1 ] ] )
			}
		} )
		$( this.$refs.nodeGraphBG )
			.on( 'mousedown', ev => {
				this.vpd.mouseHoldBg = true
				if ( ev.button === 0 ) this.enableSelectionBox = true
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'contextmenu', ev => {
				ev.preventDefault()
			} )
			.on( 'mousedown', ev => {
				if ( ev.button === 1 ) {
					ev.preventDefault()
					this.vpd.middleMouseHold = true
				}
				this.vpd.prevMouse = { x: ev.clientX, y: ev.clientY }
			} )
			.on( 'mouseup', ev => {
				// console.log( 'root-mouseup' )
				if ( ev.button !== 1 ) {
					if ( !ev.shiftKey && !this.movingNode )
							this.clearSelectedNodes()
					this.nodes.forEach( n => {
						if ( n.__vue__.selecting ) {
							this.addNodeToSelection( n )
							n.__vue__.clearSelecting()
						}
					} )
				}
				this.vpd.mouseHoldBg = false
				this.vpd.middleMouseHold = false
				this.enableSelectionBox = false
				this.vpd.mouseHoldNode = false
				this.movingNode = false
				this.ioConnecting = false
				this.enableConnectionGhost = false
				// reset connecting io pair
				this.tempConnectionPair = [ null, null ]
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
				this.gx2 = rm.x
				this.gy2 = rm.y

				let [ dx, dy ] = [ ev.clientX - this.vpd.prevMouse.x, ev.clientY - this.vpd.prevMouse.y ]

				if ( this.vpd.middleMouseHold ) {
					this.pan( { x: dx, y: dy } )
					this.vpd.prevMouse = { x: ev.clientX, y: ev.clientY }
				}

				if ( !this.vpd.middleMouseHold  &&
					this.selectedNodes.length > 0 &&
					this.vpd.mouseHoldNode &&
					!this.ioConnecting
				) {
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
