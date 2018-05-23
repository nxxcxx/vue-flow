import uuid from 'uuid'

class Connection {
	constructor( name, parent ) {
		this.uuid = uuid()
		this.name = name
		this.parent = parent
		this.free = true
		this.position = { x: 0, y: 0 }
		this.data = null
	}
	flush() {
		this.data = null
	}
}

class Input extends Connection {
	constructor( name, parent ) {
		super( name, parent )
		this.output = null
		this.proxyOutput = null
		this.type = 1
		this.data = null
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
	fetchData() {
		this.data = this.output === null ? null : this.output.data
	}
}

class Output extends Connection {
	constructor( name, parent ) {
		super( name, parent )
		this.input = []
		this.proxyInput = []
		this.type = 0
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
		this._receivedAllOputput = true
		this._resetScope()
	}
	_init( inputObj, injectObj ) {
		if ( this._initialized ) return
		this.scope.init.call( this.scope, inputObj, injectObj )
		this._initialized = true
	}
	_resetScope() {
		this.scope = {
			init: () => {},
			process: () => {},
			flush: () => {}
		}
	}
	parse() {
		try {
			this.flush()
			this._resetScope()
			this._parseTask = new Function( this._fnstr )
			this._parseTask.call( this.scope )
			this._initialized = false
		} catch ( ex ) {
			console.warn( ex, this.name, this.uuid )
		}
	}
	execute( injectObj = {} ) {
		let inpObj = {}
		this._receivedAllOputput = true
		this.input.forEach( inp => {
			inp.fetchData()
			if ( inp.data ) inpObj[ inp.name ] = inp.data
			else this._receivedAllOputput = false
		} )
		if ( !this._receivedAllOputput ) {
			return
		}
		this.input.forEach( inp => inp.flush() )
		let processedOutput = null
		try {
			this._init( inpObj, injectObj )
			processedOutput = this.scope.process.call( this.scope, inpObj, injectObj )
		} catch ( ex ) {
			console.warn( ex, this.name, this.uuid )
		}
		if ( processedOutput ) this.output.forEach( output => { output.data = processedOutput[ output.name ] } )
	}
	flush() {
		this.scope.flush.call( this.scope )
		this.input.forEach( inp => inp.flush() )
		this.output.forEach( output => output.flush() )
	}
}

class Node extends Executable {
	constructor( name ) {
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
		this.output.push( opt )
		return opt
	}
	deleteIO( io ) {
		this.input = this.input.filter( inp => inp !== io )
		this.output = this.output.filter( opt => opt !== io )
	}
}

export default { Node, Input, Output }
