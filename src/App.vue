<template>
	<div id="app">
		<div id="left">
			<NodeEditor></NodeEditor>
		</div>
		<div id="right">
			<NodeGraph></NodeGraph>
		</div>
	</div>
</template>

<script>
import NodeGraph from './NodeGraph.vue'
import NodeEditor from './NodeEditor.vue'

export default {
	name: 'app',
	components: {
		NodeGraph,
		NodeEditor
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
		width: 30%
	#right
		width: 70%
</style>
