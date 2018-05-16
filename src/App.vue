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
		</div>
		<div id="right">
			<div style="position: relative; width: 100%; height: 50%; top: 0px; left: 0px">
				<NodeGraph :graph="graph"></NodeGraph>
			</div>
			<div style="position: relative; width: 100%; height: 50%; top: 0px; left: 0px">
				<NodeGraph :graph="graph"></NodeGraph>
			</div>
		</div>
	</div>
</template>

<script>
import NodeGraph from './NodeGraph.vue'
import NodeEditor from './NodeEditor.vue'
import importGraphConfiguration from './import.svc.js'
import { XPack } from './xpack.js'

export default {
	name: 'app',
	components: {
		NodeGraph,
		NodeEditor
	},
	data() {
		return {
			graph: new XPack(),
			selectedNodes: [],
		}
	},
	methods: {
		importGraph() {
			let graph = importGraphConfiguration()
			this.graph.nodes = graph.nodes
			this.graph.connections = graph.connections
		},
	},
	created() {
		this.importGraph()
	},
	mounted() {
		this.$root.$on( 'node-clear-selected', () => {
			this.selectedNodes = []
		} )
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
</style>
