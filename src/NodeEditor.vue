<template>
	<div>
		<textarea ref="editor"></textarea>
	</div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'root/node_modules/codemirror/addon/edit/closebrackets.js'
import 'root/node_modules/codemirror/mode/javascript/javascript.js'
import 'root/node_modules/codemirror/mode/glsl/glsl.js'
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
			autoCloseBrackets: true,
			tabSize: 2,
		} )
		cm.constructor.Vim.map( 'jj', '<Esc>', 'insert' )
		cm.setSize( '100%', 500 )
		cm.on( 'change', cm => {
			if ( this.selectedNodes.length === 1 ) {
				this.selectedNodes[ 0 ]._fnstr = cm.doc.getValue()
			}
		} )
		this.$root.$on( 'node-selected', nodes => {
			if ( nodes.length === 1 ) {
				this.selectedNodes = nodes
				cm.doc.setValue( nodes[ 0 ]._fnstr )
				cm.doc.clearHistory()
				cm.setOption( 'readOnly', false )
			} else if ( nodes.length > 1 ) {
				cm.doc.setValue( `<< ${nodes.length} NODES SELECTED >>` )
				cm.doc.clearHistory()
				cm.setOption( 'readOnly', true )
			} else {
				this.selectedNodes = []
				cm.doc.setValue( '' )
			}
		} )
		this.$root.$on( 'node-clear-selected', () => {
			this.selectedNodes = []
			cm.doc.setValue( '' )
		} )
	},
	methods: {
	}
}
</script>

<style lang="sass">
	.cm-s-material.CodeMirror
		background: #151617
	.cm-s-material .CodeMirror-gutters
		background: #111213
	.cm-s-material .CodeMirror-linenumber
		color: #d0d0d0
	.CodeMirror div.CodeMirror-cursor
		background: rgba(#f1f1f1, 0.5)
</style>
