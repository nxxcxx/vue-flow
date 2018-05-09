<template>
	<div id="selectionBox"
	v-show="visible"
	:style="{
		width: width + 'px', height: height + 'px',
		top: top + 'px', left: left + 'px' }">
	</div>
</template>

<script>
export default {
	name: 'SelectionBox',
	data() {
		return {
			visible: false,
			width: 0,
			height: 0,
			top: 0,
			left: 0,
			prevPos: { x: 0, y: 0 },
			prevPosRel: { x: 0, y: 0 }
		}
	},
	mounted() {
		let vp = $( this.$parent.$refs.nodeGraphRoot )
		let setPosition = ( l, t ) => { [ this.left, this.top ] = [ l, t ] }
		vp.on( 'mousedown', ev => {
			if ( ev.button !== 0 ) return
			this.prevPos = { x: ev.clientX, y: ev.clientY }
			this.prevPosRel = this.$parent.getMousePositionRelative( ev )
			this.visible = true
		} )
		.on( 'mouseup', ev => {
			this.visible = false
			this.resetSelectionBox()
		} )
		.on( 'mousemove', ev => {
			if ( !this.$parent.viewportData.mouseholdBG ) return
			let [ cp, pp ] = [ { x: ev.clientX, y: ev.clientY }, this.prevPos ]
			, ppr = this.prevPosRel
			, cpr = this.cpr = this.$parent.getMousePositionRelative( ev )
			this.width = Math.abs( cp.x - pp.x )
			this.height = Math.abs( cp.y - pp.y )
			if ( cp.x < pp.x && cp.y < pp.y ) {
				setPosition( cp.x, cp.y )
			} else if ( cp.x < pp.x ) {
				setPosition( cp.x, pp.y )
			} else if ( cp.y < pp.y ) {
				setPosition( pp.x, cp.y )
			} else {
				setPosition( pp.x, pp.y )
			}
		} )
	},
	methods: {
		resetSelectionBox() {
			this.width = this.height = this.top = this.left = 0
		}
	}
}
</script>

<style lang="sass">
#selectionBox
	position: fixed
	border: 1px solid #0bb1f9
	pointer-events: none
</style>
