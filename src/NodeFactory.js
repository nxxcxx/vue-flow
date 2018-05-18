import uuid from 'uuid'

class Connection {
	constructor( name, parent ) {
		this.uuid = uuid()
		this.name = name
		this.parent = parent
		this.free = true
		this.position = { x: 0, y: 0 }
	}
}

class Input extends Connection {
	constructor( name, parent ) {
		super( name, parent )
		this.output = null
		this.proxyOutput = null
		this.type = 1
	}
	connect( output ) {
		if ( !( output instanceof Output ) ) throw new Error( 'invalid connection' )
		this.output = output
		if ( output.input.indexOf( this ) < 0 )
			output.input.push( this )
		this.updatePortAvailability()
		output.updatePortAvailability()
	}
	connectProxy( output ) {
		if ( !( output instanceof Output ) ) throw new Error( 'invalid connection' )
		this.proxyOutput = output
		if ( output.proxyInput.indexOf( this ) < 0 )
			output.proxyInput.push( this )
		this.updatePortAvailability()
		output.updatePortAvailability()
	}
	updatePortAvailability() {
		if ( this.proxyOutput === null && this.output === null ) this.free = true
		else this.free = false
	}
	disconnect() {
		if ( this.output ) {
			this.output.disconnectInput( this )
			this.output.updatePortAvailability()
		}
		this.output = null
		this.updatePortAvailability()
	}
	disconnectProxy() {
		if ( this.proxyOutput ) {
			this.proxyOutput.disconnectProxyInput( this )
			this.proxyOutput.updatePortAvailability()
		}
		this.proxyOutput = null
		this.updatePortAvailability()
	}
	retrieveData() {
		return this.output === null ? null : this.output.data
	}
}

class Output extends Connection {
	constructor( name, parent ) {
		super( name, parent )
		this.data = null
		this.input = []
		this.proxyInput = []
		this.type = 0
	}
	flush() {
		this.data = null
	}
	updatePortAvailability() {
		if ( this.proxyInput.length === 0 && this.input.length === 0 ) this.free = true
		else this.free = false
	}
	disconnectInput( input ) {
		this.input = this.input.filter( inp => inp !== input )
		this.updatePortAvailability()
	}
	disconnectProxyInput( input ) {
		this.proxyInput = this.proxyInput.filter( inp => inp !== input )
		this.updatePortAvailability()
	}
}

class Executable {
	constructor() {
		this._fnstr = ''
		this._parseTask = null
		this._initialized = false
		this.scope = {
			init: () => {},
			process: () => {},
			flush: () => {}
		}
	}
	_init( inputObj, injectObj ) {
		if ( this._initialized ) return
		this.scope.init.call( this.scope, inputObj, injectObj )
		this._initialized = true
	}
	parse() {
		try {
			this.scope = {
				init: () => {},
				process: () => {},
				flush: () => {}
			}
			this._parseTask = new Function( this._fnstr )
			this._parseTask.call( this.scope )
			this._initialized = false
		} catch ( ex ) {
			console.warn( ex, this.name, this.uuid )
		}
	}
	execute( injectObj = {} ) {
		let res = null
		let inpObj = {}
		this.input.forEach( inp => { inpObj[ inp.name ] = inp.retrieveData() } )
		try {
			this._init( inpObj, injectObj )
			res = this.scope.process.call( this.scope, inpObj, injectObj )
		} catch ( ex ) {
			console.warn( ex, this.name, this.uuid )
		}
		if ( res ) this.output.forEach( io => { io.data = res[ io.name ] } )
	}
}

class Node extends Executable {
	constructor( name, type = '' ) {
		super()
		this.uuid = uuid()
		this.name = name
		this.parent = null
		this.nodes = []
		this.connections = []
		this.input = []
		this.output = []
		this.order = -1
		this.position = { x: 0, y: 0 }
		this.type = type
		this._selecting = false
		this._dimension = { w: 0, h: 0 }
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
	addInput( name ) {
		let inp = new Input( name, this )
		this.input.push( inp )
		return inp
	}
	addOutput( name ) {
		let opt = new Output( name, this )
		console.log( opt )
		this.output.push( opt )
		return opt
	}
	flushOutput() {
		this.scope.flush.call( this.scope )
		this.output.forEach( output => output.flush() )
	}
	deleteIO( io ) {
		this.input = this.input.filter( inp => inp !== io )
		this.output = this.output.filter( opt => opt !== io )
	}
}

export default { Node, Input, Output }
