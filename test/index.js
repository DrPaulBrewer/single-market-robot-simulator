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

describe('Log.write(undefined) to data array', function(){
    it('should leave the data array unchanged', function(){
	var L = new Log();
	L.data.length.should.equal(0);
	L.write();
	L.write(undefined);
	L.data.length.should.equal(0);
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

describe('blank Simulation not allowed', function(){
    delete global.fs;
    it('new Simulation({}) with empty config {} should throw error', function(){
	var simulation_with_omitted_options = function(){
	    var S = new Simulation({});
	};
	simulation_with_omitted_options.should.throw();
    });
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
	var props = ['config', 
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
	it('should set .config properly', function(){
	    assert.ok(S.config===config_costs_exceed_values);
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
	it('.logs should have properties trade, order, profit, ohlc, volume -- all instances of Log', function(){
	    var props = ['trade','order','profit','ohlc','volume'];
	    S.logs.should.have.properties(props);
	    props.forEach(function(prop){ S.logs[prop].should.be.an.instanceOf(Log); });
	});
	it('trade, order, ohlc, volume logs have header rows; profit log is empty', function(){
	    var withHeaderRow = ['trade','order','ohlc','volume'];
	    withHeaderRow.forEach(function(prop){ S.logs[prop].data.length.should.equal(1); });
	    S.logs.profit.data.length.should.equal(0);
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
	it('.periodDuration should be 1000 (default)', function(){
	    S.periodDuration.should.equal(1000);
	});
    });

    var tests_for_config_costs_exceed_values = function(state){
	it('should increment .period', function(){
	    state.S.period.should.equal(1);
	});
	it('should have property xMarket -- an instance of Market', function(){
	    state.S.should.have.property('xMarket');
	    /* unlike above test with .pool where Pool was in scope, Market is not in scope here. wonder why? */
	    state.S.xMarket.should.be.instanceOf(MEC.Market);
	});
	it('should set ziAgent.prototype.bid and ziAgent.prototype.ask', function(){
	    assert.ok(typeof(ziAgent.prototype.bid)==='function');
	    assert.ok(typeof(ziAgent.prototype.ask)==='function');
	    /* these functions should throw if not supplied proper parameters */
	    ziAgent.prototype.bid.should.throw();
	    ziAgent.prototype.ask.should.throw();
	});	
	it('the order log should have between ~4650 and ~5350 orders (5 sigma, poisson 5*1000)', function(){
	    state.S.logs.order.data.length.should.be.within(4650,5350);
	});
	it('the trade log should have one entry, the header row', function(){
	    state.S.logs.trade.data.length.should.be.equal(1);
	    state.S.logs.trade.data[0].should.deepEqual(tradeLogHeader);		
	}); 
	it('the profit log should have one entry equal to [0,0,0,0,0]', function(){
	    state.S.logs.profit.data.length.should.be.equal(1);
	    state.S.logs.profit.data.should.deepEqual([[0,0,0,0,0]]);
	}); 
	it('the ohlc log should have header row', function(){
	    state.S.logs.ohlc.data.length.should.equal(1);
	});
	it('the volume log should header row and one entry equal to [1,0]', function(){
	    state.S.logs.volume.data.length.should.equal(2);
	    state.S.logs.volume.data.should.deepEqual([['period','volume'],[1,0]]);
	});
	it('.logTrade({totalQ:2}) should throw because of single unit trade requirement', function(){
	    var logTwoUnitTrade = function(){ state.S.logTrade({totalQ:2}); };
	    logTwoUnitTrade.should.throw();
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
	describe('because async runPeriod ', function(){
	    it('immediate inspection of order log should only have length 1 from header row', function(done){
		var mySim = new Simulation(config_costs_exceed_values);
		var callback = function(e,S){
		    done();
		};
		mySim.runPeriod(callback);
		mySim.logs.order.data.length.should.equal(1);
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

describe('simulation with single unit trade, value [1000], costs [1]', function(){
    var config_single_unit_trade = {
	L:1,
	H:1000,
	buyerValues: [1000],
	sellerCosts: [1],
	silent: 1
    };

    describe('on new Simulation', function(){
	var S = new Simulation(config_single_unit_trade);
	var props = ['config', 
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
	it('should set .config properly', function(){
	    assert.ok(S.config===config_single_unit_trade);
	});
	it('should set .numberOfBuyers to 3', function(){
	    S.numberOfBuyers.should.equal(1);
	});
	it('should set .numberOfSellers to 2', function(){
	    S.numberOfSellers.should.equal(1);
	});
	it('should set .numberOfAgents to 5', function(){
	    S.numberOfAgents.should.equal(2);
	});
	it('.logs should have properties trade, order, profit, ohlc, volume -- all instances of Log', function(){
	    var props = ['trade','order','profit','ohlc','volume'];
	    S.logs.should.have.properties(props);
	    props.forEach(function(prop){ S.logs[prop].should.be.an.instanceOf(Log); });
	});
	it('.pool should be an instance of Pool containing 2 (ZI) agents with .bidPrice and .askPrice functions',function(){
	    /* why are Pool, ziAgent, etc. in scope here? Is this a feature of should? */
	    S.pool.should.be.an.instanceOf(Pool);
	    S.pool.agents.length.should.equal(2);
	    S.pool.agents.forEach(function(A){ 
		A.should.be.an.instanceOf(ziAgent).and.have.properties('bidPrice','askPrice'); 
	    });
	});
	it('.buyersPool should be an instance of Pool containing 1 agents', function(){
	    S.buyersPool.should.be.an.instanceOf(Pool);
	    S.buyersPool.agents.length.should.equal(1);
	});
	it('.sellersPool should be an instance of Pool containing 1 agents', function(){
	    S.sellersPool.should.be.an.instanceOf(Pool);
	    S.sellersPool.agents.length.should.equal(1);
	});
	it('.period should be zero', function(){
	    S.period.should.equal(0);
	});
	it('.periodDuration should be 1000 (default)', function(){
	    S.periodDuration.should.equal(1000);
	});
    });

    var tests_for_config_single_unit_trade = function(state){
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
	it('the order log should have at most ~2225 orders (5 sigma, poisson 2000, but will exhaust sooner by trade)', function(){
	    state.S.logs.order.data.length.should.be.below(2225);
	});
	it('the trade log should have two entrys, the header row plus a trade', function(){
	    state.S.logs.trade.data.length.should.equal(2);
	    state.S.logs.trade.data[0].should.deepEqual(tradeLogHeader);
	    state.S.logs.trade.data[1].should.not.deepEqual(tradeLogHeader);
	    state.S.logs.trade.data[1].length.should.equal(state.S.logs.trade.data[0].length);
	}); 
	it('the tradelog should report period 1', function(){
	    state.S.logs.trade.data[1][0].should.equal(1);
	});
	it('the tradelog should report a trade price between 1 and 1000', function(){
	    state.S.logs.trade.data[1][2].should.be.within(1,1000);
	});
	it('the tradelog should report the correct buyerAgentId', function(){
	    var buyerId = state.S.buyersPool.agents[0].id;
	    var tradeLogBuyerId = state.S.logs.trade.data[1][3];
	    assert.ok(tradeLogBuyerId===buyerId);
	});
	it('the tradelog should report the correct buyerValue', function(){
	    state.S.logs.trade.data[1][4].should.equal(1000);
	});
	it('the tradelog should report the correct buyerProfit', function(){
	    state.S.logs.trade.data[1][5].should.equal(1000-state.S.logs.trade.data[1][2]);
	});
	it('the tradelog should report the correct sellerAgentId', function(){
	    var sellerId = state.S.sellersPool.agents[0].id;
	    var tradeLogSellerId = state.S.logs.trade.data[1][6];
	    assert.ok(tradeLogSellerId===sellerId);
	});
	it('the tradelog should report the correct seller cost', function(){
	    state.S.logs.trade.data[1][7].should.equal(1);
	});
	it('the tradelog should report the correct seller profit', function(){
	    state.S.logs.trade.data[1][8].should.equal(state.S.logs.trade.data[1][2]-1);
	});
	it('the profit log should have one entry equal to [1000-p,p-1]', function(){
	    var p = state.S.logs.trade.data[1][2];
	    var correctProfits = [1000-p,p-1];
	    state.S.logs.profit.data.length.should.be.equal(1);
	    state.S.logs.profit.data.should.deepEqual([correctProfits]);
	}); 
	it('the ohlc log should have header plus one entry, with all 4 o,h,l,c elements equal to the trade price', function(){
	    var p = state.S.logs.trade.data[1][2];
	    var correctOHLC = [state.S.period,p,p,p,p];
	    state.S.logs.ohlc.data.length.should.equal(2);
	    state.S.logs.ohlc.data[1].should.deepEqual(correctOHLC);
	});
	it('the volume log should have header plus one entry, [1,1]', function(){
	    state.S.logs.volume.data.length.should.equal(2);
	    state.S.logs.volume.data[1].should.deepEqual([1,1]);
	});
    };

    describe('runPeriod()', function(){
	/* runPeriod() is synchronous */
	var mySim = new Simulation(config_single_unit_trade);
	var sim = mySim.runPeriod();
	it('should modify in place and return the original simulation object', function(){
	    assert.ok(mySim===sim);
	});
	tests_for_config_single_unit_trade({S:mySim});
    });
    describe('runPeriod(function(e,sim){...}) runs asynchronously', function(done){
	describe('because async ', function(){
	    it('order log should have length 1 (header)', function(done){
		var mySim = new Simulation(config_single_unit_trade);
		var callback = function(e,S){
		    done();
		};
		mySim.runPeriod(callback);
		mySim.logs.order.data.length.should.equal(1);
	    });
	});
	describe('when done should pass same tests as runPeriod()', function(){
	    var state = {};
	    beforeEach(function(done){
		var mySim = new Simulation(config_single_unit_trade);
		var callback = function(e,S){
		    state.S = S;
		    done();
		};
		mySim.runPeriod(callback);
	    });
	    tests_for_config_single_unit_trade(state);
	});
    });
    var tests_for_runSimulation_single_trade_ten_periods = function(state){
	it('.period should be 10', function(){
	    state.S.period.should.equal(10);
	});
	it('should have property xMarket -- an instance of Market', function(){
	    state.S.should.have.property('xMarket');
	    state.S.xMarket.should.be.instanceOf(MEC.Market);
	});
	it('the order log should have between 20 orders and 2000 orders', function(){
	    /* 20 because we need 20 orders for 10 trades, 2000 tops is ad hoc but unlikely to be exceeded */ 
	    state.S.logs.order.data.length.should.be.within(20,2000);
	});
	it('the trade log should have 11 entries, the header row plus 10 trades, exactly 1 trade per period', function(){
	    state.S.logs.trade.data.length.should.equal(11);
	    state.S.logs.trade.data[0].should.deepEqual(tradeLogHeader);
	    state.S.logs.trade.data.forEach(function(row,i){ if(i>0) row[0].should.equal(i); });
	}); 
	it('the period profit log should have 10 entries, each with two positive numbers that sum to 999', function(){
	    state.S.logs.profit.data.forEach(function(row){
		row[0].should.be.above(0);
		row[1].should.be.above(0);
		assert.equal(row[0]+row[1],999);
	    });
	});
	it('the ohlc log should have 11 entries, header + 1 trade per period, matching trade log', function(){
	    var priceCol = tradeLogHeader.indexOf('price'),periodCol = tradeLogHeader.indexOf('period');
	    /* use .slice(1) to copy trade log with header row omitted */
	    var altOHLC = state.S.logs.trade.data.slice(1).map(
		function(row,i){ 
		    var period = row[periodCol];
		    var price  = row[priceCol];
		    /* o,h,l,c equal because it is a single unit trade scenario */
		    return [period,price,price,price,price];
		});
	    state.S.logs.ohlc.data.length.should.equal(11);
	    state.S.logs.ohlc.data.slice(1).should.deepEqual(altOHLC);		
	});
	it('the volume log should have 11 entries, header + 1 per period, showing 1 unit traded', function(){
	    state.S.logs.volume.data.length.should.equal(11);
	    state.S.logs.volume.data.slice(1).should.deepEqual([[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1]]);
	});
    };

    describe('runSimulation with 10 periods of single unit trade scenario, synchronous', function(){
	var config = Object.assign({}, config_single_unit_trade, {periods:10});
	var S = runSimulation(config);
	tests_for_runSimulation_single_trade_ten_periods({S:S});
    }); 

    describe('runSimulation with 10 periods of single unit trade scenario, asyncrhonous', function(){
	var config = Object.assign({}, config_single_unit_trade, {periods:10});
	describe(' -- because runSimulation(config,callback) returns immediately, order log should be header only', function(){
	    it('order log should have length 1', function(done){
		var callback = function(e,sim){
		    done();
		};
		var S = runSimulation(config, callback);
		S.logs.order.data.length.should.equal(1);
	    });
	});
	describe('when done should pass same tests as above ', function(){
	    var state = {};
	    beforeEach(function(done){
		var callback = function(e,S){
		    state.S = S;
		    done();
		};
		var mySim = runSimulation(config,callback);
	    });
	    tests_for_runSimulation_single_trade_ten_periods(state);
	});
    });

    describe('runSimulation with three simulations of 10 periods of single unit trade scenario, asynchronous', function(){
	var configA = Object.assign({}, config_single_unit_trade, {periods:10});
	var configB = Object.assign({}, config_single_unit_trade, {periods:10});
	var configC = Object.assign({}, config_single_unit_trade, {periods:10});
	describe('when done should pass same tests as above ', function(){
	    var states=[{},{},{}];
	    /* run the setup once before all the tests, not before each test */
	    before(function(done){
		var count = 0;
		var callback = function(e,S){
		    states[count].S = S;
		    count++;
		    if (count===3){
			done();
		    }
		};
		runSimulation(configA, callback);
		runSimulation(configB, callback);
		runSimulation(configC, callback);
	    });
	    tests_for_runSimulation_single_trade_ten_periods(states[0]);
	    tests_for_runSimulation_single_trade_ten_periods(states[1]);
	    tests_for_runSimulation_single_trade_ten_periods(states[2]);
	});
    });
});

    
