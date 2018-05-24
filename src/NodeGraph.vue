<template>
	<div ref="viewport" class="viewport">

		<div style="width: calc(100% - 15px); position: absolute; padding: 0px 4px; z-index: 20; background: rgb(0, 0, 0); user-select: none;">
			<nav style="display: inline-block; cursor: pointer;">
				<span v-for="( path, idx ) in graphViewPath" :key="path.node.uuid">
					<span @click="viewXPack( path.node )">{{ path.name }}</span>
					<span v-if="idx !== graphViewPath.length - 1"> > </span>
				</span>

			</nav>
			<div class="btn" @click="unpackSelectedNode">[UNPACK]</div>
			<div class="btn" @click="packSelectedNodes">[PACK]</div>
			<div class="btn"  @click="normalizeView( graphView )">[RESET_VIEW]</div>
			<div class="btn" @click="centerGraphInView">[CENTER_VIEW]</div>
			<!-- <div class="btn" @click="sort">[SORT]</div> -->
		</div>

		<div ref="nodeGraphRoot" class="nodeGraphRoot">

			<div ref="nodeGraphContainer" class="nodeGraphContainer">

				<svg class="nodeContainerSvg">
					<NodeGhostConnection></NodeGhostConnection>
					<NodeConnection v-for="conn in graphView.connections" :key="conn[ 0 ].uuid + conn[ 1 ].uuid" :conn="conn"></NodeConnection>
				</svg>

				<div class="nodeContainer">
					<NodeModule v-for="node in graphView.nodes" :key="node.uuid"
						:node="node"
						:selected="isNodeSelected( node )"
					></NodeModule>
				</div>

			</div>

		</div>

		<SelectionBox></SelectionBox>

	</div>
</template>

<script>

import Vue from 'vue'
import NodeModule from './NodeModule.vue'
import NodeConnection from './NodeConnection.vue'
import NodeGhostConnection from './NodeGhostConnection.vue'
import SelectionBox from './SelectionBox.vue'
import toposort from 'toposort'
import { XPack, RouterNode } from './xpack.js'
import nodeFactory from './NodeFactory.js'

export default {
	name: 'NodeGraph',
	components: { NodeModule, NodeConnection, SelectionBox, NodeGhostConnection },
	props: [ 'graph' ],
	provide() {
		return {
			$EventBus: new Vue()
		}
	},
	data() {
		return {
			selectedNodes: [],
			tempConnectionPair: [ null, null ],
			graphView: new XPack(),
			graphViewPath: [],
			vpd: {
				minZoom: 0.2,
				zoomFactor: 1.0,
				prevMouse: { x: 0, y: 0 },
				currentSelectedNode: null,
				leftMouseHold: false,
				middleMouseHold: false,
			},
			enableSelectionBox: false,
		}
	},
	methods: {
		init() {
			this.graphView = this.graph
			this.graphViewPath = [ { name: 'Root', node: this.graph } ]
			this.graphView.connections.forEach( pair => this.connectXPackIo( ...pair ) )
			this.$EventBus.$emit( 'node-record-prev-pos' )

			let rConnect = graph => {
				graph.connections.forEach( pair => this.connectXPackIo( ...pair ) )
				for ( let node of graph.nodes ) {
					if ( node instanceof XPack ) {
						rConnect( node )
					}
				}
			}
			rConnect( this.graph )

			window.CREATE_NODE = name => {
				let n = new nodeFactory.Node( name )
				n.parent = this.graph
				this.graph.nodes.push( n )
			}

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
		setZoomFactor( sf ) {
			this.vpd.zoomFactor = sf
			let mat = this.getContainerMatrix()
			let nCont = $( this.$refs.nodeGraphContainer )
			nCont.css( 'transform', `matrix(${sf},0,0,${sf},${0},${0})` )
			this.$EventBus.$emit( 'vp-zoom' )
		},
		clearSelectedNodes() {
			this.selectedNodes = []
			this.$root.$emit( 'node-clear-selected' )
		},
		addNodeToSelection( node, clear ) {
			if ( clear ) this.selectedNodes = [ node ]
			if ( !this.isNodeSelected( node ) ) this.selectedNodes.push( node )
		},
		removeNodeFromSelection( node ) {
			this.selectedNodes = this.selectedNodes.filter( n => n !== node )
		},
		isNodeSelected( node ) {
			return !!this.selectedNodes.find( n => n.uuid === node.uuid )
		},
		isConnectionExists( opt, inp ) {
			return !!this.graphView.connections.find( io => io[ 0 ] === opt && io[ 1 ] === inp )
		},
		isConnectionCyclic( opt, inp ) {
			let testCase = [ ...this.graphView.connections, [ opt, inp ] ]
			try { this.computeToposort( testCase ) }
			catch( ex ) { return true }
			return false
		},
		computeToposort( connections ) {
			let edges = []
			connections.forEach( p => { edges.push( [ p[ 0 ].parent.uuid, p[ 1 ].parent.uuid ] ) } )
			return toposort( edges )
		},
		disconnectXPackByInput( io ) {
			if ( io.type !== 1 ) throw new Error( 'invalid connection type' )
			let input = io
			if ( input.parent.constructor.name === 'Node' ) {
				input.disconnect()
			} else if ( input.parent instanceof XPack ) {
				let rOutput = input._via
				let endPointInput = this.traceProxyOutput( rOutput )
				if ( endPointInput ) endPointInput.forEach( inp => inp.disconnect() )
			} else if ( input.parent instanceof RouterNode ) {
				let xOutput = input._via
				let endPointInput = this.traceProxyOutput( xOutput )
				if ( endPointInput ) endPointInput.forEach( inp => inp.disconnect() )
			}
			input.disconnectProxy()
			input.parent.parent.connections = input.parent.parent.connections.filter( pair => pair[ 1 ] !== io )
		},
		connectXPackIo( opt, inp ) {
			// TODO validate connection
			this.disconnectXPackByInput( inp )
			inp.connectProxy( opt )
			let endPointOutput = this.traceProxyInput( inp )
			let endPointInput = this.traceProxyOutput( opt )
			if ( endPointOutput ) {
				endPointInput.forEach( eInp => eInp.connect( endPointOutput ) )
			}
			let parent = inp.parent.parent
			parent.connections.push( [ opt, inp ] )
		},
		unpackSelectedNode() {
			let xpack = this.selectedNodes[ 0 ]
			if ( !xpack || ( !xpack instanceof XPack ) ) throw new Error( 'invalid node' )
			let connectionRef = []
			// TODO if via does not exists?
			xpack.input.forEach( inp => {
				let left = inp.proxyOutput
				inp._via.proxyInput.forEach( pInp => {
					let right = pInp
					connectionRef.push( [ left, right ] )
				} )
			} )
			xpack.output.forEach( opt => {
				let left = opt._via.proxyOutput
				opt.proxyInput.forEach( pInp => {
					let right = pInp
					connectionRef.push( [ left, right] )
				} )
			} )
			// disconnect xpack & via connections
			xpack.input.forEach( inp => {
				this.disconnectXPackByInput( inp )
				inp._via.proxyInput.forEach( pInp => {
					this.disconnectXPackByInput( pInp )
				} )
			} )
			xpack.output.forEach( opt => {
				this.disconnectXPackByInput( opt._via )
				opt.proxyInput.forEach( inp => {
					this.disconnectXPackByInput( inp )
				} )
			} )
			// move nodes & connections to parent
			xpack.parent.nodes = [ ...xpack.parent.nodes, ...xpack.nodes.filter( n => !( n instanceof RouterNode ) ) ]
			xpack.parent.connections = [ ...xpack.parent.connections, ...xpack.connections ]
			// update parent
			xpack.nodes.forEach( n => n.parent = xpack.parent )
			// remove nodes
			xpack.nodes = []
			xpack.connecitons = []
			// recconnect ref
			connectionRef.forEach( pair => {
				this.connectXPackIo( ...pair )
			} )
			// remove xpack from parent
			xpack.parent.nodes = [ ...xpack.parent.nodes.filter( n => n !== xpack ) ]
		},
		packSelectedNodes() {
			let nodes = this.selectedNodes

			// find connections that are connected from outside of selection
			let incomingConnections = []
			nodes.forEach( n => {
				n.input.forEach( inp => {
					if ( inp.proxyOutput ) {
						let parent = inp.proxyOutput.parent
						let inSelection = nodes.indexOf( parent ) >= 0
						if ( !inSelection ) {
							incomingConnections.push( inp )
						}
					}
				} )
			} )

			let outgoingConnections = []
			nodes.forEach( n => {
				n.output.forEach( opt => {
					opt.proxyInput.forEach( inp => {
						let parent = inp.parent
						let inSelection = nodes.indexOf( parent ) >= 0
						if ( !inSelection ) {
							outgoingConnections.push( opt )
						}
					} )
				} )
			} )

			// calculate xpack position
			let xpos = { x: 0, y: 0 }
			let [ minX, maxX ] = [ Infinity, - Infinity ]
			let [ minY, maxY ] = [ Infinity, - Infinity ]
			nodes.forEach( n => {
				xpos.x += n.position.x
				xpos.y += n.position.y
				minX = Math.min( minX, n.position.x )
				maxX = Math.max( maxX, n.position.x )
				minY = Math.min( minY, n.position.y )
				maxY = Math.max( maxY, n.position.y )
			} )
			let parent = nodes[ 0 ].parent

			// create xpack
			let xp = new XPack()
			xp.parent = parent
			xp.uStreamRouter.position = { x: minX - 100, y: minY }
			xp.dStreamRouter.position = { x: maxX + 200, y: minY }
			xp.position = { x: xpos.x / nodes.length, y: xpos.y / nodes.length }

			// create io & create reference connection state ( io connection mutate proxy state )
			let connectionRef = []
			incomingConnections.forEach( inp => {
				let xinp = xp.addInput( inp.name )
				let uopt = xp.uStreamRouter.addOutput( inp.name )
				xinp._via = uopt
				uopt._via = xinp
				connectionRef.push( [ uopt, inp ] )
				connectionRef.push( [ inp.proxyOutput, xinp ] )
			} )

			outgoingConnections.forEach( opt => {
				let xopt = xp.addOutput( opt.name )
				let dinp = xp.dStreamRouter.addInput( opt.name )
				xopt._via = dinp
				dinp._via = xopt
				connectionRef.push( [ opt, dinp ] )
				opt.proxyInput.forEach( inp => {
					connectionRef.push( [ xopt, inp ] )
				} )
			} )

			// inner connection reference
			let innerConnRef = []
			nodes.forEach( n => {
				n.input.forEach( inp => {
					let opt = inp.proxyOutput
					if ( inp && opt ) {
						let inpInSelection = nodes.indexOf( inp.parent ) >= 0
						let optInSelection = nodes.indexOf( opt.parent ) >= 0
						if ( inpInSelection && optInSelection ) {
							innerConnRef.push( [ opt, inp ] )
						}
					}
				} )
			} )

			// delete old inner connection
			innerConnRef.forEach( pair => {
				this.disconnectXPackByInput( pair[ 1 ] )
			} )

			// delete old connections
			incomingConnections.forEach( inp => {
				this.disconnectXPackByInput( inp )
			} )
			outgoingConnections.forEach( opt => {
				opt.proxyInput.forEach( inp => {
					this.disconnectXPackByInput( inp )
				} )
			} )

			// remove selected nodes from parent
			parent.removeNodes( nodes )
			// add nodes to xpack
			xp.addNodes( nodes )

			// new connection
			connectionRef.forEach( pair => {
				this.connectXPackIo( ...pair )
			} )

			// reconnect inner connection
			innerConnRef.forEach( pair => {
				this.connectXPackIo( ...pair )
			} )

			parent.addNodes( [ xp ] )

		},
		traceProxyOutput( output ) {
			// trace from output -> input(s), return array of input(s)
			let self = this
			function flatten( arr ) {
				return arr.reduce( function ( flat, toFlatten ) {
					return flat.concat( Array.isArray( toFlatten ) ? flatten( toFlatten ) : toFlatten )
				}, [] )
			}
			function traceInput( input ) {
				if ( input.parent instanceof XPack ) {
					let routerOutput = input._via
					return self.traceProxyOutput( routerOutput )
				} else if ( input.parent instanceof RouterNode ) {
					let xpack = input.parent.parent
					let xpackOutput = input._via
					return self.traceProxyOutput( xpackOutput )
				} else if ( input.parent.constructor.name === 'Node' ) {
					return input
				}
			}
			if ( !output ) return null
			let endPointInput = output.proxyInput
			if ( !endPointInput ) return null
			return flatten( endPointInput.map( inp => traceInput( inp ) ) )
		},
		traceProxyInput( input ) {
			// trace backward from input -> output, return single output
			let self = this
			function traceOutput( output ) {
				if ( output.parent instanceof XPack ) {
					let routerInput = output._via
					return self.traceProxyInput( routerInput )
				} else if ( output.parent instanceof RouterNode ) {
					let xpackInput = output._via
					return self.traceProxyInput( xpackInput )
				} else if ( output.parent.constructor.name === 'Node' ) {
					return output
				}
			}
			if ( !input ) return null
			let endPointOutput = input.proxyOutput
			if ( !endPointOutput ) return null
			return traceOutput( endPointOutput )
		},
		viewXPack( xpack ) {
			this.graphView = xpack
			this.graphViewPath = [ { name: 'Root', node: this.graph }, ...constructPath( xpack ) ]
			function constructPath( xpack, path = [] ) {
				if ( xpack.parent === null ) return path
				else return constructPath( xpack.parent, [ {
					name: `${xpack.name}-${xpack.uuid.slice( 0, 4 ).toUpperCase()}`,
					node: xpack
				}, ...path ] )
			}
		},
		normalizeView( graph ) {
			// normalize nodes position
			let [ mx, my ] = [ Infinity, Infinity ]
			graph.nodes.forEach( n => {
				mx = Math.min( mx, n.position.x )
				my = Math.min( my, n.position.y )
			} )
			let offset = 50
			graph.nodes.forEach( n => {
				this.$EventBus.$emit( 'update-node-position', {
					node: n,
					pos: { x: n.position.x - mx + offset, y: n.position.y - my + offset }
				} )
			} )
			// normalize pan & zoom
			let nCont = $( this.$refs.nodeGraphContainer )
			nCont.css( 'transform', `matrix(1,0,0,1,0,0)` )
			this.vpd.zoomFactor = 1.0
			this.$EventBus.$emit( 'vp-zoom' )
			$( this.$refs.nodeGraphRoot ).scrollLeft( 0 ).scrollTop( 0 )
		},
		centerGraphInView() {
			let [ minX, maxX ] = [ Infinity, - Infinity ]
			let [ minY, maxY ] = [ Infinity, - Infinity ]
			this.graphView.nodes.forEach( n => {
				minX = Math.min( minX, n.position.x )
				maxX = Math.max( maxX, n.position.x )
				minY = Math.min( minY, n.position.y )
				maxY = Math.max( maxY, n.position.y )
			} )
			let dimension = { w: maxX - minX, h: maxY - minY }
			let vp = $( this.$refs.nodeGraphRoot )
			let vpDimension = { w: vp.width() - 150, h: vp.height() - 150 }
			let size = Math.max( dimension.w, dimension.h )
			let vpSize = Math.max( vpDimension.w, vpDimension.h )
			if ( dimension.w < dimension.h )
				vpSize = Math.min( vpDimension.w, vpDimension.h )
			let scaleFactor = Math.min( 1.0, vpSize / size )
			this.setZoomFactor( scaleFactor )
			$( this.$refs.nodeGraphRoot ).scrollLeft( minX * scaleFactor - 20 ).scrollTop( minY * scaleFactor - 20 )
		},
	},
	created() {
		this.$EventBus = this._provided.$EventBus
	},
	mounted() {
		this.init()
		this.$EventBus.$on( 'node-click', ev => {
		} )
		this.$EventBus.$on( 'node-dblclick', payload => {
			if ( this.selectedNodes.length === 1 ) console.log( this.selectedNodes[ 0 ] )
			if ( payload.node instanceof XPack && !this.ioMouseOver && !this.ioLabelMouseOver ) {
				this.viewXPack( payload.node )
			}
		} )
		this.$EventBus.$on( 'node-mousedown', payload => {
			this.$EventBus.$emit( 'node-record-prev-pos' )
			if ( payload.event.shiftKey ) {
				this.addNodeToSelection( payload.node )
			} else if ( payload.event.ctrlKey ) {
				this.removeNodeFromSelection( payload.node )
			} else if ( !this.isNodeSelected( payload.node ) ) {
				this.addNodeToSelection( payload.node, true )
			}
			window.SELECTED_NODES = this.selectedNodes
			this.$root.$emit( 'node-selected', this.selectedNodes )
			this.movingNode = true
		} )
		this.$EventBus.$on( 'node-mouseup', ev => {
			this.$EventBus.$emit( 'node-record-prev-pos' )
			this.$EventBus.$emit( 'update-io-position' )
		} )
		this.$EventBus.$on( 'io-start-connecting', io => {
			this.ioConnecting = true
			this.tempConnectionPair[ io.type ] = io
		} )
		this.$EventBus.$on( 'io-end-connecting', io => {
			this.$EventBus.$emit( 'ghost-connection-disable' )
			this.ioConnecting = false
			this.tempConnectionPair[ io.type ] = io
			let [ opt, inp ] = this.tempConnectionPair
			if ( opt !== null && inp !== null ) {
				this.connectXPackIo( ...this.tempConnectionPair )
			}
		} )
		this.$EventBus.$on( 'io-disconnect', io => {
			if ( io.type === 1 ) {
				this.disconnectXPackByInput( io )
			} else {
				io.proxyInput.forEach( inp => this.disconnectXPackByInput( inp ) )
			}
		} )
		this.$EventBus.$on( 'io-mouse-enter', () => {
			this.ioMouseOver = true
		} )
		this.$EventBus.$on( 'io-mouse-leave', () => {
			this.ioMouseOver = false
		} )
		this.$EventBus.$on( 'io-label-mouseenter', () => {
			this.ioLabelMouseOver = true
		} )
		this.$EventBus.$on( 'io-label-mouseleave', () => {
			this.ioLabelMouseOver = false
		} )
		this.$EventBus.$on( 'io-label-mousedown', () => {
			this.draggingLabel = true
		} )
		this.$EventBus.$on( 'node-title-mouseenter', () => {
			this.nodeTitleMouseOver = true
		} )
		this.$EventBus.$on( 'node-title-mouseleave', () => {
			this.nodeTitleMouseOver = false
		} )
		$( this.$refs.nodeGraphRoot )
			.on( 'contextmenu', ev => {
				ev.preventDefault()
			} )
			.on( 'mousedown', ev => {
				if ( ev.button === 0 ) {
					this.vpd.leftMouseHold = true
					if ( !this.movingNode )
						this.$EventBus.$emit( 'selection-box-enable', ev )
					if ( !this.ioLabelMouseOver )
						this.$EventBus.$emit( 'io-label-edit-disable' )
					if ( !this.nodeTitleMouseOver )
						this.$EventBus.$emit( 'node-title-edit-disable' )
				}
				if ( ev.button === 1 ) {
					ev.preventDefault()
					this.vpd.middleMouseHold = true
				}
				this.vpd.prevMouse = { x: ev.clientX, y: ev.clientY }
			} )
			.on( 'mouseup', ev => {
				if ( ev.button !== 1 && this.vpd.leftMouseHold ) {
					let selecting = this.graphView.nodes.filter( n => n._selecting )
					if ( !this.movingNode ) {
						if ( selecting.length > 0 ) {
							if ( ev.shiftKey ) {
								selecting.forEach( n => {
									this.addNodeToSelection( n )
									this.$EventBus.$emit( 'node-clear-selecting', n )
								} )
							} else if ( ev.ctrlKey ) {
								selecting.forEach( n => {
									this.removeNodeFromSelection( n )
									this.$EventBus.$emit( 'node-clear-selecting', n )
								} )
							} else {
								this.clearSelectedNodes()
								selecting.forEach( n => {
									this.addNodeToSelection( n )
									this.$EventBus.$emit( 'node-clear-selecting', n )
								} )
							}
							this.$root.$emit( 'node-selected', this.selectedNodes )
						} else {
							this.clearSelectedNodes()
						}
					}
				}
				this.vpd.leftMouseHold = false
				this.vpd.middleMouseHold = false
				this.enableSelectionBox = false
				this.movingNode = false
				this.ioConnecting = false
				this.draggingLabel = false
				this.tempConnectionPair = [ null, null ]
				this.$EventBus.$emit( 'ghost-connection-disable' )
				this.$EventBus.$emit( 'selection-box-disable', ev )
				this.$EventBus.$emit( 'io-label-dragging-disable')
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
			.on( 'mousemove', ev => {
				let rm = this.getMousePositionRelative( ev )
				this.$EventBus.$emit( 'ghost-connection-update', rm )
				this.$EventBus.$emit( 'selection-box-update', ev )
				let [ dx, dy ] = [ ev.clientX - this.vpd.prevMouse.x, ev.clientY - this.vpd.prevMouse.y ]
				if ( this.vpd.middleMouseHold ) {
					this.pan( dx, dy )
					this.vpd.prevMouse = { x: ev.clientX, y: ev.clientY }
				}
				if ( !this.vpd.middleMouseHold  &&
					this.selectedNodes.length > 0 &&
					this.movingNode &&
					!this.draggingLabel &&
					!this.ioConnecting
				) {
					this.selectedNodes.forEach( n => {
						this.$EventBus.$emit( 'node-move', {
							nodes: this.selectedNodes,
							delta: { dx, dy }
						} )
					} )
				}
			} )
	}
}
</script>

<style lang="sass">
	.viewport
		width: 100%
		height: 100%
	.nodeGraphRoot
		user-select: none
		cursor: default
		transform-style: preserve-3d
		overflow: scroll
		position: absolute
		height: 100%
		width: 100%
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
	.btn
		margin-right: 10px
		float: right
		display: inline-block
		cursor: pointer
</style>
