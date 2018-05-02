<template>
	<path
		:d="getBezierCurveString()"
		stroke="#e6e6e6"
		stroke-width="1.5"
		fill="rgba(0,0,0,0)"
	/>
</template>

<script>
export default {
	name: 'NodeConnection',
	props: [ 'conn', 'x1', 'y1', 'x2', 'y2' ],
	methods: {
		getBezierCurveString() {
			let [ x1, y1, x2, y2 ] = [ this.x1, this.y1, this.x2, this.y2 ]
			, hf = Math.abs( x1 - x2 ) * 0.5
			, [ cx1, cx2 ] = [ x1 + hf, x2 - hf ]
			return `M${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
		}
	}
}
</script>

<style lang="sass">

</style>
