/* jshint esnext:true */

const assert = require('assert');
const should = require('should');
const singleMarketRobotSimulator = require("../index.js");
const Log = singleMarketRobotSimulator.Log;
const Simulation = singleMarketRobotSimulator.Simulation;
const runSimulation = singleMarketRobotSimulator.runSimulation;
const MEC = require('market-example-contingent');

var tradeLogHeader = ['period',
		      't',
		      'price',
		      'buyerAgentId',
		      'buyerValue',
		      'buyerProfit',
		      'sellerAgentId',
		      'sellerCost',
		      'sellerProfit'];

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
    delete global.fs;
    it('new Simulation({}) with empty options {} should throw error', function(){
	var simulation_with_omitted_options = function(){
	    var S = new Simulation({});
	};
	simulation_with_omitted_options.should.throw();
    });

    describe('simulation with values [10,9,8] all below costs [20,40]', function(){
	var config_costs_exceed_values = {
	    L:1,
	    H:100,
	    buyerValues: [10,9,8],
	    sellerCosts: [20,40],
	    silent: 1
	};
	describe('on new Simulation', function(){
	    var S = new Simulation(config_costs_exceed_values);
	    var props = ['options', 
			 'numberOfBuyers',
			 'numberOfSellers',
			 'numberOfAgents',
			 'logs',
			 'pool',
			 'buyersPool',
			 'sellersPool',
			 'period',
			 'periodDuration'
			];
	    it('should have properties '+props.join(","), function(){
		S.should.have.properties(props);
	    });
	    it('should set .options properly', function(){
		assert.ok(S.options===config_costs_exceed_values);
	    });
	    it('should set .numberOfBuyers to 3', function(){
		S.numberOfBuyers.should.equal(3);
	    });
	    it('should set .numberOfSellers to 2', function(){
		S.numberOfSellers.should.equal(2);
	    });
	    it('should set .numberOfAgents to 5', function(){
		S.numberOfAgents.should.equal(5);
	    });
	    it('.logs should have properties trade, order, period -- all instances of Log', function(){
		S.logs.should.have.properties('trade','order','period');
		S.logs.trade.should.be.an.instanceOf(Log);
		S.logs.order.should.be.an.instanceOf(Log);
		S.logs.period.should.be.an.instanceOf(Log);
	    });
	    it('.pool should be an instance of Pool containing 5 (ZI) agents with .bidPrice and .askPrice functions',function(){
		/* why are Pool, ziAgent, etc. in scope here? Is this a feature of should? */
		S.pool.should.be.an.instanceOf(Pool);
		S.pool.agents.length.should.equal(5);
		S.pool.agents.forEach(function(A){ 
		    A.should.be.an.instanceOf(ziAgent).and.have.properties('bidPrice','askPrice'); 
		});
	    });
	    it('.buyersPool should be an instance of Pool containing 3 agents', function(){
		S.buyersPool.should.be.an.instanceOf(Pool);
		S.buyersPool.agents.length.should.equal(3);
	    });
	    it('.sellersPool should be an instance of Pool containing 2 agents', function(){
		S.sellersPool.should.be.an.instanceOf(Pool);
		S.sellersPool.agents.length.should.equal(2);
	    });
	    it('.period should be zero', function(){
		S.period.should.equal(0);
	    });
	    it('.periodDuration should be 600 (default, 10 min = 600 sec virtual duration)', function(){
		S.periodDuration.should.equal(600);
	    });
	});

	var tests_for_config_costs_exceed_values = function(state){
	    it('should increment .period', function(){
		state.S.period.should.equal(1);
	    });
	    it('should have property xMarket -- an instance of Market', function(){
		state.S.should.have.property('xMarket');
		/* unlike above test with .pool where Pool was in scope, Market is not in scope here. */
		state.S.xMarket.should.be.instanceOf(MEC.Market);
	    });
	    it('should set ziAgent.prototype.bid and ziAgent.prototype.ask', function(){
		assert.ok(typeof(ziAgent.prototype.bid)==='function');
		assert.ok(typeof(ziAgent.prototype.ask)==='function');
	    });
	    it('the order log should have between 2700 and 3300 orders (5 sigma, poisson 5*600)', function(){
		state.S.logs.order.data.length.should.be.within(2700,3300);
	    });
	    it('the trade log should have one entry, the header row', function(){
		state.S.logs.trade.data.length.should.be.equal(1);
		state.S.logs.trade.data[0].should.deepEqual(tradeLogHeader);		
	    }); 
	    it('the period log should have one entry equal to [0,0,0,0,0]', function(){
		state.S.logs.period.data.length.should.be.equal(1);
		state.S.logs.period.data.should.deepEqual([[0,0,0,0,0]]);
	    }); 
	};

	describe('runPeriod()', function(){
	    /* runPeriod() is synchronous */
	    var mySim = new Simulation(config_costs_exceed_values);
	    var sim = mySim.runPeriod();
	    it('should modify in place and return the original simulation object', function(){
		assert.ok(mySim===sim);
	    });
	    tests_for_config_costs_exceed_values({S:mySim});
	});
	describe('runPeriod(function(e,sim){...}) runs asynchronously', function(done){
	    describe('because async runPeriod returns immediately, order log should be empty', function(){
		it('order log should have length 0', function(done){
		    var mySim = new Simulation(config_costs_exceed_values);
		    var callback = function(e,S){
			done();
		    };
		    mySim.runPeriod(callback);
		    mySim.logs.order.data.length.should.equal(0);
		});
	    });
	    describe('when done should pass same tests as runPeriod()', function(){
		var state = {};
		beforeEach(function(done){
		    mySim = new Simulation(config_costs_exceed_values);
		    var callback = function(e,S){
			state.S = S;
			done();
		    };
		    mySim.runPeriod(callback);
		});
		tests_for_config_costs_exceed_values(state);
	    });
	});	    
    });
});




