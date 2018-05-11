<template>
	<div>
		<textarea ref="editor"></textarea>
	</div>
</template>

<script>
import EventBus from './EventBus.js'
import CodeMirror from 'codemirror'
import 'root/node_modules/codemirror/mode/javascript/javascript.js'
import 'root/node_modules/codemirror/keymap/vim.js'
import 'root/node_modules/codemirror/lib/codemirror.css'
import 'root/node_modules/codemirror/theme/material.css'

export default {
	name: 'NodeEditor',
	data() {
		return {
			selectedNodes: [],
		}
	},
	mounted() {
		let cm = CodeMirror.fromTextArea( this.$refs.editor, {
			mode: 'javascript',
			keyMap: 'vim',
			theme: 'material',
			lineNumbers: true,
			tabSize: 2
		} )
		cm.constructor.Vim.map( 'jj', '<Esc>', 'insert' )
		cm.setSize( '100%', 500 )
		cm.on( 'change', cm => {
			if ( this.selectedNodes.length === 1 ) {
				this.selectedNodes[ 0 ]._fnstr = cm.doc.getValue()
			}
		} )
		EventBus.$on( 'node-selected', nodes => {
			if ( nodes.length === 1 ) {
				this.selectedNodes = nodes
				cm.doc.setValue( nodes[ 0 ]._fnstr )
				cm.doc.clearHistory()
			}
		} )
	},
	methods: {
	}
}
</script>

<style lang="sass">
</style>
