# single-market-robot-simulator

[![Build Status](https://travis-ci.org/DrPaulBrewer/single-market-robot-simulator.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/single-market-robot-simulator)
[![Coverage Status](https://coveralls.io/repos/github/DrPaulBrewer/single-market-robot-simulator/badge.svg?branch=master)](https://coveralls.io/github/DrPaulBrewer/single-market-robot-simulator?branch=master)


A stand alone nodejs app and software module for creating numerical experiments with robots trading in a single market.

The induced supply and demand is configurable, as are the types and speeds of trading robots populating the market.

This code can run either in a browser or on NodeJS and would normally be a "middle" portion of a code stack.  
Visualizations and friendly user-interfaces are the responsibility of other code, or you, the user.

## Programmer's Documentation

The [JSDoc site for single-market-robot-simulator](https://drpaulbrewer.github.io/single-market-robot-simulator/) contains documentation prepared from source code of this module.

## Installation

### no installation necessary when using Econ1.Net (paid)

An affordable paid web app at https://Econ1.net is available that is much nicer, includes visualization and an editor, has time-saving features, and integrates with Google Cloud and Google Drive.

### no installation necessary when using Docker Desktop (free)

No installation is necessary if you have Docker Desktop (for Windows 10 Pro and Windows 10 for Education, and Mac or Linux usage). Skip to the "Usage" section.  Docker Desktop is free, and the release of this software on the Docker Hub is free.

If you want to use Docker and you do not have it,  install [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows 10 Pro, Windows 10 for Education, Mac) or [Docker community edition](https://docs.docker.com/install/) (Linux).

Docker Desktop allows running the single-market-robot-simulator in a command line window. It
does not include any editor or visualization.  However, the input format is documented, and the
outputs are mostly in CSV format. CSV files are compatible with most statistical and data-science
software (e.g. python, R, matlab/octave, spreadsheets, stata, others).

As of July 2020, Windows 10 for Home is incompatible with Docker Desktop and has to be upgraded to Windows 10 Pro. This upgrade may require a payment to Microsoft.

### as stand alone JavaScript software

Obviously, you'll need to have git, nodejs, and npm pre-installed.

To run as a nodejs command-line program, clone this repository on your computer and run `npm install`:

     git clone https://github.com/DrPaulBrewer/single-market-robot-simulator
     cd ./single-market-robot-simulator
     npm install

### as a library in another open source npm JavaScript program

If, instead, you want to use it as a library in another module to be released on npm, simply use `npm i -S` as usual:

     npm i single-robot-market-simulator -S

### as a library in a JavaScript web app

To use this as part of a web site, you will probably want to use something like browserify, jspm, or webpack to
help with bundling and integration.

To use this as a library on the browser with `jspm`, you should set an override option on install forcing dependency `fs` to `@empty`.   

This was done in the [robot-trading-webapp](http://github.com/DrPaulBrewer/robot-trading-webapp) example prototype web app that uses a very early version of this code (1.0.0) from May, 2017.  The "robot-trading-webapp" prototype is no longer under active development and does not receive updates or bug fixes. You may still try it but I do not recommend it for producing new research data.

For new web apps I would recommend `webpack`.  In the webpack configuration file `webpack.config.js` I needed to
 include `node: { fs: 'empty' }` to create a blank fs object on the web browser.


## Configuration

Configuration is a matter of preparing a `sim.json` file BEFORE usage.

Here is an example configuration file, found in `examples/sim1.json`:

```
{
  "buyerValues": [
    100,
    95,
    90,
    85,
    80,
    75,
    70,
    60,
    50,
    40,
    30,
    20,
    10
  ],
  "sellerCosts": [
    10,
    20,
    30,
    40,
    50,
    60,
    70,
    80,
    90,
    100
  ],
  "L": 1,
  "H": 200,
  "numberOfBuyers": 10,
  "numberOfSellers": 10,
  "buyerAgentType": [
    "ZIAgent"
  ],
  "sellerAgentType": [
    "ZIAgent"
  ],
  "periods": 20,
  "periodDuration": 1000,
  "buyerRate": 0.2,
  "sellerRate": 0.2,
  "integer": false,
  "keepPreviousOrders": false,
  "ignoreBudgetConstraint": false,
  "xMarket": {
    "buySellBookLimit": 0,
    "resetAfterEachTrade": true
  }
}

```

The above configuration achieves the following:
* `buyerValues` sets the unit values to be distributed each period to buyers, each buyer obtaining a single unit value round robin until exhaustion. Therefore this also sets the aggregate demand curve.
![demand curve for examples/sim1.json](https://docs.google.com/spreadsheets/d/e/2PACX-1vQZuAGLTssRXbQwe8837exo1DviPR2DhX4_ltb_9GsyO5oBDEXVvsBnl9DX2JprZnNlkqkOLSYFxq0z/pubchart?oid=1917425294&format=image)
* `sellerCosts` sets the unit costs to be distributed each period to sellers, each seller obtaining a single unit cost round robin until exhaustion. Therefore this also sets the aggregate supply curve.
![supply curve for examples/sim1.json](https://docs.google.com/spreadsheets/d/e/2PACX-1vQZuAGLTssRXbQwe8837exo1DviPR2DhX4_ltb_9GsyO5oBDEXVvsBnl9DX2JprZnNlkqkOLSYFxq0z/pubchart?oid=371569094&format=image)
* `L` sets the lowest allowable price, here 1
* `H` sets the highest allowable price, here 200
* `numberOfBuyers` sets the number of buyers (here 10), who receive id numbers 1,2,3,...,`numberOfBuyers`
* `numberOfSellers` sets the number of sellers, (here 10) who receive id numbers `numberOfBuyers`+1,`numberOfBuyers`+2,...,`numberOfBuyers`+`numberOfSellers`
(here 11,12,13,14,15,16,17,18,19,20)
* `buyerAgentType` sets the type of buyer (here, my implementation of Gode/Sunder's ZI Agents) to use from [market-agents](https://github.com/DrPaulBrewer/market-agents)
* `sellerAgentType` sets the type of seller (here, my implementation of Gode/Sunder's ZI Agents) to use from [market-agents](https://github.com/DrPaulBrewer/market-agents)
* `periods` is the desired number of periods, or repetitions of a "trading day". Here we are asking for 20 periods.
* `periodDuration` is the length of a period in virtual seconds (here, 1000)
* `buyerRate` is the Poisson-arrival rate of an individual buyer (here, 0.2, or each buyer submits an order approximately once every 5 seconds)
* `sellerRate` is the Poisson-arrival rate of an individual seller (here, 0.2, or each seller submits an order approximately once every 5 seconds)
* `integer` determines whether prices must be integers or can be floating point because floating point can not represent fractions exactly unless they have denominators equal to a power of 2.  `integer:true` is a best practice.
* `keepPreviousOrders` determines if an agent's old orders are preserved when that same agent sends new orders (`true`). Otherwise, new orders always cancel old orders (`false`).  In most cases `keepPreviousOrders:false` is appropriate.
* `ignoreBudgetConstraint` determines if agents should ignore their unit values and costs, instead treating the value of a unit as H or the cost as L.  This terminology is borrowed from Gode and Sunder's 1993 paper.  `ignoreBudgetConstraint:false` is the appropriate setting for most cases.
* `xMarket` settings occur in their own object.   

Most of the allowed fields, except for the `xMarket` fields, can be found in the programmer's documentation for the [public constructor config params for `Simulation`](https://drpaulbrewer.github.io/single-market-robot-simulator/Simulation.html).

The `xMarket` fields are documented in the programmer's documentation for the
[public constructor config params for `Market`](https://doc.esdoc.org/github.com/DrPaulBrewer/market-example-contingent/class/src/index.js~Market.html#instance-constructor-constructor)

Simulation configuration in the stand alone app occurs in a .json file.  By convention this file is named `sim.json`
or similar.  

When used as a software module, the configuration object `config` read from the simulation configuration file or other
location should be passed to the constructor `new Simulation(config)`.

### Configurable supply and demand

The values and costs to be distributed among the trading robots are configured in the properties `buyerValues` and `sellerCosts`, each an array that is distributed round-robin style to the buyer robots and seller robots respectively.  Each of these values and costs will be distributed exactly once at the beginning of each period of the market.

To be clear, if the `numberOfBuyers` exceeds the length of `buyerValues`, then some buyers will not receive a unit value. Those buyers will exist but do nothing.   If the length of `buyerValues` exceeds the `numberOfBuyers` then some buyers will receive more than one unit value, which is OK and even expected. By "round-robin" I mean that an element `j` of `buyerValues` will be assigned to buyer `1+((j-1) mod numberOfBuyers)` (where j=1 is the first element and mod is the remainder from integer division; and yes we realize that JavaScript indexing is zero-based and differs from this more human description).   This form of specification is convenient for setting a particular aggregate supply and demand and keeping it constant while tinkering with the number of buyers, sellers or other parameters.

The descending sorted `buyerValues` can be used to form a step function that is the aggregate demand function for the market.

Similarly the ascending sorted `sellerCosts` can be used to form a step function that is the aggregate supply function for the market.

### Robot Trading agents

The types of buyers and sellers are set in configuration properties `buyerAgentType` and `sellerAgentType` and the buyers and sellers configured round-robin from these types.  

For example, if there is only one type of buyer, then all buyers are that type.  If there are two types of buyers configured then the buyers will alternate between these types, with half the buyers will be the first type, and half the buyers will be the second type if the number of buyers is even. If the number of buyers is odd then there will be an extra buyer of the first type. For more human-readable and explicit files, a good practice may be to have the buyerAgentType and sellerAgentType arrays have an entry for each buyer and seller.  

The module [market-agents](https://github.com/DrPaulBrewer/market-agents) is imported to provide the robot trading agents.  

The algorithms provided are intentionally simple when compared to Neural Networks and modern approaches
to machine learning. Nevertheless, some of the algorithms chosen have been the topics of papers in the economics literature.

Among the choices are:

#### ZIAgent
The [Zero Intelligence trader](https://en.wikipedia.org/wiki/Zero-intelligence_trader) of Gode and Sunder[1] that bids/asks randomly for non-zero profit.  Bids ~ `U[L,v]` and Asks~`U[c,H]` where `U `is a uniform distribution, `L` and `H` are market minimum/maximum allowed price, and `v` and `c` are an agent's unit value or unit cost.

#### ZIJumpAgent

A more aggressive random trader than ZIAgent.   Bids ~ `U[market.currentBid,V]` and asks~`U[c,market.currentAsk]`.  If there is no current bid or current ask, it reverts to ZIAgent behavior.

#### ZISpreadAgent

Bids or asks within the spread `U[market.currentBid,market.currentAsk]` unless these do not exist,  in which case other limits `c` `v` `L` and `H` apply.  

#### TTAgent

Rough optimizer that Speculates that future periods will be like past periods.  Uses stochastic optimization and opportunity-from-waiting (backwards-induction) analysis to determine bids and asks. Collates trades from each period into a list of 1st trades, 2nd trades, 3rd trades, ..., Nth trades across periods for the market.  From the time left in the market, a horizon H is determined, and the collated trade list to determine an optimal bid or ask for the H-th trade back to the current trade.

#### UnitAgent

Bids or asks randomly from `{ previous trade price - 1,  previous price, previous price +1 }` -- subject to no-loss constraint.

#### OneupmanshipAgent
Simple algorithm that increases the bid or decreases the ask by 1 price unit  -- subject to  no-loss constraint.

#### MidpointAgent
A bisection algorithm that bids or asks halfway between the current bid and current ask.  Initially bids `L` or asks `H` when no bid/ask is present.  Bid and asks are subject to no-loss constraint.

#### DPPAgent

Ignores market conditions and bids or asks the inverse log of the log convex combination of `L `and `v` or `c` and `H` where the lambda parameter of the convex combination is the percentage of time exhausted in the current period.

#### Snipers, generally

A sniper will sell by asking equal to an existing bid or buy by bidding equal to an existing ask, causing an immediate trade.   In this way, it always extracts liquidity from the order books and never adds liquidity. 

Snipers often have a fallback strategy in case their primary strategy has failed to produce any trades as the period is ending (only ~10 actions are left in the period).  The simplest fallback strategy is to accept any existing offer from the other side of the market that satisfied the no-loss constraint.

Snipers will not send bid/asks that violate the no-loss constraint.

#### KaplanSniperAgent
A Sniper similar to Kaplan's Sniper algorithm but explicitly liquidity-reducing.  For now, I still call it "KaplanSniperAgent" because of its historical roots.  See [2].  The sniping phase looks for (a) prices at or beyond the previous period low or high; or (b) low spread `(bid-ask<10)`.

#### MedianSniperAgent

The sniping phase looks for prices better than the previous period's median of trading prices.

#### AcceptSniperAgent

Accept the existing current Bid or current Ask.

#### RandomAcceptSniperAgent

On initialization (before the first period) this agent chooses an acceptance rate `a` ~ U[0,1],

On each action thereafter, it implements this random acceptance rate by choosing `r` ~ U[0,1] and accepting the current bid or ask if `r`<`a`  (no-loss constraint still applies)

#### RisingBidSniperAgent

A very simple upward price-momentum sniper.  Accepts the current bid or current ask when the market's current Bid price is above the market's last trade price.

#### FallingAskSniperAgent

A very simple downward price-momentum sniper,  Accepts the current bid or current ask when the market's current Ask price is below the market's last trade price.

#### TruthfulAgent
A "truthful" or identity-function algorithm that always bids the unit value or asks the unit cost.

#### DoNothingAgent

This agent never bids or asks but does receive a unit cost or value and actions during the period (which it always passes).  It can be useful as a place holder for both tests and for establishing lower limits of efficiency or volume.  


## Additional Configuration examples

The [./examples](/examples) directory contains a number of additional sim.json files.

## Usage

### Stand Alone App

#### when run from Docker
Create a work directory containing the `sim.json` file with the simulation configuration.

The commands below require the file be named `sim.json`

The current version of the Docker container is 6.10.0.  To
run that, use this docker command:

    docker run -it \
           -v /path/to/your/work/directory:/work \
           drpaulbrewer/single-market-robot-simulator:6.10.0

The previous major version of the Docker container is 5.6.0.  To
run 5.6.0, use this docker command:

    docker run -it \
           -v /path/to/your/work/directory:/work \
           drpaulbrewer/single-market-robot-simulator:5.6.0

One way to gain experience with the software is to replicate a portion of the Brewer and Ratan (2019) research studying markets
populated by a combination of ZI and Sniper Agents.  

Section 2.2.4 from the linked [replication guide](https://doi.org/10.1016/j.dib.2019.104729) (published in Data In Brief, 2019) addresses the 50% ZI 50% Snipers
case.  By following the instructions, you can generate 10000 periods of market data and then calculate the Gini coefficient of total agent profits.  

The replication guide will walk you through the steps of extracting the necessary `sim.json` configuration file from a research archive, installing Docker,
running the simulator, and finally running an additional tool in docker to obtain the Gini coefficient of total profits.

To run the simulator code as it existed for Brewer and Ratan's (2019) research project [2] (version 4.3.0),  use this Docker command:

    docker run -it \
           -v /path/to/your/work/directory:/work \
           drpaulbrewer/single-market-robot-simulator:4.3.0

#### when installed from GitHub
 If installed from github onto a suitable system (preferably Linux, though it may run on Windows 10 or Mac -- and with nodejs and npm previously installed) it can be used as a stand alone nodejs app.

 `node build/index.js sim.json` from the installation directory will run the simulation, reading the `sim.json` file and outputting various log files.

 You can name the `sim.json` file as you prefer, including a directory, like `/my-files/research/project123/sim.json` The simulator will then fetch that file but continue to run and output market data files into the current directory, and not in the directory where that `sim.json` file is located.  

 To keep configuration and output files in the same directory, consider copying the `sim.json` file to a new directory, `cd` to that new directory, and run

 `node /path/to/single-market-robot-simulator/build/index.js sim.json`  

 where you should replace `/path/to/` with the actual directory path where the simulator is installed.


#### Outputs

A number of .csv comma-separated-value files are produced containing the market data.  

The column formats described below are for the most recent version of the simulator.  Older versions of the simulator may produce fewer columns of data.

Output files include:

`buyorder.csv`, `sellorder.csv`, `ohlc.csv`, `trade.csv`, `profit.csv`, and `effalloc.csv`.

These files have header rows and are compatible with Excel and other spreadsheets and most analysis software.

##### `buyorder.csv` and `sellorder.csv` column format
Each row in these files contains an order from a buyer or seller to buy/sell a single unit at a desired price.  

These files share a common format that can be combined.  Irrelevant fields are blank.  

Columns include:

1. `caseid` identifies a single simulation in a series of simulations
2. `period` period number
3. `t` unique time of order within simulation
4. `tp` time of order from beginning of current period
5. `preBidPrice` highest bid price available immediately before this order
6. `preAskPrice` lowest ask price available immediately before this order
7. `preTradePrice` previous trade price
8. `id` id number of agent placing this order
9.  `x` agent's inventory of "x" before this order
10. `buyLimitPrice` agent's submitted bid price for this order, if this is a buy order
11. `buyerValue` agent's unit value for this unit, if a buyer
12. `buyerAgentType` agent's class (algorithm), if a buyer
13. `sellLimitPrice` agent's submitted ask price for this order, if this is a sell order
14. `sellerCost` agent's unit cost for this unit, if a seller
15. `sellerAgentType` agent's class (algorithm), if a seller

##### `trade.csv` column format

Each row in this file reports a trade.  

In a double auction market, trades are caused by a match between an existing order and an incoming order.

Each trade is for a single unit of a good called `x`.   

For example, an incoming order to buy 1 unit at price 55 will match a pre-existing sell order to sell 1 unit at price 50. The
trade price in a double auction is always the price of the pre-existing order, in this case 50.   The time of the trade matches
the time of the incoming order exactly.  

In this file, all columns should contain data.

Columns in `trade.csv` include:

1. `caseid` identifies a simulation in a set of simulations
2. `period` period number
3. `t` unique time of order within simulation
4. `tp` time of order from beginning of current period
5. `price` price for this trade
6. `buyerAgentId` the id number of the Buyer
7. `buyerAgentType` Buyer's class (algorithm) from npm: market-agents
8. `buyerValue` Buyer's unit value for this unit
9. `buyerProfit` Buyer's profit for this trade = `buyerValue` - `price`
10. `sellerAgentId`  the id number of the Seller
11. `sellerAgentType` Seller's class (algorithm) from npm: market-agents
12. `sellerCost` Seller's unit cost for this unit
13. `sellerProfit` Seller's profit for this trade = `price` - `sellerCost`

##### `ohlc.csv` column format

Each row in this file reports a period of trading.

Originally, the file reported the opening, high, low, and close (final) trade prices.  
Various additional columns have been added.  

All columns should normally contain data

Columns in `ohlc.csv` include:

1. `caseid` identifies a simulation in a set of simulations
2. `period` period number
3. `beginTime` simulation time at beginning of period
4. `endTime` simulation time at end of trading period
5. `endReason` 0 for normal ending.  Other numbers for various optional order/trade countdown clocks.  
6. `openPrice` price of the first trade in this period
7. `highPrice` highest trade price in this period
8. `lowPrice` lowest trade price in this period
9. `closePrice` price of the last trade in this period
10. `volume` the number of units traded in this period
11. `p25Price` the 25% percentile level of the trading price distribution in this period
12. `medianPrice` the 50% percentile level of the trading price distribution in this period
13. `p75Price` the 75% percentile level of the trading price distribution in this period
14. `meanPrice` the mean of the trading prices in this period
15. `sd` the standard deviation of trading prices in this period
16. `gini` the single-period Gini Coefficient of trading profits achieved within this period

##### `profit.csv` column format

Each row in this file reports the profits of all agents for a period of trading.

Only the profits in a specific period are reported. Profits are not accumulated from one period to another.

Columns in `profit.csv` include:

1. `caseid` identifies a simulation in a set of simulations
2. `period` period number
3. `y1` the profit of agent 1
4. `y2` the profit of agent 2
5. `y3` the profit of agent 3

...

The file will have as many `y*` columns as there are agents.  For example, if there are 500 agents, columns 3 through 502 will
consist of the profits of each of the 500 agents for a single period.  This is possible because there is no maximum line length
or maximum number of columns in the specification for a `.csv` file.  (See: [RFC4180](https://tools.ietf.org/html/rfc4180)).  
Your favorite spreadsheet or other tools may have limitations, and in such a case you'll need to find something else to complete your analysis or find a way to break the big or wide file into smaller files.

##### `effalloc.csv` column format

Each row in this file reports the Efficiency of Allocation for a period of trading.

Columns in `effalloc.csv` include:

1. `caseid` identifies a simulation in a set of simulations
2. `period` period number
3. `efficiencyOfAllocation` 100*(Sum of All Agents Profit for this period) / (Max Possible)

#### Progress Messages

There are no output progress messages unless `quiet: false` is in the `sim.json` properties.  There is a file called `period` that can be used as a progress indicator.  It contains only a single number -- the current period number.  

### Usage as a software module

Depending on whether you are using ES6 or CJS modules, importing looks like this:

    import * as SMRS from 'single-market-robot-simulator'; // ES6
    
    const SMRS = require("single-market-robot-simulator"); // CJS

and returns an object `SMRS` containing a constructor for the JavaScript class `Simulation` and a few other miscellaneous items.  Ideally, this code
will run either in the browser or on the server via nodejs without being modified for the specific environment ("isomorphic javascript").  

On the browser, standard browser security policies require different procedures for writing out files.  Therefore, the data logs cannot be immediately written out to .csv files (as with the stand alone app) but are maintained in memory for use with other systems, such as browser-based plotting software.  It is the responsibility of other software modules (e.g. `npm:single-market-robot-simulator-savezip`) to write the logs to files or to Google Drive (`npm:single-market-robot-simulator-db-googledrive`) elsewhere and/or to provide for visualizations (`npm:single-market-robot-simulator-viz-plotly`).

Simulations can be run in either synchronous or asynchronous mode.  Asynchronous mode is useful for running on the browser so that the web browser's event loop and user interface do not freeze while waiting for simulation results.

Example source code for a web-based simulator based on `single-market-robot-simulator` may be found at

http://github.com/DrPaulBrewer/robot-trading-webapp

and the resulting simulator web app is at

http://drpaulbrewer.github.io/robot-trading-webapp/

However, those are very early prototypes (v1, May 2017), are not actively updated, and should not be relied upon for new research.  I have a [paid version of this market simulator](https://econ1.net) in development.  You should also prefer the docker and stand-alone versions to the early web prototype.  

## Tests

    npm test

from the local git-cloned and npm-installed copy of this repository will run the tests.  

You may also be interested in the tests for `market-agents`, `market-example-contingent` or other dependencies, which are available from those modules' directories.

You can also click on the build or coverage badges to view public test reports.

## Copyright

Copyright 2016- Paul Brewer, Economic and Financial Technology Consulting LLC

## License:

The software is available under the industry standard open souce MIT License.

[The MIT License](./LICENSE.md)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Notes

[1] Allocative Efficiency of Markets with Zero-Intelligence Traders: Market as a Partial Substitute for Individual Rationality
Dhananjay K. Gode and Shyam Sunder, Journal of Political Economy, Vol. 101, No. 1 (Feb., 1993), pp. 119-137

[2] This sniper robot was used for an academic research project and its history detailed in Appendix 1 of the resulting publication:

Paul Brewer and Anmol Ratan (2019), "Profitability, efficiency, and inequality in double auction markets with snipers."  Journal of Economic Behavior & Organization, vol. 164, 486-499.
https://doi.org/10.1016/j.jebo.2019.06.017  (Elsevier/Science Direct paywall)

A replication guide, raw data and simulation configuration files are OPEN ACCESS and reported in:

Paul Brewer and Anmol Ratan (2019), "Data and replication supplement for double auction markets with snipers." Data In Brief, vol. 27, 104729.  https://doi.org/10.1016/j.dib.2019.104729 (Elsevier Open Access Article)

https://doi.org/10.17632/p9v66fzfhw.1  (Mendeley Open Access Dataset)

## Before asking the author for help

#### I hope you enjoy the free software
**and the thrill of researching and solving problems**

I will appreciate a social "hello" from researchers, students, and others attempting to use the free version of this software.

But I also reserve the right to ignore email. Don't take it
personally, or as a snub.  24-hr on call unlimited free support
is not included with this free software, or any free software
for that matter.

I have written this section to help with that issue.

First, if you are a student, I wouldn't dream of taking your homework problem or class project problem away from you -- even if, in a moment of weakness or desperation the day before the deadline you were having trouble completing it at the last minute.  You can do it! I believe in you! And, it is a learning experience.

Technology can be frustrating, and
having a conversation about frustration that also involves lacking useful notes and being ill-prepared, is often mutually frustrating and tends to be a waste of time.  If that seems arrogant, imagine I am talking about myself.  

This software does NOT contain any spyware or other tracking.  So I don't know what you tried, what you saw as output,
or how it failed (if it didn't work) or failed to meet expectations. I also lack useful notes on what happens if the software is run on unsuitable machines. Or what happens when problems of unclear documentation or insufficient examples or experience combine with other issues between the keyboard and the chair.  

And I am ill-prepared to continue working for free on things I actually care about, and much less enthusiastic about becoming someone's private arbitrage gain. If this simulation software helps with your group's goals and is saving money by providing a head-start on research or teaching projects -- please consider becoming a financial sponsor.

I wrote above that I might lack notes or be ill-prepared.

Keep in mind that you might also lack useful notes or be ill-prepared (i.e. it doesn't work but you don't know why and you don't know how you configured it, and didn't write anything down about the error messages or exactly what you did; or your question is about how to construct a simulation without reading the documentation or studying any examples).  

#### Questions

Before asking me a question, please try these things first:
* consider that your problem might be solved faster by
  - asking a local computer-savvy colleague to sit down with you and review what is happening.
  - explaining the question out loud to an unfamiliar (or even a fictional) person can help you solve your own problem.  Also known as [Rubber duck debugging](https://en.wikipedia.org/wiki/Rubber_duck_debugging).
  - upgrading your computer or using a better or different computer. More cores, 8 GB or more ram, and an SSD are all a plus. The simulator software is single-threaded. But Docker on Windows or Mac installs its own Linux -- so on Docker you'll benefit from at least 2 cores.  Typically a full-sized desktop has more heat dissipation and can be higher performance than a laptop or mini cube.
  - optionally spending less than $50 on the paid version of this software when available at https://econ1.net --  which will be used over the web (no installation), be compatible with the free Docker usage method above, has a web-based editor, can run in the cloud, and stores the results in your Google Drive.
* be sure you really have a short, solvable question
  - open-ended discussions are not short, solvable
  - not short if it takes several pages to ask or answer
  - constructive criticism is ok but I'll be the judge of its constructive-ness. Keep it civil and remember that you haven't paid anything for this software, it was not a custom project for you, and my goals may have nothing to do with your specific needs.
  - be prepared to answer: **"What have you tried?"**
  - if suspecting a bug, prepare and test a short, complete, verifiable list of steps to reproduce it and include that with your question
  - don't become a [help vampire](https://en.wiktionary.org/wiki/help_vampire). While it seems natural to ask preliminary questions instead of "wasting time" reading, learning, or trying things yourself -- the strategy of pushing your preparatory work (reading, learning, trying things yourself) off on others is generally seen as counterproductive.
* others can often answer your general computer or programming question faster and better than I can. Post a public question to a popular, relevant forum. The sites below are popular and include peer-review of questions and answers.  The same rules apply -- do your homework before asking:
  - for Docker questions or general software usage questions, try https://superuser.com
  - for JavaScript programming questions, try https://stackoverflow.com
  - for Economics questions, try https://economics.stackexchange.com

# Thanks for Visiting and Good Luck with your Simulations!
