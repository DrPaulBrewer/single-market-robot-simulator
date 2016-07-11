'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Simulation = exports.Log = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC                            
// This is open source software. The MIT License applies to this software.                                 
// see https://opensource.org/licenses/MIT or included License.md file

/* global fs:true */

/* eslint no-console: "off", no-sync:"off", consistent-this:"off" */

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _marketExampleContingent = require('market-example-contingent');

var MEC = _interopRequireWildcard(_marketExampleContingent);

var _marketAgents = require('market-agents');

var MarketAgents = _interopRequireWildcard(_marketAgents);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Market = MEC.Market;
var ZIAgent = MarketAgents.ZIAgent;
var Pool = MarketAgents.Pool;

var Log = exports.Log = function () {
    function Log(fname) {
        _classCallCheck(this, Log);

        this.useFS = false;
        try {
            this.useFS = typeof fname === 'string' && fs && fs.openSync && fs.writeSync;
        } catch (e) {} // eslint-disable-line no-empty
        if (this.useFS) this.fd = fs.openSync(fname, 'w');else this.data = [];
    }

    _createClass(Log, [{
        key: 'write',
        value: function write(x) {
            if (x === undefined) return;
            this.last = x;
            if (this.useFS) {
                if (Array.isArray(x)) {
                    fs.writeSync(this.fd, x.join(",") + "\n");
                } else if (typeof x === 'number' || typeof x === 'string') {
                    fs.writeSync(this.fd, x + "\n");
                } else {
                    fs.writeSync(this.fd, JSON.stringify(x) + "\n");
                }
            } else {
                this.data.push(x);
            }
        }
    }]);

    return Log;
}();

var Simulation = exports.Simulation = function () {
    function Simulation(config) {
        _classCallCheck(this, Simulation);

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

        if (!this.config.silent) {
            console.log("duration of each period = " + this.periodDuration);
            console.log(" ");
            console.log("Number of Buyers  = " + this.numberOfBuyers);
            console.log("Number of Sellers = " + this.numberOfSellers);
            console.log("Total Number of Agents  = " + this.numberOfAgents);
            console.log(" ");
            console.log("minPrice = " + this.config.L);
            console.log("maxPrice = " + this.config.H);
        }
    }

    _createClass(Simulation, [{
        key: 'initLogs',
        value: function initLogs() {
            var sim = this;
            sim.logs = {};

            /* we do not need test coverage of whether specific logs are enabled */
            /* provided all uses of each log are guarded by an if statement testing existance */
            /* istanbul ignore next */

            ['trade', 'buyorder', 'sellorder', 'profit', 'ohlc', 'volume'].forEach(function (name) {
                sim.logs[name] = new Log("./" + name + ".csv");
            });
            if (sim.logs.ohlc) sim.logs.ohlc.write(['period', 'open', 'high', 'low', 'close']);
            if (sim.logs.buyorder) sim.logs.buyorder.write(['period', 't', 'tp', 'id', 'x', 'buyLimitPrice', 'value', 'sellLimitPrice', 'cost']);
            if (sim.logs.sellorder) sim.logs.sellorder.write(['period', 't', 'tp', 'id', 'x', 'buyLimitPrice', 'value', 'sellLimitPrice', 'cost']);
            if (sim.logs.trade) sim.logs.trade.write(['period', 't', 'tp', 'price', 'buyerAgentId', 'buyerValue', 'buyerProfit', 'sellerAgentId', 'sellerCost', 'sellerProfit']);
            if (sim.logs.volume) sim.logs.volume.write(['period', 'volume']);
        }
    }, {
        key: 'initMarket',
        value: function initMarket() {
            var sim = this;
            var xDefaults = {
                goods: "X",
                money: "money"
            };
            sim.xMarket = new Market(Object.assign({}, xDefaults, sim.config.xMarket));
            sim.xMarket.on('trade', function (tradespec) {
                sim.logTrade(tradespec);
                sim.pool.trade(tradespec);
            });
        }
    }, {
        key: 'initAgents',
        value: function initAgents() {
            var sim = this;
            var config = sim.config;
            sim.pool = new Pool();
            sim.buyersPool = new Pool();
            sim.sellersPool = new Pool();
            sim.numberOfBuyers = config.numberOfBuyers || config.buyerValues.length;
            sim.numberOfSellers = config.numberOfSellers || config.sellerCosts.length;
            if (!sim.numberOfBuyers || !sim.numberOfSellers) throw new Error("single-market-robot-simulation: can not determine numberOfBuyers and/or numberOfSellers ");
            sim.numberOfAgents = sim.numberOfBuyers + sim.numberOfSellers;
            var common = {
                integer: config.integer,
                ignoreBudgetConstraint: config.ignoreBudgetConstraint,
                period: { number: 0, equalDuration: true, duration: config.periodDuration || 1000, init: { inventory: { X: 0, money: 0 } } },
                minPrice: config.L,
                maxPrice: config.H
            };
            sim.periodDuration = common.period.duration;
            function monkeyPatch(A) {
                A.bid = function (market, price) {
                    var order = MEC.oa({
                        t: this.wakeTime,
                        id: this.id,
                        cancel: !sim.config.keepPreviousOrders,
                        q: 1,
                        buyPrice: price
                    });
                    if (market.goods === 'X') {
                        if (sim.logs.buyorder) sim.logs.buyorder.write([this.period.number, this.wakeTime, this.wakeTime - this.period.startTime, this.id, this.inventory.X, price, this.unitValueFunction('X', this.inventory), '', '']);
                        market.inbox.push(order);
                        while (market.inbox.length > 0) {
                            market.push(sim.xMarket.inbox.shift());
                        }
                    }
                };

                A.ask = function (market, price) {
                    var order = MEC.oa({
                        t: this.wakeTime,
                        id: this.id,
                        cancel: !sim.config.keepPreviousOrders,
                        q: 1,
                        sellPrice: price
                    });

                    if (market.goods === 'X') {
                        if (sim.logs.sellorder) sim.logs.sellorder.write([this.period.number, this.wakeTime, this.wakeTime - this.period.startTime, this.id, this.inventory.X, '', '', price, this.unitCostFunction('X', this.inventory)]);
                        market.inbox.push(order);
                        while (market.inbox.length > 0) {
                            market.push(sim.xMarket.inbox.shift());
                        }
                    }
                };

                A.markets = [sim.xMarket];

                if (A instanceof MarketAgents.KaplanSniperAgent) {
                    A.getJuicyBidPrice = function () {
                        if (sim.logs && sim.logs.ohlc && sim.logs.ohlc.last && sim.logs.ohlc.last.length) return sim.logs.ohlc.last[2];
                    };
                    A.getJuicyAskPrice = function () {
                        if (sim.logs && sim.logs.ohlc && sim.logs.ohlc.last && sim.logs.ohlc.last.length) return sim.logs.ohlc.last[3];
                    };
                }
            }
            function newBuyerAgent() {
                var a = new ZIAgent(Object.assign({}, common, { rate: config.buyerRate || 1 }));
                monkeyPatch(a, sim);
                return a;
            }
            function newSellerAgent() {
                var a = new ZIAgent(Object.assign({}, common, { rate: config.sellerRate || 1 }));
                monkeyPatch(a, sim);
                return a;
            }

            for (var i = 0, l = sim.numberOfBuyers; i < l; ++i) {
                var a = newBuyerAgent();
                sim.buyersPool.push(a);
                sim.pool.push(a);
            }
            for (var _i = 0, _l = sim.numberOfSellers; _i < _l; ++_i) {
                var _a = newSellerAgent();
                sim.sellersPool.push(_a);
                sim.pool.push(_a);
            }
            sim.buyersPool.distribute('values', 'X', config.buyerValues);
            sim.sellersPool.distribute('costs', 'X', config.sellerCosts);
        }
    }, {
        key: 'runPeriod',
        value: function runPeriod(cb) {
            var sim = this;
            sim.period++;

            /* istanbul ignore if */

            if (!sim.config.silent) console.log("period: " + sim.period);
            sim.pool.initPeriod(sim.period);
            sim.xMarket.clear();
            if (typeof cb === 'function') {

                /* run asynchronously, call cb function at end */

                return sim.pool.run(sim.pool.endTime(), function () {
                    this.endPeriod();
                    sim.logPeriod();
                    cb(false, sim);
                }, 10);
            }

            /* no callback; run synchronously */

            sim.pool.syncRun(sim.pool.endTime());
            sim.pool.endPeriod();
            sim.logPeriod();
            return sim;
        }
    }, {
        key: 'logPeriod',
        value: function logPeriod() {
            var sim = this;
            var finalMoney = sim.pool.agents.map(function (A) {
                return A.inventory.money;
            });
            function ohlc() {
                if (sim.periodTradePrices.length > 0) {
                    var o = sim.periodTradePrices[0];
                    var c = sim.periodTradePrices[sim.periodTradePrices.length - 1];
                    var h = Math.max.apply(Math, _toConsumableArray(sim.periodTradePrices));
                    var l = Math.min.apply(Math, _toConsumableArray(sim.periodTradePrices));
                    return [sim.period, o, h, l, c];
                }
            }
            if (sim.logs.profit) sim.logs.profit.write(finalMoney);
            if (sim.logs.ohlc) sim.logs.ohlc.write(ohlc());
            if (sim.logs.volume) sim.logs.volume.write([sim.period, sim.periodTradePrices.length]);
            sim.periodTradePrices = [];
        }
    }, {
        key: 'logTrade',
        value: function logTrade(tradespec) {
            var sim = this;
            var idCol = sim.xMarket.o.idCol;

            /* istanbul ignore if */

            if (idCol === undefined) throw new Error("Simulation.prototype.logTrade: sim.xMarket.o.idCol is undefined");
            // this is only sufficient for single unit trades
            if (tradespec.totalQ !== 1 || tradespec.buyA.length !== 1 || tradespec.sellA.length !== 1) throw new Error("Simulation.prototype.logTrade: single unit trades required, got: " + tradespec.totalQ);
            var buyerid = sim.xMarket.a[tradespec.buyA[0]][idCol];

            /* istanbul ignore if */

            if (buyerid === undefined) throw new Error("Simulation.prototype.logTrade: buyerid is undefined, tradespec=" + JSON.stringify(tradespec));
            var sellerid = sim.xMarket.a[tradespec.sellA[0]][idCol];

            /* istanbul ignore if */

            if (sellerid === undefined) throw new Error("Simulation.prototype.logTrade: sellerid is undefined, tradespec=" + JSON.stringify(tradespec));
            var tradePrice = tradespec.prices[0];
            if (!tradePrice) throw new Error("Simulation.prototype.logTrade: undefined price in trade ");
            var tradeBuyerValue = sim.pool.agentsById[buyerid].unitValueFunction('X', sim.pool.agentsById[buyerid].inventory);
            var tradeBuyerProfit = tradeBuyerValue - tradePrice;
            var tradeSellerCost = sim.pool.agentsById[sellerid].unitCostFunction('X', sim.pool.agentsById[sellerid].inventory);
            var tradeSellerProfit = tradePrice - tradeSellerCost;
            var tradeOutput = [sim.period, tradespec.t, tradespec.t - sim.period * sim.periodDuration, tradePrice, buyerid, tradeBuyerValue, tradeBuyerProfit, sellerid, tradeSellerCost, tradeSellerProfit];
            sim.periodTradePrices.push(tradePrice);
            if (sim.logs.trade) sim.logs.trade.write(tradeOutput);
        }
    }, {
        key: 'run',
        value: function run(done, update, delay) {

            var mySim = this;
            var config = this.config;

            /* istanbul ignore if */

            if (!config.silent) console.log("Periods = " + config.periods);
            if (typeof done === 'function') {
                _async2.default.whilst(function () {
                    return mySim.period < config.periods;
                }, function (callback) {
                    setTimeout(function () {
                        mySim.runPeriod(function (e, d) {
                            if (typeof update === 'function') update(e, d);
                            callback(e, d);
                        });
                    }, delay || 100);
                }, function () {

                    /* istanbul ignore if */

                    if (!config.silent) console.log("done");
                    done(false, mySim);
                });
            } else {

                /* no done callback, run synchronously */

                while (mySim.period < config.periods) {
                    mySim.runPeriod();
                }

                /* istanbul ignore if */

                if (!config.silent) console.log("done");
            }
            return mySim;
        }
    }]);

    return Simulation;
}();

/* the next comment tells the coverage tester that the main() function is not tested by the test suite */
/* istanbul ignore next */

function main() {

    /* suggested by Krumia's http://stackoverflow.com/users/1461424/krumia */
    /* posting at http://stackoverflow.com/a/25710749/103081 */

    var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    new Simulation(config).run();
}

if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object') {

    /* istanbul ignore if */

    if (require && require.main === module) main();
}
