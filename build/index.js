"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.agentRegister = agentRegister;
exports.Simulation = exports.logNames = exports.logHeaders = void 0;

var _simpleIsomorphicLogger = _interopRequireDefault(require("simple-isomorphic-logger"));

var MEC = _interopRequireWildcard(require("market-example-contingent"));

var MarketAgents = _interopRequireWildcard(require("market-agents"));

var stats = _interopRequireWildcard(require("stats-lite"));

var _giniSs = _interopRequireDefault(require("gini-ss"));

var _positiveNumberArray = _interopRequireDefault(require("positive-number-array"));

var _pWhilst = _interopRequireDefault(require("p-whilst"));

var fs = _interopRequireWildcard(require("fs"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// remember to override in jspm dep configuration to empty
var Market = MEC.Market;
var Pool = MarketAgents.Pool;
var AgentFactoryWarehouse = {};
/**
 * create new agent of specified name and options
 * @param {string} name Name of agent registered in AgentFactoryWarehouse
 * @param {Object} options Agent options.
 * @return {Object} new Agent generated by calling requested constructor with options
 * @private
 */

function newAgentFactory(name, options) {
  return new AgentFactoryWarehouse[name](options);
}
/**
 * register new types of (customized) agents in AgentFactoryWarehouse for use in simulations
 * @param {Object} obj An object with agent type names for keys and constructor(options) functions for values
 */


function agentRegister(obj) {
  Object.assign(AgentFactoryWarehouse, obj);
}

agentRegister(MarketAgents); // a bit overbroad but gets all of them

var orderHeader = ['caseid', 'period', 't', 'tp', 'preBidPrice', 'preAskPrice', 'preTradePrice', 'id', 'x', 'buyLimitPrice', 'buyerValue', 'buyerAgentType', 'sellLimitPrice', 'sellerCost', 'sellerAgentType'];
var logHeaders = {
  ohlc: ['caseid', 'period', 'beginTime', 'endTime', 'endReason', 'openPrice', 'highPrice', 'lowPrice', 'closePrice', 'volume', 'p25Price', 'medianPrice', 'p75Price', 'meanPrice', 'sd', 'gini'],
  buyorder: orderHeader,
  sellorder: orderHeader,
  rejectbuyorder: orderHeader,
  rejectsellorder: orderHeader,
  trade: ['caseid', 'period', 't', 'tp', 'price', 'buyerAgentId', 'buyerAgentType', 'buyerValue', 'buyerProfit', 'sellerAgentId', 'sellerAgentType', 'sellerCost', 'sellerProfit'],
  effalloc: ['caseid', 'period', 'efficiencyOfAllocation']
};
exports.logHeaders = logHeaders;
var logNames = ['trade', 'buyorder', 'sellorder', 'rejectbuyorder', 'rejectsellorder', 'profit', 'ohlc', 'effalloc'];
/**
 * single-market-robot-simulation Simulation
 */

exports.logNames = logNames;

var Simulation =
/*#__PURE__*/
function () {
  /**
   * Create Simulation with given configuration
   * @param {Object} config
   * @param {number} config.periods number of periods in this simulation
   * @param {number} config.periodDuration duration of each period
   * @param {number} [config.tradeClock] trade clock duration: end period early if a trade does not occur in this time interval
   * @param {number} [config.orderClock] order clock duration: end period early if a valid (not rejected) buy or sell order does not occur in this time interval
   * @param {string[]} config.buyerAgentType string array (choose from "ZIAgent","UnitAgent","OneupmanshipAgent","KaplanSniperAgent" or types registered with agentRegister()) giving a rotation of types of agents to use when creating the buyer agents.
   * @param {string[]} config.sellerAgentType string array (choose from "ZIAgent","UnitAgent","OneupmanshipAgent","KaplanSniperAgent" or types registered with agentRegister()) giving a rotation of types of agents to use when creating the seller agents.
   * @param {number[]} [config.buyerRate=1.0] poisson arrival rate in wakes/sec for each buyer agent, defaults to 1.0 for all agents
   * @param {number[]} [config.sellerRate=1.0] poisson arrival rate in wakes/sec for each seller agent, defaults to 1.0 for all agents
   * @param {number[]} config.buyerValues Numeric array giving aggregate market demand for X. Becomes agents' values for units. Each period a new set of these values is distributed among buyer agents.
   * @param {number[]} config.sellerCosts Numeric array giving aggregate market supply for X. Becomes agents' costs for units.  Each period a new set of these costs is distributed among seller agents.
   * @param {number} [config.numberOfBuyers] number of buyers; if unprovided, assigns 1 buyer per entry in .buyerValues
   * @param {number} [config.numberOfSellers] number of sellers; if unprovided, assigns 1 seller per entry in .sellerCosts
   * @param {Object} config.xMarket configuration options for x Market forwarded to market-example-contingent constructor
   * @param {boolean} [config.integer] Set true if agent prices should be integers. Sent to agent constructor. Used by some random agents, such as ZIAgent.
   * @param {boolean} [config.ignoreBudgetConstraint] Set true if agents should ignore their values/costs and pretend they have maximum value or minimum cost.  Sent to agent constructors.
   * @param {boolean} [config.keepPreviousOrders] Set true if agents should not set cancelReplace flag on orders
   * @param {number} config.L Minimum suggested agent price.  Sets .minPrice in agent constructor options
   * @param {number} config.H Maximum suggested agent price.  Sets .maxPrice in agent constructor options
   * @param {boolean} [config.silent] If true, suppress console.log messages providing total number of agents, etc.
   * @param {boolean} [config.withoutOrderLogs] If true, suppresses buyorderlog and sellorderlog
   */
  function Simulation(config) {
    _classCallCheck(this, Simulation);

    /**
     * copy of config as passed to constructor
     * @type {Object} this.config
     */
    this.config = config;
    this.initLogs();
    this.initMarket();
    this.initAgents();
    this.initProfitLogHeader();
    /**
     * caseid to report as first column of each log
     * @type {number} this.caseid
     */

    this.caseid = config.caseid || 0;
    /**
     * current period number when running simulation
     * @type {number} this.period
     */

    this.period = 0;
    /**
     * trade prices for current period
     * @type {number[]} this.periodTradePrices
     */

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
  /**
   * initialize simulation data logging.
   * called automatically by constructor
   * @private
   */


  _createClass(Simulation, [{
    key: "initLogs",
    value: function initLogs() {
      var sim = this;
      sim.logs = {};
      var withoutOrderLogs = logNames.filter(function (s) {
        return !s.includes('order');
      });
      var actualLogs = sim.config.withoutOrderLogs ? withoutOrderLogs : logNames;
      var logDir = sim.config.logDir || ".";
      var logToFS = sim.config.logToFileSystem;
      actualLogs.forEach(function (name) {
        sim.logs[name] = new _simpleIsomorphicLogger.default(logDir + "/" + name + ".csv", logToFS).setHeader(logHeaders[name]);
      });
    }
  }, {
    key: "initProfitLogHeader",
    value: function initProfitLogHeader() {
      var sim = this;
      var preamble = ['caseid', 'period'];
      var profits = sim.pool.agents.map(function (a) {
        return 'y' + a.id;
      });
      var header = preamble.concat(profits);
      if (sim.logs.profit) sim.logs.profit.setHeader(header);
    }
    /**
     * Initalize single market for trading X in Simulation
     * called by constructor
     * @private
     */

  }, {
    key: "initMarket",
    value: function initMarket() {
      var sim = this;
      var xDefaults = {
        goods: "X",
        money: "money"
      };
      sim.xMarket = new Market(Object.assign({}, xDefaults, sim.config.xMarket));

      sim.xMarket.previousPeriod = function (prop) {
        return sim.logs.ohlc.lastByKey(prop);
      };

      sim.xMarket.on('trade', function (tradespec) {
        sim.logTrade(tradespec);
        sim.pool.trade(tradespec);
      });

      if (!sim.config.withoutOrderLogs) {
        sim.xMarket.on('preorder', function (myorder) {
          sim.logOrder('', myorder);
        });
        sim.xMarket.on('reject', function (myorder) {
          sim.logOrder('reject', myorder);
        });
      }
    }
    /**
     * Initialize agents in simulation
     * called by constructor
     * @private
     */

  }, {
    key: "initAgents",
    value: function initAgents() {
      var sim = this;
      var config = sim.config;
      sim.pool = new Pool();
      sim.buyersPool = new Pool();
      sim.sellersPool = new Pool();
      sim.numberOfBuyers = config.numberOfBuyers || config.buyerValues.length;
      sim.numberOfSellers = config.numberOfSellers || config.sellerCosts.length;
      config.buyerRate = (0, _positiveNumberArray.default)(config.buyerRate) || [1];
      config.sellerRate = (0, _positiveNumberArray.default)(config.sellerRate) || [1];
      if (!sim.numberOfBuyers || !sim.numberOfSellers) throw new Error("single-market-robot-simulation: can not determine numberOfBuyers and/or numberOfSellers ");
      sim.numberOfAgents = sim.numberOfBuyers + sim.numberOfSellers;
      var common = {
        integer: config.integer,
        ignoreBudgetConstraint: config.ignoreBudgetConstraint,
        period: {
          number: 0,
          equalDuration: true,
          duration: config.periodDuration || 1000,
          init: {
            inventory: {
              X: 0,
              money: 0
            }
          }
        },
        minPrice: config.L,
        maxPrice: config.H
      };
      sim.periodDuration = common.period.duration;

      for (var i = 0, l = sim.numberOfBuyers; i < l; ++i) {
        var a = sim.newBuyerAgent(i, common);
        sim.buyersPool.push(a);
        sim.pool.push(a);
      }

      for (var _i = 0, _l = sim.numberOfSellers; _i < _l; ++_i) {
        var _a = sim.newSellerAgent(_i, common);

        sim.sellersPool.push(_a);
        sim.pool.push(_a);
      }

      sim.buyersPool.distribute('values', 'X', config.buyerValues);
      sim.sellersPool.distribute('costs', 'X', config.sellerCosts);
    }
    /**
     * Create a new Buyer agent for the simulation
     * called by initAgents() for each buyer
     * @param {number} i counter for agents 0,1,2,...
     * @param {Object} common Settings to send to agent constructor
     * @private
     */

  }, {
    key: "newBuyerAgent",
    value: function newBuyerAgent(i, common) {
      var sim = this;
      var lType = sim.config.buyerAgentType.length;
      var lRate = sim.config.buyerRate.length;
      var a = newAgentFactory(sim.config.buyerAgentType[i % lType], Object.assign({
        id: 1 + i
      }, common, {
        rate: sim.config.buyerRate[i % lRate]
      }));
      sim.teachAgent(a);
      return a;
    }
    /**
     * Create a new Seller agent for the simulation
     * called by initAgents() for each seller
     * @param {number} i counter for agents 0,1,2,...
     * @param {Object} common Settings to send to agent constructor
     * @private
     */

  }, {
    key: "newSellerAgent",
    value: function newSellerAgent(i, common) {
      var sim = this;
      var lType = sim.config.sellerAgentType.length;
      var lRate = sim.config.sellerRate.length;
      var a = newAgentFactory(sim.config.sellerAgentType[i % lType], Object.assign({
        id: i + 1 + sim.numberOfBuyers
      }, common, {
        rate: sim.config.sellerRate[i % lRate]
      }));
      sim.teachAgent(a);
      return a;
    }
    /**
     * teach an agent tasks such as how to send buy and sell orders to market, how to find "Juicy" price for KaplanSniperAgent, etc.
     * called for each agent in newBuyerAgent() or newSellerAgent()
     * @param {Object} A a new agent that needs to learn the task methods
     * @private
     */

  }, {
    key: "teachAgent",
    value: function teachAgent(A) {
      var sim = this;

      A.bid = function (market, price) {
        var order = MEC.oa({
          t: this.wakeTime,
          id: this.id,
          cancel: !sim.config.keepPreviousOrders,
          q: 1,
          buyPrice: price
        });

        if (market.goods === 'X') {
          market.submit(order);

          while (market.process()) {} // eslint-disable-line no-empty

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
          market.submit(order);

          while (market.process()) {
            ;
          }
        }
      };

      A.markets = [sim.xMarket];
    }
    /**
     * calculate potentialEndOfPeriod and reason
     * @return {Object} {endTime,reason}  endTime(number) and reason(string) for end of period
     */

  }, {
    key: "potentialEndOfPeriod",
    value: function potentialEndOfPeriod() {
      var sim = this;

      function lastT(log) {
        var period = sim.logs[log].lastByKey('period');

        if (period !== sim.period) {
          return sim.periodDuration * sim.period;
        }

        return +sim.logs[log].lastByKey('t');
      }

      var endTime = sim.pool.endTime(),
          altTime = 0;
      var reason = 0; // endPeriod because periodDuration expired

      if (+sim.config.orderClock > 0) {
        altTime = ['buyorder', 'sellorder'].reduce(function (acc, log) {
          return Math.max(acc, +sim.config.orderClock + lastT(log));
        }, 0);

        if (altTime < endTime) {
          endTime = altTime;
          reason = 2; // endPeriod because orderClock expired
        }
      }

      if (+sim.config.tradeClock > 0) {
        altTime = +sim.config.tradeClock + lastT('trade');

        if (altTime < endTime) {
          endTime = altTime;
          reason = 1; // endPeriod because tradeClock expired
        }
      }

      return {
        endTime: endTime,
        reason: reason
      };
    }
    /**
     * runs a periods of the simulation
     * @param {boolean} sync true indicates call is synchronous, return value will be simulation object; false indicates async, return value is Promise
     * @return {Promise<Object,Error>} Resolves to simulation object when one period of simulation is complete.
     */

  }, {
    key: "runPeriod",
    value: function runPeriod(sync) {
      var sim = this;

      function atEndOfPeriod() {
        sim.pool.endPeriod();
        sim.logPeriod();
        return sim;
      }

      sim.period++;
      /* istanbul ignore if */

      if (!sim.config.silent) console.log("period: " + sim.period);
      sim.pool.initPeriod(sim.period);
      sim.xMarket.clear();
      var oldEnd = {
        endTime: 0
      };
      var mayEnd = sim.potentialEndOfPeriod();

      function cont() {
        return oldEnd.endTime < mayEnd.endTime;
      }

      function step() {
        oldEnd = mayEnd;
        mayEnd = sim.potentialEndOfPeriod();
      }

      if (sync) {
        while (cont()) {
          sim.pool.syncRun(mayEnd.endTime);
          step();
        }

        return atEndOfPeriod();
      }

      if (!sim.config.realtime) {
        return (0, _pWhilst.default)(cont, function () {
          return sim.pool.runAsPromise(mayEnd.endTime, 10).then(step);
        }).then(atEndOfPeriod);
      }

      if (+sim.config.orderClock || +sim.config.tradeClock) {
        return Promise.reject("orderClock/tradeClock not yet supported with real time sim");
      }

      return new Promise(function (resolve, reject) {
        function onRealtimeWake(endTime) {
          if (!endTime) return reject("period endTime required for onRealtimeWake, got: " + endTime);
          return function () {
            var now = Date.now() / 1000.0 - sim.realtime;

            if (now >= endTime) {
              clearInterval(sim.realtimeIntervalId);
              delete sim.realtimeIntervalId;
              sim.pool.syncRun(endTime);
              return resolve(atEndOfPeriod());
            }

            sim.pool.syncRun(now);
          };
        }

        if (sim.realtimeIntervalId) {
          clearInterval(sim.realtimeIntervalId);
          return reject("sim has unexpected realtimeIntervalId");
        }
        /* adjust realtime offset */


        sim.realtime = Date.now() / 1000.0 - sim.pool.agents[0].period.startTime;
        /* run asynchronously, and in realtime, endTime() is called immediately and onRealtimeWake(...) returns actual handler function */

        sim.realtimeIntervalId = setInterval(onRealtimeWake(sim.pool.endTime()), 40);
      });
    }
    /**
     * Calculate simple maxGainsFromTrade() from simulation configuration buyerValues and sellerCosts
     * by sorting buyers' units high value first, and sellers' costs low value first, and adding profitable pairs
     * Slice and sort first to be robust against values/costs being unsorted.
     * This is currently used only for logging purposes.  No market or agent behavior should typically depend on this function.
     * @private
     */

  }, {
    key: "getMaximumPossibleGainsFromTrade",
    value: function getMaximumPossibleGainsFromTrade() {
      var sim = this;
      if (sim.maximumPossibleGainsFromTrade) return sim.maximumPossibleGainsFromTrade;
      var result = 0;

      if (Array.isArray(sim.config.buyerValues) && Array.isArray(sim.config.sellerCosts)) {
        var buyerV = sim.config.buyerValues.slice().sort(function (a, b) {
          return +b - a;
        });
        var sellerC = sim.config.sellerCosts.slice().sort(function (a, b) {
          return +a - b;
        });
        var i = 0;
        var l = Math.min(buyerV.length, sellerC.length);

        while (i < l && buyerV[i] > sellerC[i]) {
          result += buyerV[i] - sellerC[i];
          ++i;
        }
      }

      sim.maximumPossibleGainsFromTrade = result;
      return result;
    }
    /**
     * Perform end-of-period simulation logging of profits, open/high/low/close trade prices, etc.
     * called automatically
     * @private
     */

  }, {
    key: "logPeriod",
    value: function logPeriod() {
      var sim = this;
      var finalMoney = sim.pool.agents.map(function (A) {
        return A.inventory.money;
      });

      function ohlc() {
        var result = {
          caseid: sim.caseid,
          period: sim.period,
          beginTime: sim.period * sim.periodDuration,
          endTime: sim.potentialEndOfPeriod().endTime,
          endReason: sim.potentialEndOfPeriod().reason,
          volume: sim.periodTradePrices.length,
          gini: (0, _giniSs.default)(finalMoney)
        };

        if (sim.periodTradePrices.length > 0) {
          Object.assign(result, {
            openPrice: sim.periodTradePrices[0],
            highPrice: Math.max.apply(Math, _toConsumableArray(sim.periodTradePrices)),
            lowPrice: Math.min.apply(Math, _toConsumableArray(sim.periodTradePrices)),
            closePrice: sim.periodTradePrices[sim.periodTradePrices.length - 1],
            medianPrice: stats.median(sim.periodTradePrices),
            meanPrice: stats.mean(sim.periodTradePrices),
            sd: stats.stdev(sim.periodTradePrices),
            p25Price: stats.percentile(sim.periodTradePrices, 0.25),
            p75Price: stats.percentile(sim.periodTradePrices, 0.75)
          });
        }

        sim.logs.ohlc.submit(result, '');
      }

      if (sim.logs.profit) sim.logs.profit.write([sim.caseid, sim.period].concat(finalMoney));
      if (sim.logs.ohlc) ohlc();

      if (sim.logs.effalloc) {
        var finalMoneySum = 0.0;

        for (var i = 0, l = finalMoney.length; i < l; ++i) {
          finalMoneySum += finalMoney[i];
        }

        var maxPossible = sim.getMaximumPossibleGainsFromTrade();
        if (maxPossible > 0) sim.logs.effalloc.write([sim.caseid, sim.period, 100 * (finalMoneySum / maxPossible)]);
      }

      sim.periodTradePrices = [];
    }
    /**
     * called to log each compliant order
     *
     * @private
     */

  }, {
    key: "logOrder",
    value: function logOrder(prefix, orderArray) {
      var sim = this;
      var order = MEC.ao(orderArray);
      var agent = sim.pool.agentsById[order.id];
      var buyLog = prefix + 'buyorder';
      var sellLog = prefix + 'sellorder';
      var loggedProperties = {
        caseid: sim.caseid,
        period: sim.period
      };
      var marketProps = {
        preBidPrice: 'currentBidPrice',
        preAskPrice: 'currentAskPrice',
        preTradePrice: 'lastTradePrice'
      };
      Object.keys(marketProps).forEach(function (k) {
        var k2 = marketProps[k];
        loggedProperties[k] = typeof sim.xMarket[k2] === 'function' && sim.xMarket[k2]();
      });

      if (agent.inventory && order) {
        Object.assign(loggedProperties, {
          t: order.t,
          tp: order.t - sim.period * sim.periodDuration,
          id: order.id,
          x: agent.inventory.X
        });
      }

      if (agent && order.buyPrice && sim.logs[buyLog]) {
        Object.assign(loggedProperties, {
          buyLimitPrice: order.buyPrice,
          buyerValue: agent.unitValueFunction('X', agent.inventory),
          buyerAgentType: agent.constructor.name
        });
        sim.logs[buyLog].submit(loggedProperties, '');
      }

      if (agent && order.sellPrice && sim.logs[sellLog]) {
        Object.assign(loggedProperties, {
          sellLimitPrice: order.sellPrice,
          sellerCost: agent.unitCostFunction('X', agent.inventory),
          sellerAgentType: agent.constructor.name
        });
        sim.logs[sellLog].submit(loggedProperties, '');
      }
    }
    /**
     * called to log each trade in simulation
     * @private
     */

  }, {
    key: "logTrade",
    value: function logTrade(tradespec) {
      var sim = this;
      var idCol = sim.xMarket.o.idCol;
      /* istanbul ignore if */

      if (idCol === undefined) throw new Error("Simulation.prototype.logTrade: sim.xMarket.o.idCol is undefined"); // this is only sufficient for single unit trades

      if (tradespec.totalQ !== 1 || tradespec.buyA.length !== 1 || tradespec.sellA.length !== 1) throw new Error("Simulation.prototype.logTrade: single unit trades required, got: " + tradespec.totalQ);
      var buyerid = sim.xMarket.a[tradespec.buyA[0]][idCol];
      /* istanbul ignore if */

      if (buyerid === undefined) throw new Error("Simulation.prototype.logTrade: buyerid is undefined, tradespec=" + JSON.stringify(tradespec));
      var sellerid = sim.xMarket.a[tradespec.sellA[0]][idCol];
      /* istanbul ignore if */

      if (sellerid === undefined) throw new Error("Simulation.prototype.logTrade: sellerid is undefined, tradespec=" + JSON.stringify(tradespec));
      var tradePrice = tradespec.prices[0];
      if (!tradePrice) throw new Error("Simulation.prototype.logTrade: undefined price in trade ");
      var buyerAgent = sim.pool.agentsById[buyerid];
      var buyerAgentType = buyerAgent.constructor.name;
      var sellerAgent = sim.pool.agentsById[sellerid];
      var sellerAgentType = sellerAgent.constructor.name;
      var tradeBuyerValue = buyerAgent.unitValueFunction('X', buyerAgent.inventory);
      var tradeBuyerProfit = tradeBuyerValue - tradePrice;
      var tradeSellerCost = sellerAgent.unitCostFunction('X', sellerAgent.inventory);
      var tradeSellerProfit = tradePrice - tradeSellerCost;
      var tradeOutput = [sim.caseid, sim.period, tradespec.t, tradespec.t - sim.period * sim.periodDuration, tradePrice, buyerid, buyerAgentType, tradeBuyerValue, tradeBuyerProfit, sellerid, sellerAgentType, tradeSellerCost, tradeSellerProfit];
      sim.periodTradePrices.push(tradePrice);
      if (sim.logs.trade) sim.logs.trade.write(tradeOutput);
    }
    /**
     * run simulation
     * @param {Object} [options]
     * @param {boolean} [options.sync=false] true to run synchronously, returns simulation object (not a Promise)
     * @param {function(sim:Object)} [options.update]  update Optional end of period function
     * @param {number} [options.delay=20] delay timeout between periods in ms. Only effective in asynchronous mode.
     * @param {number} [options.deadline=0] deadline to compare with Date.now() -- If over deadline, return available data.  0 disables.
     * @return {Promise<Object,Error>} resolves to simulation object
     */

  }, {
    key: "run",
    value: function run(options) {
      var defaults = {
        sync: false,
        update: function update(s) {
          return s;
        },
        delay: 20,
        deadline: 0
      };

      var _Object$assign = Object.assign({}, defaults, options),
          sync = _Object$assign.sync,
          update = _Object$assign.update,
          delay = _Object$assign.delay,
          deadline = _Object$assign.deadline;

      var sim = this;
      var config = this.config;
      if (typeof update !== 'function') throw new Error("expected 'update' to be a function, got: " + _typeof(update));

      function forceFinish() {
        config.periodsRequested = config.periods;
        config.periods = sim.period;
      }
      /* istanbul ignore if */


      if (!config.silent) console.log("Periods = " + config.periods);

      if (sync) {
        while (sim.period < config.periods) {
          sim.runPeriod(true); // pass true to .runPeriod to run synchronously

          update(sim);
          if (deadline && Date.now() > deadline) forceFinish();
        }
        /* istanbul ignore if */


        if (!config.silent) console.log("done");
        return sim;
      }

      return new Promise(function (resolve, reject) {
        function loop() {
          sim.runPeriod().then(update).then(function (s) {
            if (deadline && Date.now() > deadline) forceFinish();
            return s.period < config.periods ? setTimeout(loop, delay) : resolve(s);
          }, function (e) {
            return reject(e);
          });
        }

        loop();
      });
    }
  }]);

  return Simulation;
}();
/* the next comment tells the coverage tester that the main() function is not tested by the test suite */

/* istanbul ignore next */


exports.Simulation = Simulation;

function main() {
  /**
   * in stand-alone mode, read simulation config from ./config.json and run simulation synchronously, outputting log files in .csv format
   */

  /* suggested by Krumia's http://stackoverflow.com/users/1461424/krumia */

  /* posting at http://stackoverflow.com/a/25710749/103081 */
  global.fs = fs;
  var simConfigFileName = process.argv.find(function (s) {
    return s.endsWith(".json");
  }) || "./config.json";

  function mainPeriod(sim) {
    fs.writeFileSync('./period', sim.period);
  }

  var config = JSON.parse(fs.readFileSync(simConfigFileName, 'utf8'));
  new Simulation(config).run({
    sync: true,
    update: mainPeriod
  });
}

if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object') {
  /* istanbul ignore if */
  if (require && require.main === module) main();
}
