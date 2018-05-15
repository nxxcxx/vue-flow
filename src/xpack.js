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
		this.uStreamRouter = new RouterNode( 'U-STREAM' )
		this.uStreamRouter.xpack = this
		this.dStreamRouter = new RouterNode( 'D-STREAM')
		this.routers = [ this.uStreamRouter, this.dStreamRouter ]
		this.dStreamRouter.xpack = this
		this.nodes = [ ...this.routers, ...nodes ]
		this.connections = []
	}
}

export { RouterNode, XPack }
