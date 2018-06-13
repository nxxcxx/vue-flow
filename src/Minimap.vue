<template lang="pug">
	div.viewport( ref='viewport' )
		div.nodeGraphRoot( ref='nodeGraphRoot' style='background: black;' )
			div.nodeGraphContainer( ref='nodeGraphContainer' :style='{ transform: matrixStr }' )
				svg.nodeContainerSvg
					NodeConnection(
						v-for='conn in graphView.connections'
						:key='conn[ 0 ].uuid + conn[ 1 ].uuid'
						:conn='conn'
					)
				div.nodeContainer
					NodeModule(
						v-for='node in graphView.nodes'
						:key='node.uuid' :node='node'
						:selected='false'
					)
		div( ref='minimapViewRect'
			style='position: absolute; border: 1px solid white; background: rgba(255, 255, 255, 0.25)'
			:style='{ width: `${mmRect.w}px`, height: `${mmRect.h}px`, left: `${mmRect.x}px`, top: `${mmRect.y}px` }'
		)
</template>

<script>

import Vue from 'vue'
import NodeModule from './NodeModule.vue'
import NodeConnection from './NodeConnection.vue'
import toposort from 'toposort'
import { XPack, RouterNode } from './xpack.js'
import nodeFactory from './NodeFactory.js'

export default {
	name: 'Minimap',
	components: { NodeModule, NodeConnection },
	props: [ 'graph' ],
	provide() {
		return {
			$EventBus: new Vue()
		}
	},
	data() {
		return {
			graphView: new XPack(),
			vpd: {
				minZoom: 0.2,
				zoomFactor: 1.0,
				prevMouse: { x: 0, y: 0 },
			},
			mmRect: { w: 0, h: 0, x: 0, y: 0 },
			matrix: [ 1, 0, 0, 1, 0, 0 ]
		}
	},
	computed: {
		matrixStr() {
			let m = this.matrix
			return `matrix( ${m[0]}, ${m[1]}, ${m[2]}, ${m[3]}, ${m[4]}, ${m[5]} )`
		}
	},
	watch: {
		graph( graphView ) {
			this.graphView = graphView
		}
	},
	methods: {
		computeMinimapViewRect() {
			this.$nextTick( () => {
				let pVp = $( this.$parent.$refs.viewport )
				, pVpSize = { w: pVp.width(), h: pVp.height() }
				, pScaleF = this.$parent.vpd.zoomFactor
				, mScaleF = this.vpd.zoomFactor
				, ss = mScaleF / pScaleF
				, pmat = this.$parent.matrix
				, mmat = this.matrix
				, panX = - pmat[ 4 ]
				, panY = - pmat[ 5 ]
				this.mmRect.w = pVpSize.w * ss
				this.mmRect.h = pVpSize.h * ss
				this.mmRect.x = panX * ss + mmat[ 4 ]
				this.mmRect.y = panY * ss + mmat[ 5 ]
			} )
		},
		init() {
			this.graphView = this.graph
			this.graphViewPath = [ { name: 'Root', node: this.graph } ]
			this.graphView.connections.forEach( pair => this.connectXPackIo( ...pair ) )
			this.$EventBus.$emit( 'node-record-prev-pos' )
			this.centerGraphInView()
			this.computeMinimapViewRect()
			this.$parent.$EventBus.$on( 'vp-zoom', () => {
				this.computeMinimapViewRect()
			} )
			this.$parent.$EventBus.$on( 'vp-pan', () => {
				this.computeMinimapViewRect()
			} )
			let movingMinimapViewRect = false
			let prevMouseMM = { x: 0, y: 0 }
			$( this.$refs.minimapViewRect ).on( 'mousedown', ev => {
				movingMinimapViewRect = true
				prevMouseMM = { x: ev.clientX, y: ev.clientY }
			} ).on( 'mouseup', ev => {
				movingMinimapViewRect = false
			} ).on( 'mousemove', ev => {
				if ( !movingMinimapViewRect ) return
				let dt = { x: ev.clientX - prevMouseMM.x, y: ev.clientY - prevMouseMM.y }
				this.panMinimap( dt.x, dt.y )
				prevMouseMM = { x: ev.clientX, y: ev.clientY }
				let pScaleF = this.$parent.vpd.zoomFactor
				, mScaleF = this.vpd.zoomFactor
				, ss = mScaleF / pScaleF
				let rectPos = { x: - this.mmRect.x / ss, y: - this.mmRect.y / ss }
				this.$parent.setViewPosition( rectPos.x, rectPos.y )
			} )
			this.$parent.$on( 'update-minimap', () => {
				this.centerGraphInView()
			} )
		},
		panMinimap( dx, dy ) {
			this.mmRect.x += dx
			this.mmRect.y += dy
		},
		getMousePositionRelative( ev ) {
			let vp = $( this.$refs.nodeGraphRoot )
			, offset = vp.offset()
			, mat = this.matrix
			return {
				x: ( ev.clientX - offset.left + vp.scrollLeft() - mat[ 4 ] ) / this.vpd.zoomFactor,
				y: ( ev.clientY - offset.top + vp.scrollTop() - mat[ 5 ] ) / this.vpd.zoomFactor
			}
		},
		setPan( x, y ) {
			this.$set( this.matrix, 4, x )
			this.$set( this.matrix, 5, y )
			this.$EventBus.$emit( 'vp-pan' )
		},
		pan( dx, dy ) {
			this.$set( this.matrix, 4, this.matrix[ 4 ] + dx )
			this.$set( this.matrix, 5, this.matrix[ 5 ] + dy )
			this.$EventBus.$emit( 'vp-pan' )
		},
		zoom( anchor, delta ) {
			let mat = this.matrix
			, dd = - Math.sign( delta ) * 0.1
			, sf = Math.max( mat[ 0 ] * ( 1.0 + dd ), this.vpd.minZoom )
			, sd = sf / mat[ 0 ]
			, xx = sd * ( mat[ 4 ] - anchor.x ) + anchor.x
			, yy = sd * ( mat[ 5 ] - anchor.y ) + anchor.y
			this.matrix = [ sf, 0, 0, sf, xx, yy ]
			this.vpd.zoomFactor = sf
			this.$EventBus.$emit( 'vp-zoom' )
		},
		setZoomFactor( sf ) {
			this.vpd.zoomFactor = sf
			this.$set( this.matrix, 0, sf )
			this.$set( this.matrix, 3, sf )
			this.$EventBus.$emit( 'vp-zoom' )
		},
		centerGraphInView() {
			this.$nextTick( () => {
				let [ minX, maxX ] = [ Infinity, - Infinity ]
				let [ minY, maxY ] = [ Infinity, - Infinity ]
				this.graphView.nodes.forEach( n => {
					minX = Math.min( minX, n.position.x )
					maxX = Math.max( maxX, n.position.x + n._dimension.w )
					minY = Math.min( minY, n.position.y )
					maxY = Math.max( maxY, n.position.y + n._dimension.h )
				} )
				let gDim = { w: maxX - minX, h: maxY - minY }
				let v = $( this.$refs.nodeGraphRoot )
				let vDim = { w: v.width(), h: v.height() }
				let scaleFactor = Math.min( 1.0, Math.min( vDim.w * 0.95 / gDim.w, vDim.h * 0.95 / gDim.h ) )
				this.setZoomFactor( scaleFactor )
				this.setPan( - minX * scaleFactor, - minY * scaleFactor )
				let cx = ( vDim.w - gDim.w * scaleFactor ) * scaleFactor
				let cy = ( vDim.h - gDim.h * scaleFactor ) * scaleFactor
				this.pan( cx, cy )
			} )
		},
	},
	created() {
		this.$EventBus = this._provided.$EventBus
	},
	mounted() {
		this.init()
	}
}
</script>

<style lang="sass">
	.viewport
		width: 100%
		height: 100%
	.nodeGraphRoot
		user-select: none
		cursor: default
		transform-style: preserve-3d
		overflow: hidden
		position: absolute
		height: 100%
		width: 100%
		background-image: linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)
		background-size: 50px 50px
		background-position: 13px 42px
	.nodeGraphContainer
		background-color: transparent
		overflow: visible
		pointer-events: none
		position: absolute
		width: 100%
		height: 100%
		transform-origin: 0px 0px
		transform: matrix( 1, 0, 0, 1, 0, 0 )
		user-select: none
	.nodeContainer, .nodeContainerSvg
		position: absolute
		height: 100%
		width: 100%
		cursor: default
		background: rgba( 0, 0, 0, 0 )
		overflow: visible
		pointer-events: none
		transform-origin: 0px 0px
		transform: matrix( 1, 0, 0, 1, 0, 0 )
	.btn
		margin-right: 10px
		float: right
		display: inline-block
		cursor: pointer
</style>
