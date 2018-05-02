import nodeFactory from './NodeFactory.js'

function importGraphConfiguration() {
	let graph = require( './test_node_graph_01.json' )
	let nodes = []
	let connections = []
	let uuid_io_map = {}
	for ( let node of graph.nodes ) {
		let nm = new nodeFactory.Node( node.name )
		nm._fnstr = node._fnstr
		nm.position = node.position
		// off set to center
		nm.position.x += 2000
		nm.position.y += 2000
		for ( let input of node.input ) {
			let io = new nodeFactory.Input( input.name, nm )
			io.uuid = input.uuid
			uuid_io_map[ input.uuid ] = io
			nm.input.push( io )
		}
		for ( let output of node.output ) {
			let io = new nodeFactory.Output( output.name, nm )
			io.uuid = output.uuid
			uuid_io_map[ output.uuid ] = io
			nm.output.push( io )
		}
		nodes.push( nm )
	}
	for ( let conn of graph.connections ) {
		let output = uuid_io_map[ conn.output ]
		let input = uuid_io_map[ conn.input ]
		connections.push( [ output, input ] )
	}
	return { nodes, connections }
}

export default importGraphConfiguration