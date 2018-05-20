<template>
	<div id="app">
		<div id="left">
			<div v-if="selectedNodes.length === 1">
				[{{ selectedNodes[ 0 ].name }}]
			</div>
			<div v-if="selectedNodes.length !== 1">
				[]
			</div>
			<NodeEditor></NodeEditor>

			<div style="font-size: 0.9em; padding: 5px; background: rgba(200, 200, 200, 0.025);">
				<TreeView :xpack="graph" :depth="0"></TreeView>
			</div>

		</div>
		<div ref="rightView" id="right">
			<div style="position: relative; width: 100%; height: 50%; top: 0px; left: 0px">
				<NodeGraph :graph="graph"></NodeGraph>
			</div>
			<div style="position: relative; width: 100%; height: 50%; top: 0px; left: 0px">
				<NodeGraph :graph="graph"></NodeGraph>
			</div>

			<canvas
				ref="canvas" id="canvas"
				style="pointer-events: none; width: 100%; height: 100%; position: absolute; top: 0px; left: 0px; transform-style: preserve-3d; z-index: 100;">
			</canvas>

		</div>
	</div>
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
		NodeGraph,
		NodeEditor,
		TreeView
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
					n.input = node.input.map( inp => ( { name: inp.name, uuid: inp.uuid } ) )
					n.output = node.output.map( opt => ( { name: opt.name, uuid: opt.uuid} ) )
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
						n.parent = gcc
					} else if ( node.name !== 'VIA' ) {
						n = new nodeFactory.Node()
						n.parent = gcc
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
						uuid_io_ref[ inp.uuid ] = io
					}
					for ( let opt of node.output ) {
						let io = n.addOutput( opt.name )
						io.uuid = opt.uuid
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
					// gcc.uStreamRouter = newRouter[ 0 ] || new RouterNode( 'NULL' )
					// gcc.dStreamRouter = newRouter[ 1 ] || new RouterNode( 'NULL' )
					gcc.uStreamRouter = newRouter[ 0 ]
					gcc.dStreamRouter = newRouter[ 1 ]
					if ( gcc.uStreamRouter )
						gcc.nodes.unshift( gcc.uStreamRouter )
					if ( gcc.dStreamRouter )
						gcc.nodes.unshift( gcc.dStreamRouter )
					// gcc.nodes = [ gcc.uStreamRouter, gcc.dStreamRouter, ...gcc.nodes ]
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
			this.graph = root
			console.log( 'GRAPH:', this.graph )
			return root
		},
	},
	created() {
		this.importGraph()
	},
	mounted() {
		this.initTHREE()
		this.$root.$on( 'node-clear-selected', () => {
			this.selectedNodes = []
		} )

		window.testExport = () => {
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
	#left
		position: absolute
		width: 30%
		height: 100%
		border-right: 2px solid $dz
		z-index: 10
	#right
		position: absolute
		width: 70%
		height: 100%
		left: 30%
		// box-shadow: inset 3px 0px #008cff
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
</style>
