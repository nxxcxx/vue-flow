<template lang="pug">
	div#selectionBox(
		v-show='active'
		:style="{ width: `${width}px`, height: `${height}px`, top: `${top}px`, left: `${left}px` }"
	)
</template>

<script>
export default {
	name: 'SelectionBox',
	inject: [ '$EventBus' ],
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
		let setPosition = ( l, t ) => { [ this.left, this.top ] = [ l, t ] }
		this.$EventBus.$on( 'selection-box-enable', ev => {
			this.prevPos = { x: ev.clientX, y: ev.clientY }
			this.prevPosRel = this.$parent.getMousePositionRelative( ev )
			this.active = true
		} )
		this.$EventBus.$on( 'selection-box-disable', ev => {
			this.active = false
			this.resetSelectionBox()
		} )
		this.$EventBus.$on( 'selection-box-update', ev => {
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
			this.$parent.graphView.nodes.forEach( n => {
				if ( doRectIntersect( {
					l,
					t,
					r: l + Math.abs( this.cpr.x - this.prevPosRel.x ),
					b: t + Math.abs( this.cpr.y - this.prevPosRel.y )
				}, {
					l: n.position.x,
					t: n.position.y,
					r: n.position.x + n._dimension.w,
					b: n.position.y + n._dimension.h
				} ) ) {
					this.$EventBus.$emit( 'node-set-selecting', n )
				} else {
					this.$EventBus.$emit( 'node-clear-selecting', n )
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
