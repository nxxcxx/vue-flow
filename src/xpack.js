import uuid from 'uuid'
import nodeFactory from './NodeFactory.js'

class RouterNode extends nodeFactory.Node {
	constructor( name ) {
		super( name )
	}
}

class XPack extends nodeFactory.Node {
	constructor( nodes = [] ) {
		super( 'XPack' )
		this.uStreamRouter = new RouterNode( 'UP STREAM' )
		this.uStreamRouter.xpack = this
		this.dStreamRouter = new RouterNode( 'DOWN STREAM')
		this.dStreamRouter.xpack = this
		this.nodes = nodes
		this.connections = []
	}
}

export { RouterNode, XPack }
