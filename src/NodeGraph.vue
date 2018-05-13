<template>
	<div ref="nodeGraphRoot" id="nodeGraphRoot">

		<div ref="nodeGraphBG" class="nodeGraphBG"></div>

		<div ref="nodeGraphContainer" class="nodeGraphContainer">

			<svg class="nodeContainerSvg">
				<NodeGhostConnection></NodeGhostConnection>
				<NodeConnection v-for="conn in connections" :key="conn[ 0 ].uuid + conn[ 1 ].uuid" :conn="conn"></NodeConnection>
			</svg>
			<div class="nodeContainer">
				<NodeModule v-for="node in nodes" :key="node.uuid"
					:node="node"
					:selected="isNodeSelected( node )"
				></NodeModule>
			</div>

		</div>

		<SelectionBox :enable="enableSelectionBox"></SelectionBox>

	</div>
</template>

<script>

import Vue from 'vue'
import NodeModule from './NodeModule.vue'
import NodeConnection from './NodeConnection.vue'
import NodeGhostConnection from './NodeGhostConnection.vue'
import SelectionBox from './SelectionBox.vue'
import importGraphConfiguration from './import.svc.js'
import toposort from 'toposort'

export default {
	name: 'NodeGraph',
	components: { NodeModule, NodeConnection, SelectionBox, NodeGhostConnection },
	props: {
		graph: { default: () => { return { nodes: [], connections: [] } } }
	},
	provide() {
		return {
			$EventBus: new Vue()
		}
	},
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
				middleMouseHold: false,
				currentSelectedNode: null,
			},
			enableSelectionBox: false,
		}
	},
	methods: {
		init() {
			console.log( this )
			this.nodes.forEach( n => {
				n.__vue__.moveByUnit( n.position.x, n.position.y )
				n.__vue__.recordPrevPos()
			} )
			this.connections.forEach( pair => {
				this.connectIO( ...pair )
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
		pan( dx, dy ) {
			let vp = $( this.$refs.nodeGraphRoot )
			vp.scrollLeft( vp.scrollLeft() - dx )
			vp.scrollTop( vp.scrollTop() - dy )
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
			this.$EventBus.$emit( 'vp-zoom' )
		},
		importGraph() {
			let graph = importGraphConfiguration()
			this.nodes = graph.nodes
			this.connections = graph.connections
		},
		clearSelectedNodes() {
			this.selectedNodes = []
			this.$root.$emit( 'node-clear-selected' )
		},
		addNodeToSelection( node, clear ) {
			if ( clear )
				this.selectedNodes = [ node ]
			if ( !this.isNodeSelected( node ) ) {
				this.selectedNodes.push( node )
			}
			this.nodes = [ ...this.nodes.filter( n => n !== node ), this.nodes[ this.nodes.indexOf( node ) ] ] // bring selected node to front
		},
		removeNodeFromSelection( node ) {
			this.selectedNodes = this.selectedNodes.filter( n => n !== node )
		},
		isNodeSelected( node ) {
			return !!this.selectedNodes.find( n => n.uuid === node.uuid )
		},
		isConnectionExists( opt, inp ) {
			return !!this.connections.find( io => io[ 0 ] === opt && io[ 1 ] === inp )
		},
		isConnectionCyclic( opt, inp ) {
			let testCase = [ ...this.connections, [ opt, inp ] ]
			try { this.computeToposort( testCase ) }
			catch( ex ) { return true }
			return false
		},
		computeToposort( connections ) {
			let edges = []
			connections.forEach( p => { edges.push( [ p[ 0 ].parent.uuid, p[ 1 ].parent.uuid ] ) } )
			return toposort( edges )
		},
		isConnectionValid( pair ) {
			let [ opt, inp ] = pair
			return ( opt !== null && inp !== null &&
				opt.parent.uuid !== inp.parent.uuid &&
				!this.isConnectionExists( opt, inp ) &&
				!this.isConnectionCyclic( opt, inp )
			)
		},
		_disconnectInput( inp ) {
			inp.disconnect()
			this.connections = this.connections.filter( io => io[ 1 ] !== inp )
		},
		disconnectIO( io ) {
			if ( io.type === 1 )
				this._disconnectInput( io )
			else {
				for ( let inp of [ ...io.input ] ) {
					this._disconnectInput( inp )
				}
			}
		},
		connectIO( opt, inp ) {
			this._disconnectInput( inp )
			inp.connect( opt )
			this.connections.push( [ opt, inp ] )
		},
	},
	created() {
		this.importGraph()
		this.$EventBus = this._provided.$EventBus
	},
	mounted() {
		this.init()
		this.$EventBus.$on( 'node-click', ev => {
		} )
		this.$EventBus.$on( 'node-mousedown', payload => {
			this.nodes.forEach( n => n.__vue__.recordPrevPos() )
			if ( payload.event.shiftKey ) {
				this.addNodeToSelection( payload.node )
			} else if ( payload.event.ctrlKey ) {
				this.removeNodeFromSelection( payload.node )
			} else if ( !this.isNodeSelected( payload.node ) ) {
				this.addNodeToSelection( payload.node, true )
			}
			this.$root.$emit( 'node-selected', this.selectedNodes )
			this.movingNode = true
		} )
		this.$EventBus.$on( 'node-mouseup', ev => {
			this.selectedNodes.forEach( n => n.__vue__.recordPrevPos() )
			this.nodes.forEach( n => n.__vue__.$emit( 'update-io-position' ) )
		} )
		this.$EventBus.$on( 'io-start-connecting', io => {
			this.ioConnecting = true
			this.tempConnectionPair[ io.type ] = io
		} )
		this.$EventBus.$on( 'io-end-connecting', io => {
			this.$EventBus.$emit( 'ghost-connection-disable' )
			this.ioConnecting = false
			this.tempConnectionPair[ io.type ] = io
			if ( this.isConnectionValid( this.tempConnectionPair ) )
				this.connectIO( ...this.tempConnectionPair )
		} )
		this.$EventBus.$on( 'io-disconnect', io => {
			this.disconnectIO( io )
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
				if ( ev.button === 0 ) this.leftMouseHold = true
				if ( ev.button === 1 ) {
					ev.preventDefault()
					this.vpd.middleMouseHold = true
				}
				this.vpd.prevMouse = { x: ev.clientX, y: ev.clientY }
			} )
			.on( 'mouseup', ev => {
				if ( ev.button !== 1 && this.leftMouseHold ) {
					let selecting = this.nodes.filter( n => n.__vue__.selecting )
					if ( !this.movingNode ) {
						if ( selecting.length > 0 ) {
							if ( ev.shiftKey ) {
								selecting.forEach( n => {
									this.addNodeToSelection( n )
									n.__vue__.clearSelecting()
								} )
							} else if ( ev.ctrlKey ) {
								selecting.forEach( n => {
									this.removeNodeFromSelection( n )
									n.__vue__.clearSelecting()
								} )
							} else {
								this.clearSelectedNodes()
								selecting.forEach( n => {
									this.addNodeToSelection( n )
									n.__vue__.clearSelecting()
								} )
							}
							this.$root.$emit( 'node-selected', this.selectedNodes )
						} else {
							this.clearSelectedNodes()
						}
					}
				}
				if ( this.tempConnectionPair[ 0 ] ) this.tempConnectionPair[ 0 ].__vue__.selected = false
				if ( this.tempConnectionPair[ 1 ] ) this.tempConnectionPair[ 1 ].__vue__.selected = false
				this.leftMouseHold = false
				this.vpd.mouseHoldBg = false
				this.vpd.middleMouseHold = false
				this.enableSelectionBox = false
				this.movingNode = false
				this.ioConnecting = false
				this.tempConnectionPair = [ null, null ]
				this.$EventBus.$emit( 'ghost-connection-disable' )
			} )
			.on( 'wheel', ev => {
				ev.preventDefault()
				let vp = $( this.$refs.nodeGraphRoot )
				let anchor = {
					x: ev.clientX - vp.offset().left + vp.scrollLeft(),
					y: ev.clientY - vp.offset().top + vp.scrollTop()
				}
				this.zoom( anchor, ev.originalEvent.deltaY )
			} )
		$( this.$refs.nodeGraphRoot )
			.on( 'mousemove', ev => {
				let rm = this.getMousePositionRelative( ev )
				this.$EventBus.$emit( 'ghost-connection-update', rm )
				let [ dx, dy ] = [ ev.clientX - this.vpd.prevMouse.x, ev.clientY - this.vpd.prevMouse.y ]
				if ( this.vpd.middleMouseHold ) {
					this.pan( dx, dy )
					this.vpd.prevMouse = { x: ev.clientX, y: ev.clientY }
				}
				if ( !this.vpd.middleMouseHold  &&
					this.selectedNodes.length > 0 &&
					this.movingNode &&
					!this.ioConnecting
				) {
					this.selectedNodes.forEach( n => {
						n.__vue__.moveByUnit( dx, dy )
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
		height: 100%
		width: 100%
		left: 0px
		top: 0px
	.nodeGraphContainer
		background-color: transparent
		background-image: linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)
		background-size: 50px 50px
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
		width: calc( 70% - 15px )
		height: calc( 100% - 15px )
		position: fixed
		background: rgba( 0, 0, 0, 0 )
		pointer-events: auto
</style>
