import uuid from 'uuid'
import nodeFactory from './NodeFactory.js'

class RouterNode extends nodeFactory.Node {
	constructor( name ) {
		super( name )
	}
}

class XPack extends nodeFactory.Node {
	constructor() {
		super( 'XPack' )
		this.uStreamRouter = new RouterNode( 'UP STREAM' )
		this.dStreamRouter = new RouterNode( 'DOWN STREAM')
		this.nodes = []
	}
}

export { RouterNode, XPack }
