// Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC                             
// This is open source software. The MIT License applies to this software.                                  
// see https://opensource.org/licenses/MIT or included License.md file

/* global fs:true */

const async = require('async');
const MEC = require('market-example-contingent');
const Market = MEC.Market;
const MarketAgents = require('market-agents');
const ZIAgent = MarketAgents.ziAgent;
const Pool = MarketAgents.Pool;

class Log {
    constructor(fname){
        this.useFS = false;
        try { 
            this.useFS = ( (typeof(fname)==='string') &&
                           (fs) &&
                           (fs.openSync) &&
                           (fs.writeSync) );
        } catch(e){} // eslint-disable-line no-empty
        if (this.useFS)
            this.fd = fs.openSync(fname, 'w');
        else
            this.data = [];
    }

    write(x){
        if (x===undefined) return;
        this.last = x;
        if (this.useFS){
            if (Array.isArray(x)){
                fs.writeSync(this.fd, x.join(",")+"\n");
            } else if ((typeof(x)==='number') || (typeof(x)==='string')){
                fs.writeSync(this.fd, x+"\n");
            } else {
                fs.writeSync(this.fd, JSON.stringify(x)+"\n");
            }
        } else {
            this.data.push(x);
        }
    }
}

class Simulation {
    constructor(config){
        this.config = config;
        // expected options
        // periods:  number of periods to run
        // buyerValues array of one for each ZI buyer
        // sellerCosts one for each ZI seller
        // L is the lowest possible random bid price
        // H is the highest possible random ask price
        // maxTries -- maximum number of tries to generate order
        this.initLogs();
        this.initMarket();
        this.initAgents();
        this.period = 0;
        this.periodTradePrices = [];    

        /* istanbul ignore if */

        if (!this.config.silent){
            console.log("duration of each period = "+this.periodDuration);
            console.log(" ");
            console.log("Number of Buyers  = "+this.numberOfBuyers);
            console.log("Number of Sellers = "+this.numberOfSellers);
            console.log("Total Number of Agents  = "+this.numberOfAgents);
            console.log(" ");
            console.log("minPrice = "+this.config.L);
            console.log("maxPrice = "+this.config.H);
        }
    }

    initLogs(){
	const sim = this;
        sim.logs = {};

        /* we do not need test coverage of whether specific logs are enabled */
        /* provided all uses of each log are guarded by an if statement testing existance */
        /* istanbul ignore next */

        ['trade','buyorder','sellorder','profit','ohlc','volume'].forEach(function(name){
            sim.logs[name] = new Log("./"+name+".csv");
        });
        if (sim.logs.ohlc)
            sim.logs.ohlc.write(['period','open','high','low','close']);
        if (sim.logs.buyorder)
            sim.logs.buyorder.write(['period','t','tp','id','x', 'buyLimitPrice','value','sellLimitPrice','cost']);
        if (sim.logs.sellorder)
            sim.logs.sellorder.write(['period','t','tp','id','x', 'buyLimitPrice','value','sellLimitPrice','cost']);
        if (sim.logs.trade)
            sim.logs.trade.write(['period','t','tp','price','buyerAgentId','buyerValue','buyerProfit','sellerAgentId','sellerCost','sellerProfit']);
        if (sim.logs.volume)
            sim.logs.volume.write(['period','volume']);
    }

    initMarket(){
        const sim = this;
        const xDefaults = {
            goods: "X",
            money: "money"
        };
        sim.xMarket = new Market(Object.assign({}, xDefaults, sim.config.xMarket));
        sim.xMarket.on('trade', function(tradespec){ 
            sim.logTrade(tradespec);
            sim.pool.trade(tradespec);
        });     
    }

    initAgents(){
        const sim = this;
        const config = sim.config;
        sim.pool = new Pool();
        sim.buyersPool = new Pool();
        sim.sellersPool = new Pool();
        sim.numberOfBuyers  = config.numberOfBuyers  || config.buyerValues.length;
        sim.numberOfSellers = config.numberOfSellers || config.sellerCosts.length;
        if ( (!sim.numberOfBuyers) || (!sim.numberOfSellers) )
            throw new Error("single-market-robot-simulation: can not determine numberOfBuyers and/or numberOfSellers ");
        sim.numberOfAgents = sim.numberOfBuyers+sim.numberOfSellers;
        const common = {
            integer: config.integer,
            ignoreBudgetConstraint: config.ignoreBudgetConstraint,
            period: {number:0, equalDuration:true, duration:(config.periodDuration || 1000), init: {inventory:{X:0, money:0}}},
            minPrice: config.L,
            maxPrice: config.H
        };
        sim.periodDuration = common.period.duration;
        function monkeyPatch(A){
            A.bid = function(market, price){
                const order = MEC.oa({
                    t: this.wakeTime,
                    id: this.id,
                    cancel: !sim.config.keepPreviousOrders,
                    q: 1,
                    buyPrice: price
                });
                if (market.goods === 'X'){
                    if (sim.logs.buyorder)
                        sim.logs.buyorder.write([
                            this.period.number, 
                            this.wakeTime, 
                            this.wakeTime-this.period.startTime,
                            this.id, 
                            this.inventory.X,
                            price, 
                            this.unitValueFunction('X',this.inventory), 
                            '',
                            ''
                        ]);
                    market.inbox.push(order);
                    while(market.inbox.length>0)
                        market.push(sim.xMarket.inbox.shift());
                }
            };

            A.ask = function(market, price){
                const order = MEC.oa({
                    t: this.wakeTime,
                    id: this.id,
                    cancel: !sim.config.keepPreviousOrders,
                    q: 1,
                    sellPrice: price
                });

                if (market.goods === 'X'){
                    if (sim.logs.sellorder)
                        sim.logs.sellorder.write([
                            this.period.number, 
                            this.wakeTime, 
                            this.wakeTime-this.period.startTime,
                            this.id, 
                            this.inventory.X,
                            '',
                            '',
                            price, 
                            this.unitCostFunction('X',this.inventory) 
                        ]);
                    market.inbox.push(order);
                    while(market.inbox.length>0)
                        market.push(sim.xMarket.inbox.shift());
                }
            };

            A.markets = [sim.xMarket];

            if (A instanceof MarketAgents.KaplanSniperAgent){
                A.getJuicyBidPrice = function(){
                    if (sim.logs && sim.logs.ohlc && sim.logs.ohlc.last && sim.logs.ohlc.last.length)
                        return sim.logs.ohlc.last[2];
                };
                A.getJuicyAskPrice = function(){
                    if (sim.logs && sim.logs.ohlc && sim.logs.ohlc.last && sim.logs.ohlc.last.length)
                        return sim.logs.ohlc.last[3];
                };
            }
        }
        function newBuyerAgent(){
            const a = new ZIAgent(Object.assign({}, common, {rate: (config.buyerRate || 1)}));
            monkeyPatch(a, sim);
            return a;
        }
        function  newSellerAgent(){
            const a = new ZIAgent(Object.assign({}, common, {rate: (config.sellerRate || 1)}));
            monkeyPatch(a, sim);
            return a;
        }

        for(let i=0,l=sim.numberOfBuyers;i<l;++i){
            const a = newBuyerAgent();
            sim.buyersPool.push(a);
            sim.pool.push(a);
        }
        for(let i=0,l=sim.numberOfSellers;i<l;++i){
            const a = newSellerAgent();
            sim.sellersPool.push(a);
            sim.pool.push(a);
        }
        sim.buyersPool.distribute('values','X',config.buyerValues);
        sim.sellersPool.distribute('costs','X',config.sellerCosts);
    }

    runPeriod(cb){
        const sim = this;
        sim.period++;

        /* istanbul ignore if */

        if (!sim.config.silent)
            console.log("period: "+sim.period);
        sim.pool.initPeriod(sim.period);
        sim.xMarket.clear();
        if (typeof(cb)==='function'){

            /* run asynchronously, call cb function at end */

            return sim.pool.run(sim.pool.endTime(),
                                function(){
                                    this.endPeriod();
                                    sim.logPeriod();
                                    cb(false, sim);
                                }
                                , 10);
        } 

        /* no callback; run synchronously */

        sim.pool.syncRun(sim.pool.endTime());
        sim.pool.endPeriod();
        sim.logPeriod();
        return(sim);
    }

    logPeriod(){
        const sim = this;
        const finalMoney = sim.pool.agents.map(function(A){ return A.inventory.money; });
        function ohlc(){
            if (sim.periodTradePrices.length>0){
                const o = sim.periodTradePrices[0];
                const c = sim.periodTradePrices[sim.periodTradePrices.length-1];
                const h = Math.max(...sim.periodTradePrices);
                const l = Math.min(...sim.periodTradePrices);
                return [sim.period,o,h,l,c];
            }
        }
        if (sim.logs.profit)
            sim.logs.profit.write(finalMoney);
        if (sim.logs.ohlc)
            sim.logs.ohlc.write(ohlc());
        if (sim.logs.volume)
            sim.logs.volume.write([sim.period,sim.periodTradePrices.length]);
        sim.periodTradePrices = [];
    }

    logTrade(tradespec){
        const sim = this;
        const idCol = sim.xMarket.o.idCol;

        /* istanbul ignore if */

        if (idCol === undefined )
            throw new Error("Simulation.prototype.logTrade: sim.xMarket.o.idCol is undefined");
        // this is only sufficient for single unit trades
        if ( (tradespec.totalQ!==1) ||
             (tradespec.buyA.length!==1) ||
             (tradespec.sellA.length!==1) )
            throw new Error("Simulation.prototype.logTrade: single unit trades required, got: "+tradespec.totalQ);
        const buyerid  = sim.xMarket.a[tradespec.buyA[0]][idCol];

        /* istanbul ignore if */

        if (buyerid===undefined)
            throw new Error("Simulation.prototype.logTrade: buyerid is undefined, tradespec="+JSON.stringify(tradespec));
        const sellerid = sim.xMarket.a[tradespec.sellA[0]][idCol];

        /* istanbul ignore if */

        if (sellerid===undefined)
            throw new Error("Simulation.prototype.logTrade: sellerid is undefined, tradespec="+JSON.stringify(tradespec));
        const tradePrice = tradespec.prices[0];
        if (!tradePrice) throw new Error("Simulation.prototype.logTrade: undefined price in trade ");
        const tradeBuyerValue = sim.pool.agentsById[buyerid].unitValueFunction('X', sim.pool.agentsById[buyerid].inventory);
        const tradeBuyerProfit = tradeBuyerValue-tradePrice;
        const tradeSellerCost = sim.pool.agentsById[sellerid].unitCostFunction('X', sim.pool.agentsById[sellerid].inventory);
        const tradeSellerProfit = tradePrice-tradeSellerCost;
        const tradeOutput = [
            sim.period,
            tradespec.t,
            tradespec.t-(sim.period*sim.periodDuration),
            tradePrice,
            buyerid,
            tradeBuyerValue,
            tradeBuyerProfit,
            sellerid,
            tradeSellerCost,
            tradeSellerProfit
        ];
        sim.periodTradePrices.push(tradePrice);
        if (sim.logs.trade)
            sim.logs.trade.write(tradeOutput);
    }
}

// eslint-disable-next-line max-params
function runSimulation(config, done, update, delay){
    "use strict";
    const mySim = new Simulation(config);

    /* istanbul ignore if */

    if (!config.silent)
        console.log("Periods = "+config.periods);
    if(typeof(done)==='function'){
        async.whilst(
            function(){
                return (mySim.period<config.periods); 
            },
            function(callback){
                setTimeout(function(){
                    mySim.runPeriod(function(e,d){
                        if (typeof(update)==='function') update(e,d);
                        callback(e,d);
                    });
                }, (delay || 100) );
            },
            function(){ 

                /* istanbul ignore if */

                if (!config.silent)
                    console.log("done");
                done(false, mySim);
            }
        );
    } else {

        /* no done callback, run synchronously */

        while(mySim.period<config.periods){
            mySim.runPeriod();
        }

        /* istanbul ignore if */

        if (!config.silent)
            console.log("done");
    }
    return mySim;
}
    
/* the next comment tells the coverage tester that the main() function is not tested by the test suite */
/* istanbul ignore next */

function main(){
    "use strict";

    /* suggested by Krumia's http://stackoverflow.com/users/1461424/krumia */
    /* posting at http://stackoverflow.com/a/25710749/103081 */

    const config = JSON.parse(
        fs.readFileSync('./config.json', 'utf8')
    );

    runSimulation(config);

}

if (typeof(module)==='object'){

    /* istanbul ignore if */

    if (require && (require.main===module))
	main();
    else 
	module.exports = {
            Simulation,
            runSimulation,
            Log
	};
}

