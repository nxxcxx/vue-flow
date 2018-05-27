<template lang="pug">
	div.contextMenu( ref='contextMenu' v-show='active' )
		div.menuItem(
			v-for='( v, k ) in menu'
			:key='k'
			@click='selectMenu( v, k )'
		) {{ k }}
</template>

<script>
export default {
	name: 'ContextMenu',
	inject: [ '$EventBus' ],
	data() {
		return {
			active: false,
			menu: {
				'create node': null,
				'add input': null,
				'add output': null,
				'rename': null,
				'delete io': null,
				'delete node': null,
			}
		}
	},
	methods: {
		selectMenu( v, k ) {
			this.active = false
			console.log( v, k )
		}
	},
	mounted() {
		let cont = $( this.$parent.$refs.nodeGraphRoot )
		let ctxm = $( this.$refs.contextMenu )
		ctxm.on( 'contextmenu', ev => ev.preventDefault() )
		cont.on( 'contextmenu', ev => {
			ev.preventDefault()
			this.active = true
			let [ x, y ] = [ ev.clientX - cont.offset().left, ev.clientY - cont.offset().top ]
			ctxm.css( { left: x, top: y } )
			let menuWidth = ctxm.width()
			let menuHeight = ctxm.height()
			let overflowX = x + menuWidth > cont.width()
			let overflowY = y + menuHeight > cont.height()
			if ( overflowX && overflowY ) {
				ctxm.css( 'transform', 'translate( -100%, -100% )' )
			} else if ( overflowX ) {
				ctxm.css( 'transform', 'translate( -100%, 0px )' )
			} else if ( overflowY ) {
				ctxm.css( 'transform', 'translate( 0px, -100% )' )
			} else {
				ctxm.css( 'transform', 'translate( 0, 0 )' )
			}
		} )
		$( document ).on( 'click', ev => {
			this.active = false
		} )
	},
}
</script>

<style lang="sass">
	.contextMenu
		cursor: default
		position: absolute
		top: 0px
		left: 0px
		background: rgb( 10, 10, 10 )
		padding: 2px
		width: 100px
		transform: translate( -100%, -100% )

	.menuItem:hover
		background: rgba(255, 255, 255, 0.2)

</style>
