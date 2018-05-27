<template lang="pug">
	div#app
		main.grid( ref='main' )
			div#left( ref='leftView' )
				div( style='background: #0a0a0a; width: 100%; height: 14px' )
					div.btn( @click='parseSelectedNodes' ) [PSEL]
					div.btn( @click='flushSelectedNodes' ) [FSEL]
					div.btn( @click='parse' ) [PARSE]
					div.btn( @click='step' ) [STEP]
					div.btn( @click='loopStop' ) [STOP]
					div.btn( @click='loopStart' ) [START]
				div( v-if='selectedNodes.length === 1' ).
					[{{ selectedNodes[ 0 ].name }}] {{ selectedNodes[ 0 ].uuid.toUpperCase() }}
				div( v-if='selectedNodes.length !== 1' ).
					[]
				NodeEditor
				TreeView( :xpack='graph' :depth='0' )
			div.gridResizer( ref='gridSeparator' )
			div#right( ref='rightView' )
				div( style='position: relative; height: 50%' )
					NodeGraph( :graph='graph' )
				div( style='position: relative; height: 50%' )
					NodeGraph( :graph='graph' )
				div.minimap
					NodeGraph( :graph='graph' )
				canvas#canvas( ref='canvas' )
</template>

<script>
import NodeGraph from './NodeGraph.vue'
import NodeEditor from './NodeEditor.vue'
import { XPack, RouterNode } from './xpack.js'
import TreeView from './TreeView.vue'
import nodeFactory from './NodeFactory.js'

export default {
	name: 'app',
	components: {
		NodeGraph, NodeEditor, TreeView
	},
	data() {
		return {
			graph: new XPack(),
			selectedNodes: [],
			three: {
				renderer: null
			}
		}
	},
	methods: {
		initTHREE() {
			this.three.renderer = new THREE.WebGLRenderer( {
				canvas: this.$refs.canvas,
				alpha: true,
				antialias: true
			} )
			$( window ).on( 'resize', () => {
				let v = $( this.$refs.rightView )
				this.three.renderer.setSize( v.width(), v.height() )
			} ).trigger( 'resize' )
		},
		exportGraph( graph ) {
			function parseNode( graph, gcc = { nodes: [], connections: [] } ) {
				gcc.connections = graph.connections.map( p => [ p[ 0 ].uuid, p[ 1 ].uuid ] )
				for ( let node of graph.nodes ) {
					let n = {}
					n.name = node.name
					n.uuid = node.uuid
					n.position = { x: ~~node.position.x, y: ~~node.position.y }
					n._fnstr = node._fnstr
					n.input = node.input.map( inp => {
						let res = { name: inp.name, uuid: inp.uuid }
						if ( inp._via )
							res._via = inp._via.uuid
						return res
					 } )
					n.output = node.output.map( opt => {
						 let res = { name: opt.name, uuid: opt.uuid }
						 if ( opt._via )
							res._via = opt._via.uuid
						 return res
					 } )
					n.nodes = []
					n.connections = []
					gcc.nodes.push( n )
					parseNode( node, n )
				}
				return gcc
			}
			return parseNode( graph )
		},
		importGraph() {

			let uuid_io_ref = {}

			function construct( graph, gcc ) {
				let newRouter = []
				for ( let node of graph.nodes ) {

					let n;
					if ( node.nodes.length > 0 ) {
						n = new XPack()
					} else if ( node.name !== 'VIA' ) {
						n = new nodeFactory.Node()
					} else if ( node.name === 'VIA' ) {
						n = new RouterNode( 'VIA' )
					}

					n.xpack = gcc
					n.parent = gcc
					n.name = node.name
					n.uuid = node.uuid
					n.position = node.position
					n._fnstr = node._fnstr

					for ( let inp of node.input ) {
						let io = n.addInput( inp.name )
						io.uuid = inp.uuid
						io._via = inp._via
						uuid_io_ref[ inp.uuid ] = io
					}
					for ( let opt of node.output ) {
						let io = n.addOutput( opt.name )
						io.uuid = opt.uuid
						io._via = opt._via
						uuid_io_ref[ opt.uuid ] = io
					}
					if ( n instanceof RouterNode ) {
						let type = n.output.length > 0 ? 0 : 1
						newRouter[ type ] = n
					}
					gcc.nodes.push( n )

				}

				// set via of current xpack

				gcc.nodes = gcc.nodes.filter( n => !( n instanceof RouterNode ) )
				if ( gcc instanceof XPack ) {
					gcc.uStreamRouter = newRouter[ 0 ]
					gcc.dStreamRouter = newRouter[ 1 ]
					if ( gcc.uStreamRouter )
						gcc.nodes.unshift( gcc.uStreamRouter )
					if ( gcc.dStreamRouter )
						gcc.nodes.unshift( gcc.dStreamRouter )
				}

				for ( let node of graph.nodes ) {
					let n = gcc.nodes.find( nn => nn.uuid === node.uuid )
					if ( n ) construct( node, n )
				}

				gcc.connections = graph.connections.map( p => [ uuid_io_ref[ p[ 0 ] ], uuid_io_ref[ p[ 1 ] ] ] )
			}

			let root = new XPack()
			let importedGraph = require( './graph.json' )
			construct( importedGraph, root )

			// map via uuid to ref
			function mapVia( graph ) {
				graph.nodes.forEach( node => {
					if ( node instanceof XPack ) {
						node.input.forEach( inp => {
							inp._via = uuid_io_ref[ inp._via ]
							inp._via._via = inp
						} )
						node.output.forEach( opt => {
							opt._via = uuid_io_ref[ opt._via ]
							opt._via._via = opt
						} )
					}
					mapVia( node )
				} )
			}
			mapVia( root )

			this.graph = root
			window.GRAPH = root
			console.log( 'GRAPH:', this.graph )
			return root
		},
		parse() {
			let rfunc = ( graph, fn ) => {
				graph.nodes.forEach( n => {
					if ( n.constructor.name === 'Node' ) {
						n[ fn ]()
					} else if ( n instanceof XPack ) {
						rfunc( n, fn )
					}
				} )
			}
			rfunc( this.graph, 'parse' )
		},
		step() {
			let order = 0
			let exe = ( graph ) => {
				graph.nodes
				.forEach( n => {
					if ( n.constructor.name === 'Node' ) {
						let renderer = this.three.renderer
						let injObj = {
							renderer,
							width: renderer.getSize().width,
							height: renderer.getSize().height
						}
						n.execute( injObj )
					} else if ( n instanceof XPack ) {
						exe( n )
					}
					n.order = order++
				} )
			}
			exe( this.graph )
		},
		run() {
			this.step()
			this.requestAnimFrameId = window.requestAnimationFrame( this.run.bind( this ) )
		},
		loopStart() {
			if ( !this.requestAnimFrameId ) {
				this.parse()
				this.run()
			}
		},
		loopStop() {
			if ( this.requestAnimFrameId ) {
				window.cancelAnimationFrame( this.requestAnimFrameId )
				delete this.requestAnimFrameId
			}
		},
		flushSelectedNodes() {
			this.selectedNodes.forEach( n => n.flush() )
		},
		parseSelectedNodes() {
			this.selectedNodes.forEach( n => n.parse() )
		},
	},
	created() {
		this.importGraph()
	},
	mounted() {

		let resizingGrid = false
		$( this.$refs.gridSeparator )
		.on( 'mousedown', ev => {
			resizingGrid = true
		} )
		$( window )
		.on( 'mouseup', ev => {
			resizingGrid = false
		} )
		.on( 'mousemove', ev => {
			if ( resizingGrid ) {
				let grid = $( this.$refs.main )
				let xCoordPercent = Math.min( Math.max( 0, ev.clientX / grid.width() * 100 ), 100 )
				grid.css( 'grid-template-columns', `${xCoordPercent}% 5px auto` )
				let cv = $( this.$refs.canvas )
				cv.css( 'width', '100%' )
				$( window ).trigger( 'resize' )
			}
		} )

		this.initTHREE()
		this.$root.$on( 'node-selected', nodes => {
			this.selectedNodes = nodes
		} )
		this.$root.$on( 'node-clear-selected', () => {
			this.selectedNodes = []
		} )
		window.TEST_EXPORT_GRAPH = () => {
			let exportedGraph = this.exportGraph( this.graph )
			console.log( 'exported:', exportedGraph )
			exportedGraph = JSON.stringify( exportedGraph, null, 2 )
			let win = window.open()
			win.document.open()
			win.document.write( '<html><body><pre>' + exportedGraph + '</pre></body></html>' )
			win.document.close()
		}
	}
}
</script>

<style lang="sass">
	$b0: #000
	$b2: #222

	$w1: #e6e6e6
	$w2: #c8c8c8
	$g0: #7f7f7f

	$dz: rgb(19, 21, 23)
	$d0: rgb(24, 26, 28)
	$d1: rgb(29, 31, 33)

	html, body
		margin: 0px
		padding: 0px
		height: 100%
		background: $d1
		color: $w1
		font-family: monospace
		font-size: 12px
	svg
		overflow: visible
	::-webkit-scrollbar
		background: $dz
		border-right: 1px solid $w1
		width: 5px
		height: 5px
	::-webkit-scrollbar-track
		background: $dz
	::-webkit-scrollbar-thumb
		background: $w1
	::-webkit-scrollbar-thumb:active
		background: $g0
	#app
		height: 100%
		draggable: false
	.grid
		display: grid
		height: 100%
		grid-template-columns: 30% 5px auto
		draggable: false
	.gridResizer
		background: #0a0a0a
		cursor: e-resize
	#left
		height: 100%
		z-index: 10
	#right
		position: relative
		height: 100%
	#canvas
		pointer-events: none
		width: 100%
		height: 100%
		position: absolute
		top: 0px
		left: 0px
		transform-style: preserve-3d
		z-index: 100
	.minimap
		position: absolute
		width: 200px
		height: 100px
		top: 0px
		right: 0px
		background: rgba(0, 0, 0, 0.85)

</style>
