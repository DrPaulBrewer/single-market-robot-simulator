/* jshint esnext:true */

const assert = require('assert');
const should = require('should');
const singleMarketRobotSimulator = require("../index.js");
const Log = singleMarketRobotSimulator.Log;
const Simulation = singleMarketRobotSimulator.Simulation;
const runSimulation = singleMarketRobotSimulator.runSimulation;

function fakeFS(fsinfo){
    global.fs = {
	openSync: function(fname){
	    fsinfo.call = 'openSync';
	    fsinfo.params = [fname];
	    return 37363; // fake fd return
	},
	writeSync: function(fd, data){
	    fsinfo.call = 'writeSync';
	    fsinfo.params = [fd,  data];
	}
    };
}

describe('new Log() to data array', function(){
    it('should have an empty data array', function(){	
	var L = new Log();
	L.should.have.property('data');
	assert.ok(Array.isArray(L.data));
	L.data.length.should.equal(0);
    });
    it('should have .useFS false', function(){
	var L = new Log();
	assert.ok(!L.useFS);
    });
    it('should have .fd undefined', function(){
	var L = new Log();
	assert.ok(typeof(L.fd)==='undefined');
    });
});

describe('Log.write([1,2,3,4,5]) to data array ', function(){
    it('should add the array [1,2,3,4,5] to the data array', function(){
	var L = new Log();
	L.data.length.should.equal(0);
	L.write([1,2,3,4,5]);
	L.data.length.should.equal(1);
	L.data.should.deepEqual([[1,2,3,4,5]]);
    });
});

describe('Log.write(23) to data array', function(){
    it('should add the number 23 to the data array', function(){
	var L = new Log();
	L.data.length.should.equal(0);
	L.write(23);
	L.data.length.should.equal(1);
	L.data.should.deepEqual([23]);
    });
});

describe('Log.write({a:23}) to data array', function(){
    it('should add the object {a:23} to the data array', function(){
	var L = new Log();
	L.data.length.should.equal(0);
	L.write({a:23});
	L.data.length.should.equal(1);
	L.data.should.deepEqual([{a:23}]);
    });
});

describe('new Log(filename) to fake fs', function(){
    it('should call openSync and not have a data array', function(){
	var fsinfo = {};
	fakeFS(fsinfo);
	var L = new Log('fakedata');
	L.should.not.have.property('data');
	fsinfo.call.should.equal('openSync');
	fsinfo.params.should.deepEqual(['fakedata']);
	delete global.fs;
    });
    it('should have .useFS true', function(){
	var fsinfo = {};
	fakeFS(fsinfo);
	var L = new Log('fakedata');
	assert.ok(L.useFS);
	delete global.fs;
    });
    it('should have expected .fd', function(){
	fsinfo = {};
	fakeFS(fsinfo);
	var L = new Log('fakedata');
	assert.ok(L.fd===37363);
	delete global.fs;
    });
});

describe('Log.write([1,2,3,4,5]) to fake fs', function(){
    it('should write "1,2,3,4,5" newline ', function(){
	var fsinfo = {};
	fakeFS(fsinfo);
	var L = new Log('fakedata');
	L.write([1,2,3,4,5]);
	fsinfo.call.should.equal('writeSync');
	fsinfo.params.should.deepEqual([37363, "1,2,3,4,5\n"]);
	delete global.fs;
    });
});

describe('Log.write(23) to fake fs ', function(){
    it('should write "23" newline', function(){
	var fsinfo = {};
	fakeFS(fsinfo);
	var L = new Log('fakedata');
	L.write(23);
	fsinfo.call.should.equal("writeSync");
	fsinfo.params.should.deepEqual([37363, "23\n"]);
	delete global.fs;
    });
});

describe('Log.write({a:23}) to fake fs ', function(){
    it('should write JSON string {"a":23} newline', function(){
	var fsinfo = {};
	fakeFS(fsinfo);
	var L = new Log('fakedata');
	L.write({a:23});
	fsinfo.call.should.equal("writeSync");
	fsinfo.params.should.deepEqual([37363, '{"a":23}\n']);
	delete global.fs;
    });
});

describe('Simulation', function(){
    it('new Simulation({}) with empty options {} should throw error', function(){
	var simulation_with_omitted_options = function(){
	    var S = new Simulation({});
	};
	simulation_with_omitted_options.should.throw();
    });


});




