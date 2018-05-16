import uuid from 'uuid'
import nodeFactory from './NodeFactory.js'

class RouterNode extends nodeFactory.Node {
	constructor( name ) {
		super( name )
	}
}

class XPack extends nodeFactory.Node {
	constructor( nodes = [], parent = null ) {
		super( 'XPack' )
		this.parent = parent
		this.nodes = []
		this.connections = []
		this.uStreamRouter = new RouterNode( 'INPUTS' )
		this.dStreamRouter = new RouterNode( 'OUTPUTS')
		this.uStreamRouter.xpack = this
		this.dStreamRouter.xpack = this
		this.routers = [ this.uStreamRouter, this.dStreamRouter ]
		this.addNodes( [ ...this.routers, ...nodes ] )
	}
	addNodes( nodes ) {
		nodes.forEach( n => {
			n.parent = this
			this.nodes.push( n )
		} )
	}
	removeNodes( nodes ) {
		this.nodes = this.nodes.filter( n => nodes.indexOf( n ) < 0 )
	}
	addConnections( connections ) {
		connections.forEach( c => {
			this.connections.push( c )
		} )
	}
}

export { RouterNode, XPack }
