/* eslint-env node, mocha */

/* eslint no-console: "off", newline-per-chained-call: "off" */

import assert from 'assert';
import 'should';
import * as singleMarketRobotSimulator from '../src/index.js';
import * as MEC from 'market-example-contingent';
import * as MarketAgents from 'market-agents';

const {Simulation} = singleMarketRobotSimulator;
const {Pool, ZIAgent} = MarketAgents;

const tradeLogHeader = [
    'period',
    't',
    'tp',
    'price',
    'buyerAgentId',
    'buyerValue',
    'buyerProfit',
    'sellerAgentId',
    'sellerCost',
    'sellerProfit'
];

const combinedOrderLogHeader = [
    'period',
    't',
    'tp',
    'id',
    'x',
    'buyLimitPrice',
    'value',
    'sellLimitPrice',
    'cost'
];

describe('logNames ', function(){
    it('should be defined', function(){
        singleMarketRobotSimulator.logNames.length.should.be.above(0);
    });
    it('should contain at least every key of logHeaders', function(){
        Object.keys(singleMarketRobotSimulator.logHeaders).forEach((k)=>(assert.ok(singleMarketRobotSimulator.logNames.includes(k))));
    });
});

describe('logHeaders ', function(){
    it('should be defined', function(){
        Object.keys(singleMarketRobotSimulator.logHeaders).length.should.be.above(0);
    });
});

describe('trade log header ', function(){
    it('should contain expected fields', function(){
        singleMarketRobotSimulator.logHeaders.trade.should.deepEqual(tradeLogHeader);
    });
});

describe('order log headers ',  function(){
    it('should contain expected fields', function(){
        (singleMarketRobotSimulator
         .logNames
         .filter((n)=>(n.includes("order")))
         .map((n)=>(singleMarketRobotSimulator.logHeaders[n]))
         .forEach((h)=>(h.should.deepEqual(combinedOrderLogHeader)))
        );
    });
});

describe('blank Simulation not allowed', function(){
    
    delete global.fs;
    it('new Simulation({}) with empty config {} should throw error', function(){
        function simulationWithOmittedOptions(){
            let S = new Simulation({});  // eslint-disable-line no-unused-vars
        }
        simulationWithOmittedOptions.should.throw();
    });
});

describe('simulation with values [10,9,8] all below costs [20,40]', function(){

    // buyerRate and sellerRate will default to [1.0] if absent and are coerced to positive number arrays by positiveNumberArray()
    // setting buyerRate to [1.0,1.0] should detect if there is some problem using arrays without affecting math tests
    
    let configCostsExceedValues = {
        L:1,
        H:100,
        buyerValues: [10,9,8],
        sellerCosts: [20,40],
        buyerAgentType: ["ZIAgent"],
        sellerAgentType: ["ZIAgent"],
        buyerRate: [1.0,1.0],
        sellerRate: 1.0,
        silent: 1
    };
    describe('on new Simulation', function(){
        let S = new Simulation(configCostsExceedValues);
        let props = ['config', 
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
            assert.ok(S.config===configCostsExceedValues);
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
        let logsProps = ['trade','buyorder','sellorder','rejectbuyorder','rejectsellorder','profit','ohlc','volume','effalloc'];
        it('.logs should have properties '+logsProps.join(','), function(){
            S.logs.should.have.properties(logsProps);
        });
        it('trade, buyorder, sellorder, ohlc, volume logs have header rows; profit log is empty', function(){
            let withHeaderRow = ['trade','buyorder','sellorder','ohlc','volume','effalloc'];
            withHeaderRow.forEach(function(prop){ S.logs[prop].data.length.should.equal(1); });
            S.logs.trade.data[0].should.deepEqual(tradeLogHeader);
            S.logs.buyorder.data[0].should.deepEqual(combinedOrderLogHeader);
            S.logs.sellorder.data[0].should.deepEqual(combinedOrderLogHeader);
            S.logs.rejectbuyorder.data[0].should.deepEqual(combinedOrderLogHeader);
            S.logs.rejectsellorder.data[0].should.deepEqual(combinedOrderLogHeader);
            S.logs.profit.data.length.should.equal(0);
        });

        it('.pool should be an instance of Pool containing 5 (ZI) agents with .bidPrice and .askPrice functions',function(){
            S.pool.should.be.an.instanceOf(Pool); 
            S.pool.agents.length.should.equal(5);
            S.pool.agents.forEach(function(A){ 
                A.should.be.an.instanceOf(ZIAgent).and.have.properties('bidPrice','askPrice');  
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
        it('getMaximumPossibleGainsFromTrade() should be 0, and set sim.maximumPossibleGainsFromTrade', function(){
            S.getMaximumPossibleGainsFromTrade().should.equal(0);
            S.maximumPossibleGainsFromTrade.should.equal(0);
        });
    });

    function testsForConfigCostsExceedValues(state){
        it('should increment .period', function(){
            state.S.period.should.equal(1);
        });
        it('should have property xMarket -- an instance of Market', function(){
            state.S.should.have.property('xMarket');
            state.S.xMarket.should.be.instanceOf(MEC.Market);
        });
        it('the buyorder log should have the header row and between ~2750 and ~3250 orders (5 sigma, poisson 3*1000)', function(){
            state.S.logs.buyorder.data[0].should.deepEqual(combinedOrderLogHeader);
            state.S.logs.buyorder.data.length.should.be.within(2750,3250);
        });
        it('the sellorder log should have the header row and between ~1750 and ~2250 orders (5 sigma, poisson 2*1000)', function(){
            state.S.logs.sellorder.data[0].should.deepEqual(combinedOrderLogHeader);
            state.S.logs.sellorder.data.length.should.be.within(1750,2250);
        });
        it('buy order log defines all fields on every row', function(){
            state.S.logs.buyorder.data.forEach((row)=>{
                row.length.should.equal(combinedOrderLogHeader.length);
                row.forEach((cell)=>{
                    assert.ok(typeof(cell)!=='undefined');
                });
            });
        });

        it('sell order log defines all fields on every row', function(){
            state.S.logs.sellorder.data.forEach((row)=>{
                row.length.should.equal(combinedOrderLogHeader.length);
                row.forEach((cell)=>{
                    assert.ok(typeof(cell)!=='undefined');
                });
            });
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
        it('the effalloc log should have only the header row and no entries, because 0/0 is not reported', function(){
            state.S.logs.effalloc.data.length.should.equal(1);
        });
        it('.logTrade({totalQ:2}) should throw because of single unit trade requirement', function(){
            function logTwoUnitTrade(){ state.S.logTrade({totalQ:2}); }
            logTwoUnitTrade.should.throw();
        });
    }

    describe('runPeriod({sync:true})', function(){

        /* runPeriod({sync:true}) is synchronous */

        let mySim = new Simulation(configCostsExceedValues);
        let sim = mySim.runPeriod({sync:true});
        it('should modify in place and return the original simulation object', function(){
            assert.ok(mySim===sim);
        });
        testsForConfigCostsExceedValues({S:mySim});
    });

    describe('runPeriod() runs asynchronously', function(){
        it('immediate inspection of order logs should only have length 1 from header row', function(done){
            let mySim = new Simulation(configCostsExceedValues);
            (mySim
             .runPeriod()
             .then(
                 function(){ 
                     done();
                 })
             .catch(
                 function(e){ 
                     assert.ok(false, e);
                 })
                 );
            mySim.logs.buyorder.data.length.should.equal(1);
            mySim.logs.sellorder.data.length.should.equal(1);
        });
        describe('when done should pass same tests', function(){
            let state = {};
            before(function(done){
                let mySim = new Simulation(configCostsExceedValues);
                function callback(S){
                    state.S = S;
                    done();
                }
                (mySim
                 .runPeriod()
                 .then(callback, 
                       function(e){ 
                           throw e; 
                       })
                );
            });
            testsForConfigCostsExceedValues(state);
        });
    });
});         

describe('simulation with single unit trade, value [1000], costs [1]', function(){
    
    let configSingleUnitTrade = {
        L:1,
        H:1000,
        buyerValues: [1000],
        sellerCosts: [1],
        buyerAgentType: ["ZIAgent"],
        sellerAgentType: ["ZIAgent"],
        silent: 1
    };

    describe('on new Simulation', function(){
        let S = new Simulation(configSingleUnitTrade);
        let props = ['config', 
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
            assert.ok(S.config===configSingleUnitTrade);
        });
        it('should set .numberOfBuyers to 1', function(){
            S.numberOfBuyers.should.equal(1);
        });
        it('should set .numberOfSellers to 1', function(){
            S.numberOfSellers.should.equal(1);
        });
        it('should set .numberOfAgents to 2', function(){
            S.numberOfAgents.should.equal(2);
        });
        let logsProps = ['trade','buyorder','sellorder','profit','ohlc','volume'];
        it('.logs should have properties '+logsProps.join(','), function(){
            S.logs.should.have.properties(logsProps);
        });
        it('.pool should be an instance of Pool containing 2 (ZI) agents with .bidPrice and .askPrice functions',function(){
            S.pool.should.be.an.instanceOf(Pool);
            S.pool.agents.length.should.equal(2);
            S.pool.agents.forEach(function(A){ 
                A.should.be.an.instanceOf(ZIAgent).and.have.properties('bidPrice','askPrice'); 
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
        it('.getMaxPossibleGainsFromTrade() should equal 999', function(){
            S.getMaximumPossibleGainsFromTrade().should.equal(999);
        });
    });

    function testsForConfigSingleUnitTrade(state){
        it('should increment .period', function(){
            state.S.period.should.equal(1);
        });
        it('should have property xMarket -- an instance of Market', function(){
            state.S.should.have.property('xMarket');
            state.S.xMarket.should.be.instanceOf(MEC.Market);
        });
        it('should set .bid and .ask function for each agent', function(){
            state.S.pool.agents.forEach(function(A){
                assert.strictEqual(typeof(A.bid), 'function');
                assert.strictEqual(typeof(A.ask), 'function');
            });
        });
        it('the order logs should have at most ~2225 orders (5 sigma, poisson 2000, but will exhaust sooner by trade)', function(){
            let numberOfOrders = 
                state.S.logs.buyorder.data.length+state.S.logs.sellorder.data.length;
            numberOfOrders.should.be.below(2225);
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
            let priceCol = tradeLogHeader.indexOf("price");
            state.S.logs.trade.data[1][priceCol].should.be.within(1,1000);
        });
        it('the tradelog should report the correct buyerAgentId', function(){
            let buyerId = state.S.buyersPool.agents[0].id;
            let col = tradeLogHeader.indexOf("buyerAgentId");
            let tradeLogBuyerId = state.S.logs.trade.data[1][col];
            assert.ok(tradeLogBuyerId===buyerId);
        });
        it('the tradelog should report the correct buyerValue', function(){
            let col = tradeLogHeader.indexOf("buyerValue");
            state.S.logs.trade.data[1][col].should.equal(1000);
        });
        it('the tradelog should report the correct buyerProfit', function(){
            let buyerProfitCol = tradeLogHeader.indexOf("buyerProfit");
            let priceCol = tradeLogHeader.indexOf("price");
            state.S.logs.trade.data[1][buyerProfitCol].should.equal(1000-state.S.logs.trade.data[1][priceCol]);
        });
        it('the tradelog should report the correct sellerAgentId', function(){
            let sellerId = state.S.sellersPool.agents[0].id;
            let col = tradeLogHeader.indexOf("sellerAgentId");
            let tradeLogSellerId = state.S.logs.trade.data[1][col];
            assert.ok(tradeLogSellerId===sellerId);
        });
        it('the tradelog should report the correct seller cost', function(){
            let col = tradeLogHeader.indexOf("sellerCost");
            state.S.logs.trade.data[1][col].should.equal(1);
        });
        it('the tradelog should report the correct seller profit', function(){
            let sellerProfitCol = tradeLogHeader.indexOf("sellerProfit");
            let priceCol = tradeLogHeader.indexOf("price");
            state.S.logs.trade.data[1][sellerProfitCol].should.equal(state.S.logs.trade.data[1][priceCol]-1);
        });
        it('the profit log should have one entry equal to [1000-p,p-1]', function(){
            let p = state.S.logs.trade.data[1][tradeLogHeader.indexOf("price")];
            let correctProfits = [1000-p,p-1];
            state.S.logs.profit.data.length.should.be.equal(1);
            state.S.logs.profit.data.should.deepEqual([correctProfits]);
        }); 
        it('the ohlc log should have header plus one entry, with all 4 o,h,l,c elements equal to the trade price', function(){
            let p = state.S.logs.trade.data[1][tradeLogHeader.indexOf("price")];
            let correctOHLC = [state.S.period,p,p,p,p];
            state.S.logs.ohlc.data.length.should.equal(2);
            state.S.logs.ohlc.data[1].should.deepEqual(correctOHLC);
        });
        it('the volume log should have header plus one entry, [1,1]', function(){
            state.S.logs.volume.data.length.should.equal(2);
            state.S.logs.volume.data[1].should.deepEqual([1,1]);
        });
        it('the effalloc log should have header plus one entry, [1,100]', function(){
            state.S.logs.effalloc.data.length.should.equal(2);
            state.S.logs.effalloc.data[1].should.deepEqual([1,100]);
        });
    }

    describe('runPeriod()', function(){

        /* runPeriod(true) is synchronous */

        let mySim = new Simulation(configSingleUnitTrade);
        let sim = mySim.runPeriod(true);
        it('should modify in place and return the original simulation object', function(){
            assert.ok(mySim===sim);
        });
        testsForConfigSingleUnitTrade({S:mySim});
    });

    describe('runPeriod() runs asynchronously', function(){
        describe('and returns a promise ', function(){
            it('order logs should have length 1 (header)', function(done){
                let mySim = new Simulation(configSingleUnitTrade);
                (mySim
                 .runPeriod()
                 .then(()=>(done()))
                );
                mySim.logs.buyorder.data.length.should.equal(1);
                mySim.logs.sellorder.data.length.should.equal(1);
            });
        });
        describe('when done should pass same tests as runPeriod()', function(){
            let state = {};
            beforeEach(function(done){
                let mySim = new Simulation(configSingleUnitTrade);
                mySim.runPeriod().then(function(S){
                    state.S = S;
                    done();
                });
            });
            testsForConfigSingleUnitTrade(state);
        });
    });
    function testsForRunSimulationSingleTradeTenPeriods(state){
        it('.period should be 10', function(){
            state.S.period.should.equal(10);
        });
        it('should have property xMarket -- an instance of Market', function(){
            state.S.should.have.property('xMarket');
            state.S.xMarket.should.be.instanceOf(MEC.Market);
        });
        it('the buy and sell order logs should have between 10 orders and 1000 orders', function(){

            /* 10 because we need 10 orders each side for 10 trades, 1000 tops is ad hoc but unlikely to be exceeded */ 

            state.S.logs.buyorder.data.length.should.be.within(10,1000);
            state.S.logs.sellorder.data.length.should.be.within(10,1000);
        });
        it('tp should equal t % periodDuration in all logs having t and tp fields', function(){
            let tested = 0;
            (Object
             .keys(state.S.logs)
             .filter(function(log){ 
                 let header = state.S.logs[log].data[0];
                 return (header.includes('t')) && (header.includes('tp'));
             })
             .forEach(function(log){
                 let data = state.S.logs[log].data;
                 let tCol  = data[0].indexOf('t');
                 let tpCol = data[0].indexOf('tp');
                 let i,l,row;
                 for(i=1,l=data.length;i<l;++i){
                     row = data[i];
                     row[tpCol].should.be.type('number');
                     row[tCol].should.be.type('number');
                     row[tpCol].should.equal(row[tCol] % state.S.periodDuration);
                     if (row[tCol]!==row[tpCol]) tested++;
                 }
             })
            );
            tested.should.be.above(9);
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
            let priceCol = tradeLogHeader.indexOf('price'),periodCol = tradeLogHeader.indexOf('period');
            // use .slice(1) to copy trade log with header row omitted
            let altOHLC = state.S.logs.trade.data.slice(1).map(
                function(row){ 
                    let period = row[periodCol];
                    let price  = row[priceCol];
                    // o,h,l,c equal because it is a single unit trade scenario
                    return [period,price,price,price,price];
                });
            state.S.logs.ohlc.data.length.should.equal(11);
            state.S.logs.ohlc.data.slice(1).should.deepEqual(altOHLC);          
        });
        it('the volume log should have 11 entries, header + 1 per period, showing 1 unit traded', function(){
            state.S.logs.volume.data.length.should.equal(11);
            state.S.logs.volume.data.slice(1).should.deepEqual([[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1]]);
        });
        it('the effalloc log should have 11 entries, header + 1 per period, showing eff=100 percent', function(){
            state.S.logs.effalloc.data.length.should.equal(11);
            state.S.logs.effalloc.data.slice(1).should.deepEqual([[1,100],[2,100],[3,100],[4,100],[5,100],[6,100],[7,100],[8,100],[9,100],[10,100]]);
        });
    }

    describe('runSimulation with 10 periods of single unit trade scenario, synchronous', function(){
        let config = Object.assign({}, configSingleUnitTrade, {periods:10});
        let S = new Simulation(config).run({sync:true});
        testsForRunSimulationSingleTradeTenPeriods({S});
    }); 

    describe('run Simulation with 10 periods of single unit trade scenario, asyncrhonous', function(){
        let config = Object.assign({}, configSingleUnitTrade, {periods:10});
        describe('order log should be header only', function(){
            it('order logs should have length 1', function(done){
                let S = new Simulation(config);
                S.run().then(function(){ done(); }).catch(function(e){ throw e;});
                S.logs.buyorder.data.length.should.equal(1);
                S.logs.sellorder.data.length.should.equal(1);
            });
        });
        describe('when done should pass same tests as above ', function(){
            let state = {};
            beforeEach(function(done){
                new Simulation(config).run().then(function(S){
                    state.S = S;
                    done();
                }, function(e){ assert.ok(false, e); });
            });
            testsForRunSimulationSingleTradeTenPeriods(state);
        });
    });

    describe('runSimulation with three simulations of 10 periods of single unit trade scenario, asynchronous', function(){
        let configA = Object.assign({}, configSingleUnitTrade, {periods:10});
        let configB = Object.assign({}, configSingleUnitTrade, {periods:10});
        let configC = Object.assign({}, configSingleUnitTrade, {periods:10});
        describe('when done should pass same tests as above ', function(){
            let states=[{},{},{}];
            // run the setup once before all the tests, not before each test
            before(function(done){
                let count = 0;
                function callback(S){
                    states[count].S = S;
                    count++;
                    if (count===3){
                        done();
                    }
                }
                new Simulation(configA).run().then(callback);
                new Simulation(configB).run().then(callback);
                new Simulation(configC).run().then(callback);
            });
            it('should have distinct buyer agents for each simulation', function(){
                states[0].S.buyersPool.agents[0].should.not.equal(states[1].S.buyersPool.agents[0]);
                states[0].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
                states[1].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
            });
            it('should have distinct seller agents for each simulation', function(){
                states[0].S.sellersPool.agents[0].should.not.equal(states[1].S.sellersPool.agents[0]);
                states[0].S.sellersPool.agents[0].should.not.equal(states[2].S.sellersPool.agents[0]);
                states[1].S.sellersPool.agents[0].should.not.equal(states[2].S.sellersPool.agents[0]);
            });
            testsForRunSimulationSingleTradeTenPeriods(states[0]);
            testsForRunSimulationSingleTradeTenPeriods(states[1]);
            testsForRunSimulationSingleTradeTenPeriods(states[2]);
        });
    });

    describe('runSimulation with three simulations of 10 periods of single unit trade scenario, asynchronous, realtime 1.5 sec period', function(){
        let rt = {
            realtime:1,
            periodDuration: 1.5,
            buyerRate: 10,
            sellerRate: 10
        };
        let configA = Object.assign({}, configSingleUnitTrade, {periods:10}, rt);
        let configB = Object.assign({}, configSingleUnitTrade, {periods:10}, rt);
        let configC = Object.assign({}, configSingleUnitTrade, {periods:10}, rt);
        describe('when done should pass same tests as above ', function(){
            let states=[{},{},{}];
            let tInit = 0, tFinal = 0, countBefore=0;
            // run the setup once before all the tests, not before each test
            before(function(done){
                tInit = Date.now();
                countBefore++;
                let count = 0;
                function callback(S){
                    states[count].S = S;
                    count++;
                    if (count===3){
                        tFinal = Date.now();
                        done();
                    }
                }
                new Simulation(configA).run().then(callback);
                new Simulation(configB).run().then(callback);
                new Simulation(configC).run().then(callback);
            });
            it('should only run the before() function in the test one time', function(){
                countBefore.should.equal(1);
            });
            it('should finish the real time simulations in about 15 sec', function(){
                const tInterval = (tFinal - tInit)/1000.0;
                tInterval.should.be.within(15,18);
            });
            it('should have distinct buyer agents for each simulation', function(){
                states[0].S.buyersPool.agents[0].should.not.equal(states[1].S.buyersPool.agents[0]);
                states[0].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
                states[1].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
            });
            it('should have distinct seller agents for each simulation', function(){
                states[0].S.sellersPool.agents[0].should.not.equal(states[1].S.sellersPool.agents[0]);
                states[0].S.sellersPool.agents[0].should.not.equal(states[2].S.sellersPool.agents[0]);
                states[1].S.sellersPool.agents[0].should.not.equal(states[2].S.sellersPool.agents[0]);
            });
            testsForRunSimulationSingleTradeTenPeriods(states[0]);
            testsForRunSimulationSingleTradeTenPeriods(states[1]);
            testsForRunSimulationSingleTradeTenPeriods(states[2]);
        });
    });
   
});
