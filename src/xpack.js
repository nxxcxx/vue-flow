import uuid from 'uuid'
import nodeFactory from './NodeFactory.js'

class RouterNode extends nodeFactory.Node {
	constructor( name ) {
		super( name )
	}
}

class XPack extends nodeFactory.Node {
	constructor( nodes = [], parent = null ) {
		super()
		this.name = `XPack-${this.uuid.slice( 0, 4 ).toUpperCase()}`
		this.parent = parent
		this.uStreamRouter = new RouterNode( 'VIA' )
		this.dStreamRouter = new RouterNode( 'VIA')
		this.uStreamRouter.xpack = this
		this.dStreamRouter.xpack = this
		this.uStreamRouter.parent = this
		this.dStreamRouter.parent = this
		this.routers = [ this.uStreamRouter, this.dStreamRouter ]
		this.addNodes( [ ...this.routers, ...nodes ] )
	}
}

export { RouterNode, XPack }
