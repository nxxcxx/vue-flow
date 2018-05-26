<template>
	<div ref="nodeModule" class="nodeModule"
		:style="{ transform: `matrix(1,0,0,1,${node.position.x},${node.position.y})` }"
		:class="{ selected, tmpSelected: node._selecting, awatingInputData: !node._receivedAllOputput }"
	>
		<div class="title" @mouseenter="mouseenterTitle()" @mouseleave="mouseleaveTitle()" @dblclick="editTitle()">
			<span v-show="!editingTitle">{{ node.name || 'null' }}</span>
			<span v-show="editingTitle"><input ref="titleInput" @input="autoResizeTitleInput" class="titleInput" type="text" v-model="node.name" spellcheck="false"></span>
			&nbsp;<span style="float: right;">[{{ node.order }}]</span>
		</div>
		<div class="ioContainer">
			<div class="inputColumn">
				<NodeModuleIO v-for="input of node.input" :key="input.uuid" :io="input"></NodeModuleIO>
			</div>

			<div class="separator"></div>

			<div class="outputColumn">
				<NodeModuleIO v-for="output of node.output" :key="output.uuid" :io="output"></NodeModuleIO>
			</div>
		</div>

	</div>
</template>

<script>
import NodeModuleIO from './NodeModuleIO.vue'

export default {
	name: 'NodeModule',
	components: { NodeModuleIO },
	inject: [ '$EventBus' ],
	props: [ 'node', 'selected' ],
	data() {
		return {
			prevPos: { left: 0, top: 0 },
			editingTitle: false,
		}
	},
	watch: {
		'node.order': function() {
			this.$emit( 'update-child-io-position' )
		}
	},
	methods: {
		mouseenterTitle() {
			this.$EventBus.$emit( 'node-title-mouseenter' )
		},
		mouseleaveTitle() {
			this.$EventBus.$emit( 'node-title-mouseleave' )
		},
		editTitle() {
			this.editingTitle = true
			this.autoResizeTitleInput()
		},
		autoResizeTitleInput() {
			let titleInput = $( this.$refs.titleInput )
			titleInput.width( Math.max( 10, titleInput.val().length * 6.5 ) )
		},
		setSelecting() {
			this.node._selecting = true
		},
		clearSelecting() {
			this.node._selecting = false
		},
		setPosition( x, y ) {
			this.node.position = { x, y }
			this.$emit( 'update-child-io-position' )
		},
		recordPrevPos() {
			this.prevPos = $( this.$refs.nodeModule ).position() || this.prevPos
		},
		moveByUnit( dx, dy ) {
			let zf = this.$parent.vpd.zoomFactor
			, [ x, y ] = [ ( this.prevPos.left + dx ) / zf, ( this.prevPos.top + dy ) / zf ]
			// test snapping
			// x = 5 * Math.round( x / 5 )
			// y = 5 * Math.round( y / 5 )
			this.setPosition( x, y )
		},
		updateDimension() {
			let w = $( this.$refs.nodeModule ).outerWidth()
			let h = $( this.$refs.nodeModule ).outerHeight()
			this.node._dimension = { w, h }
		}
	},
	mounted() {
		this.updateDimension()
		this.$EventBus.$on( 'node-title-edit-disable', () => {
			this.editingTitle = false
			this.$emit( 'update-child-io-position' )
		} )
		this.$EventBus.$on( 'node-set-selecting', node => {
			if ( node === this.node ) this.setSelecting()
		} )
		this.$EventBus.$on( 'node-clear-selecting', node => {
			if ( node === this.node ) this.clearSelecting()
		} )
		this.$EventBus.$on( 'update-io-position', () => {
			this.$emit( 'update-child-io-position' )
		} )
		this.$EventBus.$on( 'node-record-prev-pos', () => {
			this.recordPrevPos()
		} )
		this.$EventBus.$on( 'node-move', payload => {
			if ( payload.nodes.indexOf( this.node ) >= 0 ) {
				this.moveByUnit( payload.delta.dx, payload.delta.dy )
			}
		} )
		this.$EventBus.$on( 'update-node-position', payload => {
			if ( payload.node === this.node )
				this.setPosition( payload.pos.x, payload.pos.y )
		} )

		let ioDragging = null
		this.$EventBus.$on( 'io-label-mousedown', io => {
			ioDragging = io
		} )
		this.$on( 'io-label-mouseenter', io => {
			if ( !ioDragging || ioDragging === io) return
			if ( io.parent === this.node ) {
				let ioArray = this.node[ io.type === 0 ? 'output' : 'input' ]
				let ix = ioArray.indexOf( ioDragging )
				let iy = ioArray.indexOf( io )
				if ( ix >= 0 && iy >= 0 ) {
					let temp = ioArray[ ix ]
					this.$set( ioArray, ix, ioArray[ iy ] )
					this.$set( ioArray, iy, temp )
				}
				this.$emit( 'update-child-io-position' )
			}
		} )
		this.$EventBus.$on( 'io-label-dragging-disable', () => {
			ioDragging = null
		} )
		$( this.$refs.nodeModule )
			.on( 'click', ev => {
				this.$EventBus.$emit( 'node-click', ev )
			} )
			.on( 'dblclick', ev => {
				this.$EventBus.$emit( 'node-dblclick', {
					node: this.node, event: ev
				} )
			} )
			.on( 'mousedown', ev => {
				if ( ev.button !== 0 ) return
				this.recordPrevPos()
				this.$EventBus.$emit( 'node-mousedown', {
					node: this.node, event: ev
				} )
			} )
			.on( 'mouseup', ev => {
				this.$EventBus.$emit( 'node-mouseup' )
			} )
	},
	beforeDestroy() {
		// this.$EventBus.$off( 'io-label-mouseenter' )
	}
}
</script>

<style lang="sass">
	$d0: rgb(24,26,28)
	$b0: #0bb1f9
	$h1: #e6e6e6
	$w1: #e6e6e6
	$s0: #0bb1f9
	.nodeModule
		position: absolute
		background: $d0
		pointer-events: auto
		box-sizing: border-box
		border: 1px solid transparent
		&:hover
			border: 1px solid $h1
		&.tmpSelected
			border: 1px solid $s0
		&.selected
			border: 1px solid $b0
			z-index: 5
	.title
		height: 15px

	.ioContainer
		display: flex
		justify-content: space-between
	.separator
		width: 15px
		display: inline-block
	.inputColumn
		display: inline-block
	.outputColumn
		display: inline-block
	.awatingInputData
		border: 1px solid #f9b80b
	input
		padding: 0px 4px
		border: none
		height: 13px
		background: rgb(42, 42, 42)
		outline-width: 0px
		color: white
		font-family: monospace
		font-size: 12px
		min-width: 10px

		&::selection
			background: rgb(189, 189, 189)
</style>
