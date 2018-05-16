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
		if ( !( output instanceof Output ) ) return
		this.output = output
		this.free = false
		if ( output.input.indexOf( this ) < 0 )
			output.input.push( this )
		output.free = false
	}
	connectProxy( output ) {
		if ( !( output instanceof Output ) ) return
		this.proxyOutput = output
		this.free = false
		if ( output.proxyInput.indexOf( this ) < 0 )
			output.proxyInput.push( this )
		output.free = false
	}
	disconnect() {
		if ( this.output ) {
			let i = this.output.input.indexOf( this )
			if ( i > -1 ) this.output.input.splice( i, 1 )
			if ( this.output.input.length === 0 ) this.output.free = true
		}
		this.output = null
		this.free = true
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
		this.input = []
		this.output = []
		this.order = -1
		this.position = { x: 0, y: 0 }
		this.type = type
		this.parent = null
		this._selecting = false
		this._dimension = { w: 0, h: 0 }
	}
	addInput() {
		for ( let arg of arguments ) {
			this.input.push( new Input( arg, this ) )
		}
	}
	addOutput() {
		for ( let arg of arguments ) {
			this.output.push( new Output( arg, this ) )
		}
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
