/* eslint-env node, mocha */

/* eslint no-console: "off", newline-per-chained-call: "off" */

import '@babel/polyfill';
import assert from 'assert';
import 'should';
import * as singleMarketRobotSimulator from '../src/index.js';
import * as MEC from 'market-example-contingent';
import * as MarketAgents from 'market-agents';
import * as stats from 'stats-lite';
// import * as Joi from 'joi';

const { Simulation } = singleMarketRobotSimulator;
const { Pool, ZIAgent } = MarketAgents;

const tradeLogHeader = [
  'caseid',
  'period',
  't',
  'tp',
  'price',
  'buyerAgentId',
  'buyerAgentType',
  'buyerValue',
  'buyerProfit',
  'sellerAgentId',
  'sellerAgentType',
  'sellerCost',
  'sellerProfit'
];

const combinedOrderLogHeader = [
  'caseid',
  'period',
  't',
  'tp',
  'preBidPrice',
  'preAskPrice',
  'preTradePrice',
  'id',
  'x',
  'buyLimitPrice',
  'buyerValue',
  'buyerAgentType',
  'sellLimitPrice',
  'sellerCost',
  'sellerAgentType'
];

const gini = require("gini-ss");

/*
 * ohlcRestrict, tradesToPartialOHLC
 * Partial comparison made necessary by addition of beginTime, endTime, endReason columns to ohlc
 * which are not strictly dependent on the data in the trade log.
 */

function ohlcRestrict(ohlcData) {
  const ohlcHeader = singleMarketRobotSimulator.logHeaders.ohlc;
  const colsToRedact = ['beginTime', 'endTime', 'endReason'];
  const colNumsToRedact = colsToRedact.map((col) => (ohlcHeader.indexOf(col)));
  const data = [ohlcData[0].slice()];
  for (let i = 1, l = ohlcData.length;i < l;++i) {
    data[i] = ohlcData[i].slice();
    for (let j = 0, k = colNumsToRedact.length;j < k;++j) {
      data[i][colNumsToRedact[j]] = '?';
    }
  }
  return data;
}

function tradesToPartialOHLC(tradeDataReference, ids) {
  const ohlc = [];
  const ohlcHeader = singleMarketRobotSimulator.logHeaders.ohlc;
  const tradeData = tradeDataReference.slice(0);
  const tradeHeader = tradeData.shift();
  ohlc.push(ohlcHeader);
  const caseidCol = tradeHeader.indexOf('caseid');
  const periodCol = tradeHeader.indexOf('period');
  const caseid = tradeData[0][caseidCol];

  function finalMoney(trades) {
    const money = new Array(ids.length).fill(0);
    const [
      buyerProfitCol,
      sellerProfitCol,
      buyerAgentIdCol,
      sellerAgentIdCol
    ] = [
      'buyerProfit',
      'sellerProfit',
      'buyerAgentId',
      'sellerAgentId'
    ].map((s) => (tradeHeader.indexOf(s)));
    for (let i = 0, l = trades.length;i < l;++i) {
      let buyerSlot = ids.indexOf(trades[i][buyerAgentIdCol]);
      let sellerSlot = ids.indexOf(trades[i][sellerAgentIdCol]);
      if (buyerSlot === -1)
        throw new Error("tradesToOHLC: found unexpected buyerAgentId");
      if (sellerSlot === -1)
        throw new Error("tradesToOHLC: found unexpected sellerAgentId");
      money[buyerSlot] += trades[i][buyerProfitCol];
      money[sellerSlot] += trades[i][sellerProfitCol];
    }
    return money;
  }

  function process(period, trades) {
    const priceCol = tradeHeader.indexOf('price');
    const prices = trades.map((row) => (row[priceCol]));
    const result = {
      caseid,
      period,
      openPrice: prices[0],
      highPrice: Math.max(...prices),
      lowPrice: Math.min(...prices),
      closePrice: prices[prices.length - 1],
      volume: prices.length,
      medianPrice: stats.median(prices),
      meanPrice: stats.mean(prices),
      sd: stats.stdev(prices),
      p25Price: stats.percentile(prices, 0.25),
      p75Price: stats.percentile(prices, 0.75),
      gini: gini(finalMoney(trades))
    };

    function extractFromResult(s) {
      const v = result[s];
      return (v === undefined) ? '?' : v;
    }
    return ohlcHeader.map(extractFromResult);
  }
  let periodTradeData = [];
  let period = 0;
  for (let i = 0, l = tradeData.length;i < l;++i) {
    if (period !== tradeData[i][periodCol]) {
      if (periodTradeData.length) ohlc.push(process(period, periodTradeData));
      periodTradeData = [];
      period = tradeData[i][periodCol];
    }
    periodTradeData.push(tradeData[i]);
  }
  if (periodTradeData.length) ohlc.push(process(period, periodTradeData));
  return ohlc;
}

function addAllAgentsBidLTEQValueInOrderLogTest(S) {
  it("all agents bid <= value in order log", function () {
    const [buyLimitPriceCol, valueCol] = ['buyLimitPrice', 'buyerValue'].map((s) => (S.logs.buyorder.header.indexOf(s)));
    S.logs.buyorder.data.forEach((bo, j) => {
      if (j > 0) {
        bo[buyLimitPriceCol].should.be.above(0);
        bo[valueCol].should.be.above(0);
        bo[buyLimitPriceCol].should.be.belowOrEqual(bo[valueCol]);
      }
    });
  });
}

function addAllAgentsAskGTEQCostInOrderLogTest(S) {
  it("all agents ask >= cost in order log", function () {
    const [sellLimitPriceCol, costCol] = ['sellLimitPrice', 'sellerCost'].map((s) => (S.logs.sellorder.header.indexOf(s)));
    S.logs.sellorder.data.forEach((so, j) => {
      if (j > 0) {
        so[sellLimitPriceCol].should.be.above(0);
        so[costCol].should.be.above(0);
        so[sellLimitPriceCol].should.be.aboveOrEqual(so[costCol]);
      }
    });
  });
}

describe('logNames ', function () {
  it('should be defined', function () {
    singleMarketRobotSimulator.logNames.length.should.be.above(0);
  });
  it('should contain at least every key of logHeaders', function () {
    Object.keys(singleMarketRobotSimulator.logHeaders).forEach((k) => (assert.ok(singleMarketRobotSimulator.logNames.includes(k))));
  });
});

describe('logHeaders ', function () {
  it('should be defined', function () {
    Object.keys(singleMarketRobotSimulator.logHeaders).length.should.be.above(0);
  });
});

describe('trade log header ', function () {
  it('should contain expected fields', function () {
    singleMarketRobotSimulator.logHeaders.trade.should.deepEqual(tradeLogHeader);
  });
});

describe('order log headers ', function () {
  it('should contain expected fields', function () {
    (singleMarketRobotSimulator
      .logNames
      .filter((n) => (n.includes("order")))
      .map((n) => (singleMarketRobotSimulator.logHeaders[n]))
      .forEach((h) => (h.should.deepEqual(combinedOrderLogHeader)))
    );
  });
});

describe('blank Simulation not allowed', function () {

  delete global.fs;
  it('new Simulation({}) with empty config {} should throw error', function () {
    function simulationWithOmittedOptions() {
      let S = new Simulation({}); // eslint-disable-line no-unused-vars
    }
    simulationWithOmittedOptions.should.throw();
  });
});

describe('simulation with values [10,9,8] all below costs [20,40]', function () {

  // setting buyerRate to [1.0,1.0] should detect if there is some problem using arrays without affecting math tests

  let configCostsExceedValues = {
    L: 1,
    H: 100,
    buyerValues: [10, 9, 8],
    sellerCosts: [20, 40],
    buyerAgentType: ["ZIAgent"],
    sellerAgentType: ["ZIAgent"],
    buyerRate: [1.0, 1.0],
    sellerRate: 1.0,
    silent: 1,
    caseid: 1234,
    periodDuration: 1000,
    tradeClock: 500,
    xMarket: {
      buyImprove: 1,
      sellImprove: 1
    }
  };
  describe('on new Simulation', function () {
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
    it('should have properties ' + props.join(","), function () {
      S.should.have.properties(props);
    });
    it('should set .config properly', function () {
      assert.ok(S.config === configCostsExceedValues);
    });
    it('should set .numberOfBuyers to 3', function () {
      S.numberOfBuyers.should.equal(3);
    });
    it('should set .numberOfSellers to 2', function () {
      S.numberOfSellers.should.equal(2);
    });
    it('should set .numberOfAgents to 5', function () {
      S.numberOfAgents.should.equal(5);
    });
    it('should set .caseid to 1234', function () {
      S.caseid.should.equal(1234);
    });
    let logsProps = ['trade', 'buyorder', 'sellorder', 'rejectbuyorder', 'rejectsellorder', 'profit', 'ohlc', 'effalloc'];
    it('.logs should have properties ' + logsProps.join(','), function () {
      S.logs.should.have.properties(logsProps);
    });
    it('trade, buyorder, sellorder, ohlc, profit logs have header rows', function () {
      let withHeaderRow = ['trade', 'buyorder', 'sellorder', 'ohlc', 'effalloc', 'profit'];
      withHeaderRow.forEach(function (prop) { S.logs[prop].data.length.should.equal(1); });
      S.logs.trade.data[0].should.deepEqual(tradeLogHeader);
      S.logs.buyorder.data[0].should.deepEqual(combinedOrderLogHeader);
      S.logs.sellorder.data[0].should.deepEqual(combinedOrderLogHeader);
      S.logs.rejectbuyorder.data[0].should.deepEqual(combinedOrderLogHeader);
      S.logs.rejectsellorder.data[0].should.deepEqual(combinedOrderLogHeader);
      S.logs.profit.data[0].should.deepEqual(['caseid', 'period', 'y1', 'y2', 'y3', 'y4', 'y5']);
    });
    it('.pool should be an instance of Pool containing 5 (ZI) agents with .bidPrice and .askPrice functions', function () {
      S.pool.should.be.an.instanceOf(Pool);
      S.pool.agents.length.should.equal(5);
      S.pool.agents.forEach(function (A) {
        A.should.be.an.instanceOf(ZIAgent).and.have.properties('bidPrice', 'askPrice');
      });
    });
    it('.pool agent ids should be 1,2,3,4,5', function () {
      S.pool.agents.map((a) => (a.id)).should.deepEqual([1, 2, 3, 4, 5]);
    });
    it('.buyersPool should be an instance of Pool containing 3 agents', function () {
      S.buyersPool.should.be.an.instanceOf(Pool);
      S.buyersPool.agents.length.should.equal(3);
    });
    it('.buyersPool agent ids should be 1,2,3', function () {
      S.buyersPool.agents.map((a) => (a.id)).should.deepEqual([1, 2, 3]);
    });
    it('.sellersPool should be an instance of Pool containing 2 agents', function () {
      S.sellersPool.should.be.an.instanceOf(Pool);
      S.sellersPool.agents.length.should.equal(2);
    });
    it('.sellersPool agent ids should be 4,5', function () {
      S.sellersPool.agents.map((a) => (a.id)).should.deepEqual([4, 5]);
    });
    it('.period should be zero', function () {
      S.period.should.equal(0);
    });
    it('.periodDuration should be 1000 (default)', function () {
      S.periodDuration.should.equal(1000);
    });
    it('getMaximumPossibleGainsFromTrade() should be 0, and set sim.maximumPossibleGainsFromTrade', function () {
      S.getMaximumPossibleGainsFromTrade().should.equal(0);
      S.maximumPossibleGainsFromTrade.should.equal(0);
    });
  });

  function testsForConfigCostsExceedValues(state) {
    it('should increment .period', function () {
      state.S.period.should.equal(1);
    });
    it('should have property xMarket -- an instance of Market', function () {
      state.S.should.have.property('xMarket');
      state.S.xMarket.should.be.instanceOf(MEC.Market);
    });
    it('the buyorder logs, including rejects, should have the header row and between ~1310 and ~1690 orders (5 sigma, poisson 0.5*3*1000)', function () {
      state.S.logs.buyorder.data[0].should.deepEqual(combinedOrderLogHeader);
      state.S.logs.rejectbuyorder.data[0].should.deepEqual(combinedOrderLogHeader);
      const total = state.S.logs.buyorder.data.length + state.S.logs.rejectbuyorder.data.length;
      total.should.be.within(1310, 1690);
    });
    it('the sellorder logs, including rejects, should have the header row and between ~842 and ~1158 orders (5 sigma, poisson 0.5*2*1000)', function () {
      state.S.logs.sellorder.data[0].should.deepEqual(combinedOrderLogHeader);
      state.S.logs.rejectsellorder.data[0].should.deepEqual(combinedOrderLogHeader);
      const total = state.S.logs.sellorder.data.length + state.S.logs.rejectsellorder.data.length;
      total.should.be.within(842, 1158);
    });

    /*
     * Buy order log and sell order log need to have no "undefined" values.  Blank string is OK for "not applicable"
     *
     */

    it('buy order log defines all non-market, non-sell fields on every row', function () {
      state.S.logs.buyorder.data.forEach((row, j) => {
        if (j > 0) {
          row.length.should.equal(combinedOrderLogHeader.length);
          combinedOrderLogHeader.forEach((headerItem, idx) => {
            if (headerItem.startsWith("pre")) return;
            const v = row[idx];
            const t = typeof(v);
            if (headerItem.includes("sell")) {
              assert.ok(v === '', `unexpected non-blank value ${v} for column ${headerItem}`);
            } else {
              const ok = ((t === 'string') && (v.length)) || ((t === 'number') && (v >= 0));
              assert.ok(ok, `unexpected value ${v} for column ${headerItem}`);
            }
          });
        }
      });
    });
    it('sell order log defines all non-market, non-buy fields on every row', function () {
      state.S.logs.sellorder.data.forEach((row, j) => {
        if (j > 0) {
          row.length.should.equal(combinedOrderLogHeader.length);
          combinedOrderLogHeader.forEach((headerItem, idx) => {
            if (headerItem.startsWith("pre")) return;
            const v = row[idx];
            const t = typeof(v);
            if (headerItem.includes("buy")) {
              assert.ok(v === '', `unexpected non-blank value ${v} for column ${headerItem}`);
            } else {
              const ok = ((t === 'string') && (v.length)) || ((t === 'number') && (v >= 0));
              assert.ok(ok, `unexpected value ${v} for column ${headerItem}`);
            }
          });
        }
      });
    });
    it('buyorderlog has caseid 1234', function () {
      const caseidCol = combinedOrderLogHeader.indexOf('caseid');
      assert.ok(caseidCol >= 0);
      state.S.logs.buyorder.data.forEach((row, j) => {
        if (j > 0) {
          row[caseidCol].should.equal(1234);
        }
      });
    });
    it('sellorderlog has caseid 1234', function () {
      const caseidCol = combinedOrderLogHeader.indexOf('caseid');
      assert.ok(caseidCol >= 0);
      state.S.logs.sellorder.data.forEach((row, j) => {
        if (j > 0) {
          row[caseidCol].should.equal(1234);
        }
      });
    });
    it('buyorderlog has buyerAgentType ZIAgent', function () {
      const batCol = combinedOrderLogHeader.indexOf('buyerAgentType');
      assert.ok(batCol >= 0);
      state.S.logs.buyorder.data.forEach((row, j) => {
        if (j > 0) {
          row[batCol].should.equal('ZIAgent');
        }
      });
    });
    it('sellorderlog has sellerAgentType ZIAgent', function () {
      const satCol = combinedOrderLogHeader.indexOf('sellerAgentType');
      assert.ok(satCol >= 0);
      state.S.logs.sellorder.data.forEach((row, j) => {
        if (j > 0) {
          row[satCol].should.equal('ZIAgent');
        }
      });
    });
    it('buyorderlog has correct buyerValue for id and buyLimitPrice <= buyerValue', function () {
      const idCol = combinedOrderLogHeader.indexOf('id');
      const bvCol = combinedOrderLogHeader.indexOf('buyerValue');
      const blpCol = combinedOrderLogHeader.indexOf('buyLimitPrice');
      state.S.logs.buyorder.data.forEach((row, j) => {
        if (j > 0) {
          row[bvCol].should.equal(11 - row[idCol]);
          row[blpCol].should.be.above(0);
          row[blpCol].should.be.belowOrEqual(row[bvCol]);
        }
      });
    });
    it('sellorderlog has correct sellerCost for id and sellLimitPrice >= sellerCost', function () {
      const idCol = combinedOrderLogHeader.indexOf('id');
      const scCol = combinedOrderLogHeader.indexOf('sellerCost');
      const slpCol = combinedOrderLogHeader.indexOf('sellLimitPrice');
      const costs = [0, 0, 0, 0, 20, 40];
      state.S.logs.sellorder.data.forEach((row, j) => {
        if (j > 0) {
          row[idCol].should.be.above(3);
          row[idCol].should.be.below(6);
          row[scCol].should.equal(costs[+row[idCol]]);
          row[slpCol].should.be.above(0);
          row[slpCol].should.be.aboveOrEqual(row[scCol]);
        }
      });
    });
    it('buyorderlog,sellorderlog have weakly ascending t,tp,preBidPrice', function () {
      ['buyorder', 'sellorder'].forEach((log) => {
        ['t', 'tp', 'preBidPrice'].forEach((prop) => {
          const col = combinedOrderLogHeader.indexOf(prop);
          assert.ok(col >= 0);
          for (let i = 2, l = state.S.logs[log].data.length;i < l;++i) {
            let current = state.S.logs[log].data[i][col];
            let prev = state.S.logs[log].data[i - 1][col];
            assert.ok(current >= prev, `${log} ${prop} decreased from ${prev} to ${current} at ${i}`);
          }
        });
      });
    });
    it('buyorderlog,sellorderlog have weakly descending preAskPrice', function () {
      const col = combinedOrderLogHeader.indexOf('preAskPrice');
      assert.ok(col >= 0);
      ['buyorder', 'sellorder'].forEach((log) => {
        for (let i = 2, l = state.S.logs[log].data.length;i < l;++i) {
          let current = state.S.logs[log].data[i][col];
          let prev = state.S.logs[log].data[i - 1][col];
          if ((typeof(prev) === 'number') && (!Number.isNaN(prev))) {
            assert.ok(current <= prev, `${log} preAskPrice increased from ${prev} to ${current} at ${i}`);
          }
        }
      });
    });
    it('buyorderlog shows preBidPrice reacting to previous buyLimitPrice', function () {
      const pbpCol = combinedOrderLogHeader.indexOf('preBidPrice');
      const blpCol = combinedOrderLogHeader.indexOf('buyLimitPrice');
      assert.ok(pbpCol >= 0);
      assert.ok(blpCol >= 0);
      for (let i = 2, l = state.S.logs.buyorder.data.length;i < l;++i) {
        let prev = state.S.logs.buyorder.data[i - 1];
        let predicted = Math.max(prev[pbpCol], prev[blpCol]);
        assert.ok(typeof(predicted) === 'number', typeof(predicted));
        assert.ok(!Number.isNaN(predicted));
        state.S.logs.buyorder.data[i][pbpCol].should.equal(predicted);
      }
    });
    it('sellorderlog shows preAskPrice reacting to previous sellLimitPrice', function () {
      const papCol = combinedOrderLogHeader.indexOf('preAskPrice');
      const slpCol = combinedOrderLogHeader.indexOf('sellLimitPrice');
      assert.ok(papCol >= 0);
      assert.ok(slpCol >= 0);
      for (let i = 2, l = state.S.logs.sellorder.data.length;i < l;++i) {
        let prev = state.S.logs.sellorder.data[i - 1];
        let predicted = Math.min(+prev[papCol] || +Infinity, +prev[slpCol] || +Infinity);
        assert.ok(typeof(predicted) === 'number', typeof(predicted));
        assert.ok(!Number.isNaN(predicted));
        state.S.logs.sellorder.data[i][papCol].should.equal(predicted);
      }
    });

    it('the trade log should have one entry, the header row', function () {
      state.S.logs.trade.data.length.should.be.equal(1);
      state.S.logs.trade.data[0].should.deepEqual(tradeLogHeader);
    });
    it('the profit log should have one entry equal to [1234,1,0,0,0,0,0]', function () {
      state.S.logs.profit.data.length.should.be.equal(2);
      state.S.logs.profit.data[1].should.deepEqual([1234, 1, 0, 0, 0, 0, 0]);
    });
    it('the ohlc log should have one entry', function () {
      state.S.logs.ohlc.data.length.should.equal(2);
      state.S.logs.ohlc.data[1].should.deepEqual([
        1234,
        1,
        1000,
        1500,
        1,
        '',
        '',
        '',
        '',
        0,
        '',
        '',
        '',
        '',
        '',
        0
      ]);
    });
    it('the effalloc log should have only the header row and no entries, because 0/0 is not reported', function () {
      state.S.logs.effalloc.data.length.should.equal(1);
    });
    it('.logTrade({totalQ:2}) should throw because of single unit trade requirement', function () {
      function logTwoUnitTrade() { state.S.logTrade({ totalQ: 2 }); }
      logTwoUnitTrade.should.throw();
    });
//    testForTypicalOrderBooks(state);
    it('xMarket is defined', function(){
      assert.ok(state.S.xMarket!==undefined,"xMarket undefined");
    });
    it('the buy book should be non-empty', function(){
      state.S.xMarket.book.buy.idx.length.should.be.above(0);
    });
    it('the sell book should be non-empty', function(){
      state.S.xMarket.book.sell.idx.length.should.be.above(0);
    });
    it('the buyStop book should be empty', function(){
      state.S.xMarket.book.buyStop.idx.length.should.equal(0);
    });
    it('the sellStop book should be empty', function(){
      state.S.xMarket.book.sellStop.idx.length.should.equal(0);
    });
  }

  describe('runPeriod({sync:true})', function () {

    /* runPeriod({sync:true}) is synchronous */

    let mySim = new Simulation(configCostsExceedValues);
    let sim = mySim.runPeriod({ sync: true });
    it('should modify in place and return the original simulation object', function () {
      assert.ok(mySim === sim);
    });
    testsForConfigCostsExceedValues({ S: mySim });
  });

  describe('runPeriod() runs asynchronously', function () {
    it('immediate inspection of order logs should only have length 1 from header row', function (done) {
      let mySim = new Simulation(configCostsExceedValues);
      (mySim
        .runPeriod()
        .then(
          function () {
            done();
          })
        .catch(
          function (e) {
            assert.ok(false, e);
          })
      );
      mySim.logs.buyorder.data.length.should.equal(1);
      mySim.logs.sellorder.data.length.should.equal(1);
    });
    describe('when done should pass same tests', function () {
      let state = {};
      before(function (done) {
        let mySim = new Simulation(configCostsExceedValues);

        function callback(S) {
          state.S = S;
          done();
        }
        (mySim
          .runPeriod()
          .then(callback,
            function (e) {
              throw e;
            })
        );
      });
      testsForConfigCostsExceedValues(state);
    });
  });
});

describe('simulation with single unit trade, value [1000], costs [1]', function () {

  let configSingleUnitTrade = {
    L: 1,
    H: 1000,
    buyerValues: [1000],
    sellerCosts: [1],
    buyerAgentType: ["ZIAgent"],
    sellerAgentType: ["ZIAgent"],
    caseid: 7890,
    silent: 1
  };

  describe('on new Simulation', function () {
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
      'periodDuration',
      'caseid'
    ];
    it('should have properties ' + props.join(","), function () {
      S.should.have.properties(props);
    });
    it('should set .config properly', function () {
      assert.ok(S.config === configSingleUnitTrade);
    });
    it('should set .numberOfBuyers to 1', function () {
      S.numberOfBuyers.should.equal(1);
    });
    it('should set .numberOfSellers to 1', function () {
      S.numberOfSellers.should.equal(1);
    });
    it('should set .numberOfAgents to 2', function () {
      S.numberOfAgents.should.equal(2);
    });
    it('should set .caseid to 7890', function () {
      S.caseid.should.equal(7890);
    });
    let logsProps = ['trade', 'buyorder', 'sellorder', 'profit', 'ohlc'];
    it('.logs should have properties ' + logsProps.join(','), function () {
      S.logs.should.have.properties(logsProps);
    });
    it('.pool should be an instance of Pool containing 2 (ZI) agents with .bidPrice and .askPrice functions', function () {
      S.pool.should.be.an.instanceOf(Pool);
      S.pool.agents.length.should.equal(2);
      S.pool.agents.forEach(function (A) {
        A.should.be.an.instanceOf(ZIAgent).and.have.properties('bidPrice', 'askPrice');
      });
    });
    it('ids of agents in .pool should be [1,2]', function () {
      S.pool.agents.map((a) => (a.id)).should.deepEqual([1, 2]);
    });
    it('.buyersPool should be an instance of Pool containing 1 agents', function () {
      S.buyersPool.should.be.an.instanceOf(Pool);
      S.buyersPool.agents.length.should.equal(1);
    });
    it('.buyersPool should have an agent with id 1', function () {
      S.buyersPool.agents.map((a) => (a.id)).should.deepEqual([1]);
    });
    it('.sellersPool should be an instance of Pool containing 1 agents', function () {
      S.sellersPool.should.be.an.instanceOf(Pool);
      S.sellersPool.agents.length.should.equal(1);
    });
    it('.sellersPool should have an agent with id 2', function () {
      S.sellersPool.agents.map((a) => (a.id)).should.deepEqual([2]);
    });
    it('.period should be zero', function () {
      S.period.should.equal(0);
    });
    it('.periodDuration should be 1000 (default)', function () {
      S.periodDuration.should.equal(1000);
    });
    it('.getMaxPossibleGainsFromTrade() should equal 999', function () {
      S.getMaximumPossibleGainsFromTrade().should.equal(999);
    });
  });

  function testsForConfigSingleUnitTrade(state) {
    it('should increment .period', function () {
      state.S.period.should.equal(1);
    });
    it('should have property xMarket -- an instance of Market', function () {
      state.S.should.have.property('xMarket');
      state.S.xMarket.should.be.instanceOf(MEC.Market);
    });
    it('should set .bid and .ask function for each agent', function () {
      state.S.pool.agents.forEach(function (A) {
        assert.strictEqual(typeof(A.bid), 'function');
        assert.strictEqual(typeof(A.ask), 'function');
      });
    });
    it('the order logs should show caseid 7890', function () {
      ['buyorder', 'sellorder'].forEach((l) => {
        const caseIdCol = combinedOrderLogHeader.indexOf('caseid');
        assert.ok(caseIdCol >= 0);
        state.S.logs[l].data.forEach((row, j) => {
          if (j === 0) {
            row[caseIdCol].should.equal("caseid");
          } else {
            row[caseIdCol].should.equal(7890);
          }
        });
      });
    });
    it('the buy order log should show the buyerAgentType is ZIAgent and the sellerAgentType is blank', function () {
      const batCol = combinedOrderLogHeader.indexOf("buyerAgentType");
      assert.ok(batCol >= 0);
      const satCol = combinedOrderLogHeader.indexOf("sellerAgentType");
      assert.ok(satCol >= 0);
      state.S.logs.buyorder.data.forEach((row, j) => {
        if (j === 0) {
          assert.equal(row[batCol], "buyerAgentType");
          assert.equal(row[satCol], "sellerAgentType");
        } else {
          assert.equal(row[batCol], "ZIAgent");
          assert.equal(row[satCol], '');
        }
      });
    });
    it('the sell order log should show the buyerAgentType is blank and the sellerAgentType is ZIAgent', function () {
      const batCol = combinedOrderLogHeader.indexOf("buyerAgentType");
      assert.ok(batCol >= 0);
      const satCol = combinedOrderLogHeader.indexOf("sellerAgentType");
      assert.ok(satCol >= 0);
      state.S.logs.sellorder.data.forEach((row, j) => {
        if (j === 0) {
          assert.equal(row[batCol], "buyerAgentType");
          assert.equal(row[satCol], "sellerAgentType");
        } else {
          assert.equal(row[batCol], "");
          assert.equal(row[satCol], 'ZIAgent');
        }
      });
    });
    it('the order logs should have at most ~2225 orders (5 sigma, poisson 2000, but will exhaust sooner by trade)', function () {
      let numberOfOrders =
        state.S.logs.buyorder.data.length + state.S.logs.sellorder.data.length;
      numberOfOrders.should.be.below(2225);
    });
    it('the trade log should have two entrys, the header row plus a trade', function () {
      state.S.logs.trade.data.length.should.equal(2);
      state.S.logs.trade.data[0].should.deepEqual(tradeLogHeader);
      state.S.logs.trade.data[1].should.not.deepEqual(tradeLogHeader);
      state.S.logs.trade.data[1].length.should.equal(state.S.logs.trade.data[0].length);
    });
    it('the tradelog should report caseid 7890', function () {
      state.S.logs.trade.lastByKey('caseid').should.equal(7890);
    });
    it('the tradelog should report period 1', function () {
      state.S.logs.trade.lastByKey('period').should.equal(1);
    });
    it('the tradelog should report a trade price between 1 and 1000', function () {
      let priceCol = tradeLogHeader.indexOf("price");
      state.S.logs.trade.data[1][priceCol].should.be.within(1, 1000);
    });
    it('the tradelog should report the correct buyerAgentId', function () {
      let buyerId = state.S.buyersPool.agents[0].id;
      let col = tradeLogHeader.indexOf("buyerAgentId");
      let tradeLogBuyerId = state.S.logs.trade.data[1][col];
      assert.ok(tradeLogBuyerId === buyerId);
    });
    it('the tradelog should report the correct buyerAgentType', function () {
      state.S.logs.trade.lastByKey('buyerAgentType').should.equal("ZIAgent");
    });
    it('the tradelog should report the correct buyerValue', function () {
      let col = tradeLogHeader.indexOf("buyerValue");
      state.S.logs.trade.data[1][col].should.equal(1000);
    });
    it('the tradelog should report the correct buyerProfit', function () {
      let buyerProfitCol = tradeLogHeader.indexOf("buyerProfit");
      let priceCol = tradeLogHeader.indexOf("price");
      state.S.logs.trade.data[1][buyerProfitCol].should.equal(1000 - state.S.logs.trade.data[1][priceCol]);
    });
    it('the tradelog should report the correct sellerAgentId', function () {
      let sellerId = state.S.sellersPool.agents[0].id;
      let col = tradeLogHeader.indexOf("sellerAgentId");
      let tradeLogSellerId = state.S.logs.trade.data[1][col];
      assert.ok(tradeLogSellerId === sellerId);
    });
    it('the tradelog should report the correct sellerAgentType', function () {
      state.S.logs.trade.lastByKey('sellerAgentType').should.equal("ZIAgent");
    });
    it('the tradelog should report the correct seller cost', function () {
      let col = tradeLogHeader.indexOf("sellerCost");
      state.S.logs.trade.data[1][col].should.equal(1);
    });
    it('the tradelog should report the correct seller profit', function () {
      let sellerProfitCol = tradeLogHeader.indexOf("sellerProfit");
      let priceCol = tradeLogHeader.indexOf("price");
      state.S.logs.trade.data[1][sellerProfitCol].should.equal(state.S.logs.trade.data[1][priceCol] - 1);
    });
    it('the buyorderlog,sellorderlog should report blank preTradePrice before the event', function () {
      // note that there are no are more orders once the single trade has occurred
      // because each agent has only one value or cost
      const tradeTime = state.S.logs.trade.lastByKey("t");
      const tCol = combinedOrderLogHeader.indexOf('t');
      const ptpCol = combinedOrderLogHeader.indexOf('preTradePrice');
      assert.ok(tradeTime > 0);
      assert.ok(tCol >= 0);
      assert.ok(ptpCol >= 0);
      ['buyorder', 'sellorder'].forEach((log) => {
        let before = 0;
        let after = 0;
        state.S.logs[log].data.forEach((row, j) => {
          if (j > 0) {
            const t = row[tCol];
            assert.ok(typeof(t) === 'number');
            assert.ok(!Number.isNaN(t));
            const preTradePrice = row[ptpCol];
            if (t <= tradeTime) {
              before++;
              preTradePrice.should.equal('');
            } else {
              after++;
            }
          }
        });
        before.should.be.above(0);
        after.should.equal(0);
      });
    });
    it('the profit log should have one entry equal to [1000-p,p-1]', function () {
      let p = state.S.logs.trade.data[1][tradeLogHeader.indexOf("price")];
      let correctProfits = [1000 - p, p - 1];
      state.S.logs.profit.data.length.should.be.equal(2);
      state.S.logs.profit.data[1].should.deepEqual([7890, 1].concat(correctProfits));
    });
    it('the ohlc log should have header plus one entry, with all price stats equal to single trade price', function () {
      let p = state.S.logs.trade.data[1][tradeLogHeader.indexOf("price")];
      let correctOHLC = {
        caseid: 7890,
        period: 1,
        open: p,
        high: p,
        low: p,
        close: p,
        volume: 1,
        p25: p,
        median: p,
        p75: p,
        mean: p,
        gini: gini(state.S.logs.profit.last.slice(2))
      };
      state.S.logs.ohlc.data.length.should.equal(2);
      state.S.logs.ohlc.header.forEach(function (prop) {
        if (prop in correctOHLC) {
          state.S.logs.ohlc.lastByKey(prop).should.be.approximately(correctOHLC[prop], 0.000001);
        }
      });
    });
    it('the effalloc log should have header plus one entry, [1,100]', function () {
      state.S.logs.effalloc.data.length.should.equal(2);
      state.S.logs.effalloc.data[1].should.deepEqual([7890, 1, 100]);
    });
    it('xMarket is defined', function(){
      assert.ok(state.S.xMarket!==undefined,"xMarket undefined");
    });
    it('the buy book should be empty', function(){
      state.S.xMarket.book.buy.idx.length.should.be.equal(0);
    });
    it('the sell book should be empty', function(){
      state.S.xMarket.book.sell.idx.length.should.be.equal(0);
    });
    it('the buyStop book should be empty', function(){
      state.S.xMarket.book.buyStop.idx.length.should.equal(0);
    });
    it('the sellStop book should be empty', function(){
      state.S.xMarket.book.sellStop.idx.length.should.equal(0);
    });
  }

  describe('runPeriod()', function () {

    /* runPeriod(true) is synchronous */

    let mySim = new Simulation(configSingleUnitTrade);
    let sim = mySim.runPeriod(true);
    it('should modify in place and return the original simulation object', function () {
      assert.ok(mySim === sim);
    });
    testsForConfigSingleUnitTrade({ S: mySim });
  });

  describe('runPeriod() runs asynchronously', function () {
    describe('and returns a promise ', function () {
      it('order logs should have length 1 (header)', function (done) {
        let mySim = new Simulation(configSingleUnitTrade);
        (mySim
          .runPeriod()
          .then(() => (done()))
        );
        mySim.logs.buyorder.data.length.should.equal(1);
        mySim.logs.sellorder.data.length.should.equal(1);
      });
    });
    describe('when done should pass same tests as runPeriod()', function () {
      let state = {};
      beforeEach(function (done) {
        let mySim = new Simulation(configSingleUnitTrade);
        mySim.runPeriod().then(function (S) {
          state.S = S;
          done();
        });
      });
      testsForConfigSingleUnitTrade(state);
    });
  });

  function testsForRunSimulationSingleTradeTenPeriods(state) {
    it('.pool agent ids should be [1,2]', function () {
      state.S.pool.agents.map((a) => (a.id)).should.deepEqual([1, 2]);
    });
    it('.buyersPool agent ids should be [1]', function () {
      state.S.buyersPool.agents.map((a) => (a.id)).should.deepEqual([1]);
    });
    it('.sellersPool agent ids should be [2]', function () {
      state.S.sellersPool.agents.map((a) => (a.id)).should.deepEqual([2]);
    });
    it('.period should be 10', function () {
      state.S.period.should.equal(10);
    });
    it('should have property xMarket -- an instance of Market', function () {
      state.S.should.have.property('xMarket');
      state.S.xMarket.should.be.instanceOf(MEC.Market);
    });
    it('the buy and sell order logs should have between 10 orders and 1000 orders', function () {

      /* 10 because we need 10 orders each side for 10 trades, 1000 tops is ad hoc but unlikely to be exceeded */

      state.S.logs.buyorder.data.length.should.be.within(10, 1000);
      state.S.logs.sellorder.data.length.should.be.within(10, 1000);
    });
    it('tp should equal t % periodDuration in all logs having t and tp fields', function () {
      let tested = 0;
      (Object
        .keys(state.S.logs)
        .filter(function (log) {
          let header = state.S.logs[log].data[0];
          return (header.includes('t')) && (header.includes('tp'));
        })
        .forEach(function (log) {
          let data = state.S.logs[log].data;
          let tCol = data[0].indexOf('t');
          let tpCol = data[0].indexOf('tp');
          let i, l, row;
          for (i = 1, l = data.length;i < l;++i) {
            row = data[i];
            row[tpCol].should.be.type('number');
            row[tCol].should.be.type('number');
            row[tpCol].should.equal(row[tCol] % state.S.periodDuration);
            if (row[tCol] !== row[tpCol]) tested++;
          }
        })
      );
      tested.should.be.above(9);
    });
    it('the trade log should have 11 entries, the header row plus 10 trades, exactly 1 trade per period', function () {
      state.S.logs.trade.data.length.should.equal(11);
      state.S.logs.trade.data[0].should.deepEqual(tradeLogHeader);
      const periodCol = tradeLogHeader.indexOf("period");
      state.S.logs.trade.data.forEach(function (row, i) { if (i > 0) row[periodCol].should.equal(i); });
    });
    it('the period profit log should have 10 entries, each with y1 and y2 that sum to 999', function () {
      const expectedCaseid = state.S.caseid;
      assert.ok(expectedCaseid !== undefined);
      state.S.logs.profit.data.forEach(function (row, j) {
        if (j === 0)
          row.should.deepEqual(['caseid', 'period', 'y1', 'y2']);
        else {
          const [caseid, period, y1, y2] = row;
          assert.equal(caseid, expectedCaseid);
          assert.equal(period, j);
          assert.equal(y1 + y2, 999);
        }
      });
    });
    it('the ohlc log should have 11 entries, header + 1 trade per period', function () {
      state.S.logs.ohlc.data.length.should.equal(11);
    });
    it('the ohlc log data should agree with the trade log data', function () {
      (ohlcRestrict(state.S.logs.ohlc.data)
        .should
        .deepEqual(
          tradesToPartialOHLC(state.S.logs.trade.data,
            state.S.pool.agents.map((a) => (a.id))
          )
        )
      );
    });
    it('the effalloc log should have 11 entries, header + 1 per period, showing eff=100 percent', function () {
      const cid = state.S.caseid;
      state.S.logs.effalloc.data.length.should.equal(11);
      state.S.logs.effalloc.data.slice(1).should.deepEqual([
        [cid, 1, 100],
        [cid, 2, 100],
        [cid, 3, 100],
        [cid, 4, 100],
        [cid, 5, 100],
        [cid, 6, 100],
        [cid, 7, 100],
        [cid, 8, 100],
        [cid, 9, 100],
        [cid, 10, 100]
      ]);
    });
  }

  describe('runSimulation with 10 periods of single unit trade scenario, synchronous', function () {
    let config = Object.assign({}, configSingleUnitTrade, { periods: 10 });
    let S = new Simulation(config).run({ sync: true });
    testsForRunSimulationSingleTradeTenPeriods({ S });
  });

  describe('run Simulation with 10 periods of single unit trade scenario, asyncrhonous', function () {
    let config = Object.assign({}, configSingleUnitTrade, { periods: 10 });
    describe('order log should be header only', function () {
      it('order logs should have length 1', function (done) {
        let S = new Simulation(config);
        S.run().then(function () { done(); }).catch(function (e) { throw e; });
        S.logs.buyorder.data.length.should.equal(1);
        S.logs.sellorder.data.length.should.equal(1);
      });
    });
    describe('when done should pass same tests as above ', function () {
      let state = {};
      beforeEach(function (done) {
        new Simulation(config).run().then(function (S) {
          state.S = S;
          done();
        }, function (e) { assert.ok(false, e); });
      });
      testsForRunSimulationSingleTradeTenPeriods(state);
    });
  });

  describe('deadline: run Simulation sync:true with immediate deadline, request 10 periods of single unit trade scenario only yields one period', function () {
    let config = Object.assign({}, configSingleUnitTrade, { periods: 10 });
    let S = new Simulation(config).run({ sync: true, deadline: Date.now() });
    it("sim.config.periods should be reduced to 1 period", function () {
      S.config.periods.should.equal(1);
    });
    it('sim.config.periodsRequested should equal 10', function () {
      S.config.periodsRequested.should.equal(10);
    });
  });

  describe('deadline: run Simulation sync:false with immediate deadline, request 10 periods also runs one period', function () {
    let config = Object.assign({}, configSingleUnitTrade, { periods: 10 });
    let S;
    before(function (done) {
      S = new Simulation(config);
      S.run({ sync: false, deadline: Date.now() }).then(() => (done()), (e) => (done(e)));
    });
    it("sim.config.periods should be reduced to 1 period", function () {
      S.config.periods.should.equal(1);
    });
    it('sim.config.periodsRequested should equal 10', function () {
      S.config.periodsRequested.should.equal(10);
    });
  });

  describe('runSimulation with three simulations of 10 periods of single unit trade scenario, asynchronous', function () {
    let configA = Object.assign({}, configSingleUnitTrade, { periods: 10 });
    let configB = Object.assign({}, configSingleUnitTrade, { periods: 10 });
    let configC = Object.assign({}, configSingleUnitTrade, { periods: 10 });
    describe('when done should pass same tests as above ', function () {
      let states = [{}, {}, {}];
      // run the setup once before all the tests, not before each test
      before(function (done) {
        let count = 0;

        function callback(S) {
          states[count].S = S;
          count++;
          if (count === 3) {
            done();
          }
        }
        new Simulation(configA).run().then(callback);
        new Simulation(configB).run().then(callback);
        new Simulation(configC).run().then(callback);
      });
      it('should have distinct buyer agents for each simulation', function () {
        states[0].S.buyersPool.agents[0].should.not.equal(states[1].S.buyersPool.agents[0]);
        states[0].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
        states[1].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
      });
      it('should have distinct seller agents for each simulation', function () {
        states[0].S.sellersPool.agents[0].should.not.equal(states[1].S.sellersPool.agents[0]);
        states[0].S.sellersPool.agents[0].should.not.equal(states[2].S.sellersPool.agents[0]);
        states[1].S.sellersPool.agents[0].should.not.equal(states[2].S.sellersPool.agents[0]);
      });
      testsForRunSimulationSingleTradeTenPeriods(states[0]);
      testsForRunSimulationSingleTradeTenPeriods(states[1]);
      testsForRunSimulationSingleTradeTenPeriods(states[2]);
    });
  });

  describe('runSimulation with three simulations of 10 periods of single unit trade scenario, asynchronous, realtime 5 sec period', function () {
    let rt = {
      realtime: 1,
      periodDuration: 5.0,
      buyerRate: 10,
      sellerRate: 10
    };
    let configA = Object.assign({}, configSingleUnitTrade, { periods: 10 }, rt);
    let configB = Object.assign({}, configSingleUnitTrade, { periods: 10 }, rt);
    let configC = Object.assign({}, configSingleUnitTrade, { periods: 10 }, rt);
    describe('when done should pass same tests as above ', function () {
      let states = [{}, {}, {}];
      let tInit = 0,
        tFinal = 0,
        countBefore = 0;
      // run the setup once before all the tests, not before each test
      before(function (done) {
        tInit = Date.now();
        countBefore++;
        let count = 0;

        function callback(S) {
          states[count].S = S;
          count++;
          if (count === 3) {
            tFinal = Date.now();
            done();
          }
        }
        new Simulation(configA).run().then(callback);
        new Simulation(configB).run().then(callback);
        new Simulation(configC).run().then(callback);
      });
      it('should only run the before() function in the test one time', function () {
        countBefore.should.equal(1);
      });
      it('should finish the real time simulations in about 50 sec', function () {
        const tInterval = (tFinal - tInit) / 1000.0;
        tInterval.should.be.within(45, 60);
      });
      it('should have distinct buyer agents for each simulation', function () {
        states[0].S.buyersPool.agents[0].should.not.equal(states[1].S.buyersPool.agents[0]);
        states[0].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
        states[1].S.buyersPool.agents[0].should.not.equal(states[2].S.buyersPool.agents[0]);
      });
      it('should have distinct seller agents for each simulation', function () {
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

[true, false].forEach((sync) => {
  describe(`simulation with 200 buyers, 200 sellers, values 900...303, costs 100...697, various agent types, 10 periods, sync: ${sync}`, function () {
    const agents = ["ZIAgent", "UnitAgent", "OneupmanshipAgent", "MidpointAgent", "TruthfulAgent", "DPPAgent", "KaplanSniperAgent", "MedianSniperAgent", "DoNothingAgent"];
    const config200Bx200Sx10Periods = {
      L: 1,
      H: 1000,
      numberOfBuyers: 200,
      numberOfSellers: 200,
      buyerValues: new Array(200).fill(0).map((v, j) => (900 - 3 * j)),
      sellerCosts: new Array(200).fill(0).map((v, j) => (100 + 3 * j)),
      buyerAgentType: agents.slice(0),
      sellerAgentType: agents.slice(0),
      periods: 10,
      orderClock: 200,
      silent: 1,
      logToFileSystem: false,
      integer: true
    };
    const S = new Simulation(config200Bx200Sx10Periods);
    const ids = S.pool.agents.map((a) => (a.id));
    before(async () => (S.run({ sync })));
    it('should complete 10 periods', function () {
      S.period.should.equal(10);
    });
    it('should have 400 ids [1,...,400]', function () {
      ids.length.should.equal(400);
      const expected = new Array(400).fill(0).map((v, j) => (1 + j));
      expected[0].should.equal(1);
      expected[399].should.equal(400);
      ids.should.deepEqual(expected);
    });
    it('should have 200 buyers with ids [1,2,...,200]', function () {
      S.numberOfBuyers.should.equal(200);
      S.buyersPool.agents.length.should.equal(200);
      const expected = new Array(200).fill(0).map((v, j) => (1 + j));
      expected[0].should.equal(1);
      expected[199].should.equal(200);
      S.buyersPool.agents.map((a) => (a.id)).should.deepEqual(expected);
    });
    it('should have 200 sellers with ids [201,202,...,400]', function () {
      S.numberOfSellers.should.equal(200);
      S.sellersPool.agents.length.should.equal(200);
      const expected = new Array(200).fill(0).map((v, j) => (201 + j));
      expected[0].should.equal(201);
      expected[199].should.equal(400);
      S.sellersPool.agents.map((a) => (a.id)).should.deepEqual(expected);
    });
    it('the agent types match the round robin type specification', function () {
      const al = agents.length;
      let testsCompleted = 0;
      [S.buyersPool.agents, S.sellersPool.agents].forEach((testAgentList) => {
        testAgentList.forEach((testAgent, testAgentIndex) => {
          const correctAgentTypeName = agents[testAgentIndex % al];
          const thisAgentTypeName = testAgent.constructor.name;
          thisAgentTypeName.should.equal(correctAgentTypeName);
          testsCompleted++;
        });
      });
      testsCompleted.should.equal(400);
    });
    it('xMarket is defined', function(){
      assert.ok(S.xMarket!==undefined,"xMarket undefined");
    });
    it('the buy book should be non-empty', function(){
      S.xMarket.book.buy.idx.length.should.be.above(0);
    });
    it('the sell book should be non-empty', function(){
      S.xMarket.book.sell.idx.length.should.be.above(0);
    });
    it('the buyStop book should be empty', function(){
      S.xMarket.book.buyStop.idx.length.should.equal(0);
    });
    it('the sellStop book should be empty', function(){
      S.xMarket.book.sellStop.idx.length.should.equal(0);
    });
    it("buyerValue is always defined and positive in buy order log", function () {
      const valueCol = S.logs.buyorder.header.indexOf('buyerValue');
      const idCol = S.logs.buyorder.header.indexOf('id');
      valueCol.should.be.above(0);
      idCol.should.be.above(0);
      S.logs.buyorder.data.forEach((bo, j) => {
        if (j === 0) bo[valueCol].should.equal('buyerValue');
        else {
          if (typeof(bo[valueCol]) !== 'number') {
            console.log('buyerValue is not numeric');
            console.log(j);
            console.log(bo);
            const id = bo[idCol];
            console.log(S.buyersPool.agentsById[id]);
          }
          bo[valueCol].should.be.type('number');
          bo[valueCol].should.be.above(0);
        }
      });
    });

    it('sellerCost is always defined and positive in sell order log', function () {
      const costCol = S.logs.sellorder.header.indexOf('sellerCost');
      const idCol = S.logs.sellorder.header.indexOf('id');
      costCol.should.be.above(0);
      idCol.should.be.above(0);
      S.logs.sellorder.data.forEach((so, j) => {
        if (j === 0) so[costCol].should.equal('sellerCost');
        else {
          if (typeof(so[costCol]) !== 'number') {
            console.log('sellerCost is not numeric');
            console.log(j);
            console.log(so);
            const id = so[idCol];
            console.log(S.sellersPool.agentsById[id]);
          }
          so[costCol].should.be.type('number');
          so[costCol].should.be.above(0);
        }
      });
    });

    addAllAgentsBidLTEQValueInOrderLogTest(S);
    addAllAgentsAskGTEQCostInOrderLogTest(S);

    it("all agents have correct agent type in buy order log", function () {
      const al = agents.length;
      const bAdj = +(S.buyersPool.agents[0].id);
      const [buyerAgentIdCol, typeCol] = ["id", "buyerAgentType"].map((s) => (combinedOrderLogHeader.indexOf(s)));
      S.logs.buyorder.data.forEach((bo, j) => {
        if (j > 0) {
          assert.ok(typeof(bo[typeCol]) === "string", "expected agent type to be string");
          bo[typeCol].should.equal(agents[(bo[buyerAgentIdCol] - bAdj) % al]);
        }
      });
    });

    it("all agents have correct agent type in sell order log", function () {
      const al = agents.length;
      const sAdj = +(S.sellersPool.agents[0].id);
      const [sellerAgentIdCol, typeCol] = ["id", "sellerAgentType"].map((s) => (combinedOrderLogHeader.indexOf(s)));
      S.logs.sellorder.data.forEach((so, j) => {
        if (j > 0) {
          assert.ok(typeof(so[typeCol]) === "string", "expected agent type to be string");
          so[typeCol].should.equal(agents[(so[sellerAgentIdCol] - sAdj) % al]);
        }
      });
    });

    it("in trade log: check bid<=value, ask>=cost, check for correct type, values and costs based on id, and profit correctly calculated", function () {
      const [
        priceCol,
        buyerAgentIdCol,
        buyerValueCol,
        buyerProfitCol,
        buyerAgentTypeCol,
        sellerAgentIdCol,
        sellerCostCol,
        sellerProfitCol,
        sellerAgentTypeCol
      ] = [
        'price',
        'buyerAgentId',
        'buyerValue',
        'buyerProfit',
        'buyerAgentType',
        'sellerAgentId',
        'sellerCost',
        'sellerProfit',
        'sellerAgentType'
      ].map((s) => (S.logs.trade.header.indexOf(s)));
      const bAdj = +(S.buyersPool.agents[0].id);
      const sAdj = +(S.sellersPool.agents[0].id);
      const al = agents.length;
      S.logs.trade.data.forEach((trade, j) => {
        if (j > 0) {
          const buyerSlot = trade[buyerAgentIdCol] - bAdj;
          const sellerSlot = trade[sellerAgentIdCol] - sAdj;
          trade[priceCol].should.be.belowOrEqual(trade[buyerValueCol]);
          trade[priceCol].should.be.aboveOrEqual(trade[sellerCostCol]);
          trade[buyerValueCol].should.equal(900 - 3 * buyerSlot);
          trade[sellerCostCol].should.equal(100 + 3 * sellerSlot);
          trade[buyerProfitCol].should.equal(trade[buyerValueCol] - trade[priceCol]);
          trade[sellerProfitCol].should.equal(trade[priceCol] - trade[sellerCostCol]);
          trade[buyerAgentTypeCol].should.equal(agents[buyerSlot % al]);
          trade[sellerAgentTypeCol].should.equal(agents[sellerSlot % al]);
        }
      });
    });

    it('the "TruthfulAgent" always sets bid = value ', function () {
      const al = agents.length;
      const truthfulBuyers = S.buyersPool.agents.filter((a, j) => (agents[j % al] === "TruthfulAgent"));
      truthfulBuyers.length.should.be.above(10);
      const truthfulBuyerIds = truthfulBuyers.map((a) => (a.id));
      const [
        idCol,
        buyLimitPriceCol,
        valueCol
      ] = ['id', 'buyLimitPrice', 'buyerValue'].map((s) => (S.logs.buyorder.header.indexOf(s)));
      const ordersByTruthfulBuyers = S.logs.buyorder.data.filter((bo) => (truthfulBuyerIds.includes(bo[idCol])));
      ordersByTruthfulBuyers.length.should.be.above(100);
      ordersByTruthfulBuyers.forEach((bo) => {
        bo[buyLimitPriceCol].should.equal(bo[valueCol]);
      });
    });

    it('the "TruthfulAgent" always sets ask = cost ', function () {
      const al = agents.length;
      const truthfulSellers = S.sellersPool.agents.filter((a, j) => (agents[j % al] === "TruthfulAgent"));
      truthfulSellers.length.should.be.above(10);
      const truthfulSellerIds = truthfulSellers.map((a) => (a.id));
      const [
        idCol,
        sellLimitPriceCol,
        costCol
      ] = ['id', 'sellLimitPrice', 'sellerCost'].map((s) => (S.logs.sellorder.header.indexOf(s)));
      const ordersByTruthfulSellers = S.logs.sellorder.data.filter((so) => (truthfulSellerIds.includes(so[idCol])));
      ordersByTruthfulSellers.length.should.be.above(100);
      ordersByTruthfulSellers.forEach((so) => {
        so[sellLimitPriceCol].should.equal(so[costCol]);
      });
    });

    it('the "MedianSniperAgent" as Buyer always bids below the previous period median price when tp<900', function () {
      const al = agents.length;
      const medianSniperBuyers = S.buyersPool.agents.filter((a, j) => (agents[j % al] === "MedianSniperAgent"));
      medianSniperBuyers.length.should.be.above(10);
      const medianSniperBuyerIds = medianSniperBuyers.map((a) => (a.id));
      const ohlcMedianPriceCol = S.logs.ohlc.header.indexOf("medianPrice");
      const [periodCol, tpCol, idCol, buyLimitPriceCol] = ['period', 'tp', 'id', 'buyLimitPrice'].map((s) => (S.logs.buyorder.header.indexOf(s)));
      const testedOrdersByMedianSniperBuyers = S.logs.buyorder.data.filter((bo) => ((medianSniperBuyerIds.includes(bo[idCol]) && (bo[tpCol] < 900))));
      testedOrdersByMedianSniperBuyers.length.should.be.above(50);
      testedOrdersByMedianSniperBuyers.forEach((bo) => {
        bo[buyLimitPriceCol].should.be.belowOrEqual(S.logs.ohlc.data[bo[periodCol] - 1][ohlcMedianPriceCol]);
      });
    });

    it('the "MedianSniperAgent" as Seller always asks above the previous period median price when tp<900', function () {
      const al = agents.length;
      const medianSniperSellers = S.sellersPool.agents.filter((a, j) => (agents[j % al] === "MedianSniperAgent"));
      medianSniperSellers.length.should.be.above(10);
      const medianSniperSellerIds = medianSniperSellers.map((a) => (a.id));
      const ohlcMedianPriceCol = S.logs.ohlc.header.indexOf("medianPrice");
      const [periodCol, tpCol, idCol, sellLimitPriceCol] = ['period', 'tp', 'id', 'sellLimitPrice'].map((s) => (S.logs.sellorder.header.indexOf(s)));
      const testedOrdersByMedianSniperSellers = S.logs.sellorder.data.filter((so) => ((medianSniperSellerIds.includes(so[idCol]) && (so[tpCol] < 900))));
      testedOrdersByMedianSniperSellers.length.should.be.above(50);
      testedOrdersByMedianSniperSellers.forEach((so) => {
        so[sellLimitPriceCol].should.be.aboveOrEqual(S.logs.ohlc.data[so[periodCol] - 1][ohlcMedianPriceCol]);
      });
    });

    it('the sniper agents trade but never trade with each other', function () {
      const batCol = tradeLogHeader.indexOf("buyerAgentType");
      const satCol = tradeLogHeader.indexOf("sellerAgentType");
      assert.ok(batCol > 0);
      assert.ok(satCol > 0);
      const volumeByNumberOfSnipers = [0, 0, 0];
      S.logs.trade.data.forEach((row, j) => {
        if (j > 0) {
          const snipers = ((row[batCol].includes("Sniper")) ? 1 : 0) + ((row[satCol].includes("Sniper")) ? 1 : 0);
          volumeByNumberOfSnipers[snipers] += 1;
          assert.ok(snipers !== 2, "detected sniper trading with another sniper");
        }
      });
      assert.ok(volumeByNumberOfSnipers[0] > 0, "some trades without snipers should occur");
      assert.ok(volumeByNumberOfSnipers[1] > 0, "some trades with 1 sniper should occur");
    });

    it("all agent types appear in the buy order log except the DoNothingAgents", function () {
      const atypeCol = combinedOrderLogHeader.indexOf("buyerAgentType");
      assert.ok(atypeCol >= 0);
      const countAgents = {};
      let count = 0;
      S.logs.buyorder.data.forEach((bo, j) => {
        if (j > 0) {
          const atype = bo[atypeCol];
          assert.ok(atype.length > 0);
          countAgents[atype] = (countAgents[atype] || 0) + 1;
        }
      });
      agents.forEach((atype) => {
        if (atype !== "DoNothingAgent") {
          assert.ok(countAgents[atype] > 0);
          count++;
        }
      });
      count.should.equal(agents.length - 1);
      assert.ok(countAgents.DoNothingAgent === undefined);
    });

    it("all agent types appear in the sell order log except the DoNothingAgents", function () {
      const atypeCol = combinedOrderLogHeader.indexOf("sellerAgentType");
      assert.ok(atypeCol >= 0);
      const countAgents = {};
      let count = 0;
      S.logs.sellorder.data.forEach((so, j) => {
        if (j > 0) {
          const atype = so[atypeCol];
          assert.ok(atype.length > 0);
          countAgents[atype] = (countAgents[atype] || 0) + 1;
        }
      });
      agents.forEach((atype) => {
        if (atype !== "DoNothingAgent") {
          assert.ok(countAgents[atype] > 0);
          count++;
        }
      });
      count.should.equal(agents.length - 1);
      assert.ok(countAgents.DoNothingAgent === undefined);
    });

    it("all agent types appear in the trade log except the DoNothingAgents", function () {
      const atypeCol1 = tradeLogHeader.indexOf("sellerAgentType");
      const atypeCol2 = tradeLogHeader.indexOf("buyerAgentType");
      assert.ok(atypeCol1 >= 0);
      assert.ok(atypeCol2 >= 0);
      const countAgents = {};
      let count = 0;
      S.logs.trade.data.forEach((trade, j) => {
        if (j > 0) {
          const atype1 = trade[atypeCol1];
          const atype2 = trade[atypeCol2];
          assert.ok((atype1.length > 0) && (atype2.length > 0));
          countAgents[atype1] = (countAgents[atype1] || 0) + 1;
          countAgents[atype2] = (countAgents[atype2] || 0) + 1;
        }
      });
      agents.forEach((atype) => {
        if (atype !== "DoNothingAgent") {
          assert.ok(countAgents[atype] > 0);
          count++;
        }
      });
      count.should.equal(agents.length - 1);
      assert.ok(countAgents.DoNothingAgent === undefined);
    });

    it('the ohlc log should have 11 entries', function () {
      S.logs.ohlc.data.length.should.equal(11);
    });
    it('beginTime in ohlc log is as expected', function () {
      const beginTimeCol = singleMarketRobotSimulator.logHeaders.ohlc.indexOf('beginTime');
      S.logs.ohlc.data.filter((v, j) => (j > 0)).map((row) => (row[beginTimeCol])).forEach((v, j) => {
        v.should.equal(1000 * (j + 1));
      });
    });
    it('endTime in ohlc log is as expected', function () {
      const endTimeCol = singleMarketRobotSimulator.logHeaders.ohlc.indexOf('endTime');
      S.logs.ohlc.data.filter((v, j) => (j > 0)).map((row) => (row[endTimeCol])).forEach((v, j) => {
        v.should.equal(1000 * (j + 2));
      });
    });
    it('endReason in ohlc log is as expected', function () {
      const endReasonCol = singleMarketRobotSimulator.logHeaders.ohlc.indexOf('endReason');
      S.logs.ohlc.data.filter((v, j) => (j > 0)).map((row) => (row[endReasonCol])).forEach((v) => {
        v.should.equal(0);
      });
    });
    it('the trade log should have greater than 1000 entries', function () {
      S.logs.trade.data.length.should.be.above(1000);
    });
    it('the ohlc log should agree with the trade log', function () {
      ohlcRestrict(S.logs.ohlc.data).should.deepEqual(tradesToPartialOHLC(S.logs.trade.data, ids));
    });
    it('the buy order log and sell order log should each have greater than 2000 entries', function () {
      S.logs.buyorder.data.length.should.be.above(2000);
      S.logs.sellorder.data.length.should.be.above(2000);
    });

    /**
     * create periodOrders for replay from current status
     */

    function getPeriodOrders() {
      const orders = [].concat(S.logs.buyorder.data.slice(1), S.logs.sellorder.data.slice(1));
      const [orderTCol,
        orderIDCol,
        orderPeriodCol,
        orderBuyLimitPriceCol,
        orderSellLimitPriceCol
      ] = ['t',
        'id',
        'period',
        'buyLimitPrice',
        'sellLimitPrice'
      ].map((s) => S.logs.buyorder.header.indexOf(s));
      orders.sort((a, b) => (+a[orderTCol] - b[orderTCol]));
      const periodOrders = new Array(10).fill(0).map(() => ([]));
      orders.forEach((o) => {
        periodOrders[o[orderPeriodCol] - 1].push(MEC.oa({
          t: o[orderTCol],
          id: o[orderIDCol],
          cancel: 1,
          q: 1,
          buyPrice: o[orderBuyLimitPriceCol],
          sellPrice: o[orderSellLimitPriceCol]
        }));
      });
      return periodOrders;
    }

    /*
     * Cloning below does not take into account orderClock or tradeClock
     * and only works because orderClock: 200 never expires when orders arrive at 1/sec/agent
     */

    function shouldProduceIdenticalResultsWithNewConfig(newConfig, periodOrders) {
      const clone = new Simulation(newConfig);
      clone.pool.agents.forEach((a, idx) => { a.id = S.pool.agents[idx].id; });
      clone.pool.agentsById = {};
      clone.pool.agents.forEach((a) => { clone.pool.agentsById[a.id] = a; });
      periodOrders.forEach((orderList, periodMinus1) => {
        clone.period = 1 + periodMinus1;
        clone.pool.initPeriod(clone.period);
        clone.xMarket.clear();
        orderList.forEach((order) => {
          clone.xMarket.submit(order);
          while (clone.xMarket.process());
        });
        clone.pool.endPeriod();
        clone.logPeriod();
      });
      S.logs.ohlc.data.should.deepEqual(clone.logs.ohlc.data);
      S.logs.trade.data.should.deepEqual(clone.logs.trade.data);
      S.logs.profit.data.should.deepEqual(clone.logs.profit.data);
      S.logs.effalloc.data.should.deepEqual(clone.logs.effalloc.data);
    }

    it('should successfully scrape, sort, collate orders to clone in next steps',function(){
      S.periodOrders = getPeriodOrders();
      // check that periodOrders is of length 10
      S.periodOrders.length.should.equal(10);
      // check that each scraped period has at least 100 orders
      S.periodOrders.filter((p)=>(p.length<100)).length.should.equal(0);
    });


    [
      {},
      { bookfixed: true, booklimit: 1 },
      { bookfixed: true, booklimit: 2 },
      { bookfixed: true, booklimit: 3 },
      { bookfixed: true, booklimit: 5 },
      { bookfixed: true, booklimit: 13 },
      { bookfixed: true, booklimit: 20 },
      { bookfixed: true, booklimit: 50 },
      { bookfixed: true, booklimit: 200 },
      { bookfixed: false, booklimit: 1 },
      { bookfixed: false, booklimit: 2 },
      { bookfixed: false, booklimit: 3 },
      { bookfixed: false, booklimit: 5 },
      { bookfixed: false, booklimit: 13 },
      { bookfixed: false, booklimit: 20 },
      { bookfixed: false, booklimit: 50 },
      { bookfixed: false, booklimit: 200 }
    ].forEach((changes) => {
      it(`cloning orders to a simulation with xMarket ${JSON.stringify(changes)} will produce identical results in logs`, function () {
        const changedConfig = Object.assign({}, config200Bx200Sx10Periods, { xMarket: changes });
        shouldProduceIdenticalResultsWithNewConfig(changedConfig, S.periodOrders);
      });
    });
  });
});

describe('simulation with 1 seller and ZI+KaplanSniperAgent buyers', function () {
  const config = {
    L: 1,
    H: 1000,
    numberOfBuyers: 2,
    numberOfSellers: 1,
    buyerValues: [900, 900],
    sellerCosts: [100],
    buyerAgentType: ['ZIAgent', 'KaplanSniperAgent'],
    sellerAgentType: ['ZIAgent'],
    periods: 100,
    silent: 1,
    logToFileSystem: false,
    integer: true
  };
  const S = new Simulation(config).run({ sync: true });
  it('should complete 100 periods', function () {
    S.period.should.equal(100);
  });
  it('should have 3 ids [1,2,3]', function () {
    S.pool.agents.map((a) => (a.id)).should.deepEqual([1, 2, 3]);
  });
  it('should have agents ZI,Sniper,ZI ', function () {
    S.pool.agents.map((a) => (a.constructor.name)).should.deepEqual([
      'ZIAgent',
      'KaplanSniperAgent',
      'ZIAgent'
    ]);
  });
  addAllAgentsBidLTEQValueInOrderLogTest(S);
  addAllAgentsAskGTEQCostInOrderLogTest(S);
  describe('KaplanSniperAgent bids as expected: ', function () {
    const OHLCperiodCol = S.logs.ohlc.header.indexOf('period');
    const OHLClowPriceCol = S.logs.ohlc.header.indexOf('lowPrice');
    assert.ok(OHLCperiodCol >= 0);
    assert.ok(OHLClowPriceCol >= 0);

    function getPeriodLowPrice(p) {
      const row = S.logs.ohlc.data[p];
      const period = row[OHLCperiodCol];
      assert.ok(period === p, `period mismatch ${period} ${p}`);
      return row[OHLClowPriceCol];
    }

    function ziporder(o) {
      const order = {};
      o.forEach((v, j) => {
        order[combinedOrderLogHeader[j]] = v;
      });
      return order;
    }
    const buyorders = S.logs.buyorder.data.filter((v, j) => (j > 0)).map(ziporder);
    const sniperorders = buyorders.filter((order) => (order.id === 2));
    const earlysniperorders = sniperorders.filter((order) => (order.tp < 990));
    it('sniper bids at least 10 times when tp<990', function () {
      earlysniperorders.length.should.be.above(10);
    });
    it('when sniper bids, buyLimitPrice===preAskPrice', function () {
      sniperorders.filter((order) => (order.buyLimitPrice !== order.preAskPrice)).length.should.equal(0);
    });
    it('when sniper bids, and tp<990, at least one low price snipe occurs', function () {
      earlysniperorders.filter((order) => (
        (order.period) > 1 &&
        ((!order.preBidPrice) || ((order.preAskPrice - order.preBidPrice) > 10)) &&
        (order.preAskPrice <= getPeriodLowPrice(order.period - 1))
      )).length.should.be.above(1);
    });
    it('when sniper bids, and tp<990, either preAskPrice<=previous-period-low or preAskPrice-preBidPrice<=10', function () {
      const unusual = (
        earlysniperorders
        .filter((order) => (
          (order.preAskPrice > 0) &&
          (order.preBidPrice > 0) &&
          ((order.preAskPrice - order.preBidPrice) > 10) &&
          (order.period === 1 || (order.preAskPrice > getPeriodLowPrice(order.period - 1)))
        ))
      );
      unusual.length.should.equal(0);
    });
  });
});

describe('simulation with 1 buyer and ZI+KaplanSniperAgent sellers', function () {
  const config = {
    L: 1,
    H: 1000,
    numberOfBuyers: 1,
    numberOfSellers: 2,
    buyerValues: [900],
    sellerCosts: [100, 100],
    buyerAgentType: ['ZIAgent'],
    sellerAgentType: ['ZIAgent', 'KaplanSniperAgent'],
    periods: 100,
    silent: 1,
    logToFileSystem: false,
    integer: true
  };
  const S = new Simulation(config).run({ sync: true });
  it('should complete 100 periods', function () {
    S.period.should.equal(100);
  });
  it('should have 3 ids [1,2,3]', function () {
    S.pool.agents.map((a) => (a.id)).should.deepEqual([1, 2, 3]);
  });
  it('should have agents ZI,ZI,Sniper ', function () {
    S.pool.agents.map((a) => (a.constructor.name)).should.deepEqual([
      'ZIAgent',
      'ZIAgent',
      'KaplanSniperAgent'
    ]);
  });
  addAllAgentsBidLTEQValueInOrderLogTest(S);
  addAllAgentsAskGTEQCostInOrderLogTest(S);
  describe('KaplanSniperAgent asks as expected: ', function () {
    const OHLCperiodCol = S.logs.ohlc.header.indexOf('period');
    const OHLChighPriceCol = S.logs.ohlc.header.indexOf('highPrice');
    assert.ok(OHLCperiodCol >= 0);
    assert.ok(OHLChighPriceCol >= 0);

    function getPeriodHighPrice(p) {
      const row = S.logs.ohlc.data[p];
      const period = row[OHLCperiodCol];
      assert.ok(period === p, `period mismatch ${period} ${p}`);
      return row[OHLChighPriceCol];
    }

    function ziporder(o) {
      const order = {};
      o.forEach((v, j) => {
        order[combinedOrderLogHeader[j]] = v;
      });
      return order;
    }
    const sellorders = S.logs.sellorder.data.filter((v, j) => (j > 0)).map(ziporder);
    const sniperorders = sellorders.filter((order) => (order.id === 3));
    const earlysniperorders = sniperorders.filter((order) => (order.tp < 990));
    it('sniper asks at least 10 times when tp<990', function () {
      earlysniperorders.length.should.be.above(10);
    });
    it('when sniper asks, sellLimitPrice===preBidPrice', function () {
      sniperorders.filter((order) => (order.sellLimitPrice !== order.preBidPrice)).length.should.equal(0);
    });
    it('when sniper asks, and tp<990, at least one high price snipe occurs', function () {
      earlysniperorders.filter((order) => (
        (order.period) > 1 &&
        ((!order.preAskPrice) || ((order.preAskPrice - order.preBidPrice) > 10)) &&
        (order.preBidPrice >= getPeriodHighPrice(order.period - 1))
      )).length.should.be.above(1);
    });
    it('when sniper asks, and tp<990, either preBidPrice>=previous-period-high or preAskPrice-preBidPrice<=10', function () {
      const unusual = (
        earlysniperorders
        .filter((order) => (
          (order.preAskPrice > 0) &&
          (order.preBidPrice > 0) &&
          ((order.preAskPrice - order.preBidPrice) > 10) &&
          (order.period === 1 || (order.preBidPrice < getPeriodHighPrice(order.period - 1)))
        ))
      );
      unusual.length.should.equal(0);
    });
  });
});
