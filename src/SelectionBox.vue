<template>
	<div id="selectionBox"
	v-show="active"
	:style="{
		width: width + 'px', height: height + 'px',
		top: top + 'px', left: left + 'px' }">
	</div>
</template>

<script>
export default {
	name: 'SelectionBox',
	props: [ 'enable' ],
	data() {
		return {
			active: false,
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
			if ( !this.enable ) return
			if ( ev.button !== 0 ) return
			this.prevPos = { x: ev.clientX, y: ev.clientY }
			this.prevPosRel = this.$parent.getMousePositionRelative( ev )
			this.active = true
		} )
		.on( 'mouseup', ev => {
			this.active = false
			this.resetSelectionBox()
		} )
		.on( 'mousemove', ev => {
			if ( !this.active ) return
			let [ cp, pp ] = [ { x: ev.clientX, y: ev.clientY }, this.prevPos ]
			, ppr = this.prevPosRel
			, cpr = this.cpr = this.$parent.getMousePositionRelative( ev )
			this.width = Math.abs( cp.x - pp.x )
			this.height = Math.abs( cp.y - pp.y )
			if ( cp.x < pp.x && cp.y < pp.y ) {
				setPosition( cp.x, cp.y )
				this.select( cpr.x, cpr.y )
			} else if ( cp.x < pp.x ) {
				setPosition( cp.x, pp.y )
				this.select( cpr.x, ppr.y )
			} else if ( cp.y < pp.y ) {
				setPosition( pp.x, cp.y )
				this.select( ppr.x, cpr.y )
			} else {
				setPosition( pp.x, pp.y )
				this.select( ppr.x, ppr.y )
			}
		} )
	},
	methods: {
		resetSelectionBox() {
			this.width = this.height = this.top = this.left = 0
		},
		select( l, t ) {
			this.$parent.graph.nodes.forEach( n => {
				if ( doRectIntersect( {
					l,
					t,
					r: l + Math.abs( this.cpr.x - this.prevPosRel.x ),
					b: t + Math.abs( this.cpr.y - this.prevPosRel.y )
				}, {
					l: n.position.x,
					t: n.position.y,
					r: n.position.x + $( n.__vue__.$refs.nodeModule ).outerWidth(),
					b: n.position.y + $( n.__vue__.$refs.nodeModule ).outerHeight()
				} ) ) {
					n.__vue__.setSelecting()
				} else {
					n.__vue__.clearSelecting()
				}
			} )
			function doRectIntersect( r1, r2 ) {
				return !( r2.l > r1.r || r2.r < r1.l || r2.t > r1.b || r2.b < r1.t )
			}
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
