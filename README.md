single-market-robot-simulator
========
[![Build Status](https://travis-ci.org/DrPaulBrewer/single-market-robot-simulator.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/single-market-robot-simulator)
[![Coverage Status](https://coveralls.io/repos/github/DrPaulBrewer/single-market-robot-simulator/badge.svg?branch=master)](https://coveralls.io/github/DrPaulBrewer/single-market-robot-simulator?branch=master)


A stand alone nodejs app and software module for creating numerical experiments with a single market.
The induced supply and demand is configurable, as are the types of trading robots populating the market.

## Programmer's Documentation on ESDoc

The [ESDoc site for single-market-robot-simulator](https://doc.esdoc.org/github.com/DrPaulBrewer/single-market-robot-simulator/) contains documentation prepared from source code of this module.

## Installation

To run as a nodejs command-line program, clone this repository and run `npm install` from the cloned
directory to install the dependencies:

     git clone https://github.com/DrPaulBrewer/single-market-robot-simulator
     cd ./single-market-robot-simulator
     npm install     

If, instead, you want to use it as a library in another program from npm, simply use `npm i` as usual:

     npm i single-robot-market-simulator -S

To use this as a library on the browser with `jspm`, you should set an override option on install forcing dependency `fs` to `@empty`. 
This is done in the [robot-trading-webapp](http://github.com/DrPaulBrewer/robot-trading-webapp) example app that uses this code as a dependency.
    
## Configuration

Configuration in the stand alone app occurs in the file `config.json` which is read by `main()` in stand-alone app mode.

When used as a software module, the configuration object is passed to the function `runSimulation()` or the constructor `new Simulation()`.
    
Format for config.json is given in configSchema.json as a JSON Schema.

### Configurable supply and demand

The values and costs to be distributed among the trading robots are 
configured in the properties `buyerValues` and `sellerCosts`, each an array that is distributed round-robin style to
the buyer robots and seller robots respectively.  Each of these values and costs will be distributed exactly once at the
beginning of each period of the market. To be clear, if the `numberOfBuyers` exceeds the length of `buyerValues`, then some
buyers will not receive a value. This form of specification is not convenient for every imaginable use, but it is 
convenient for setting a particular aggregate supply and demand and keeping it constant while tinkering with the number
of buyers, sellers or other parameters.

The descending sorted `buyerValues` can be used to form a step function that is the aggregate demand function for the market.

Similarly the ascending sorted `sellerCosts` can be used to form a step function that is the aggregate supply function for the market. 

### Robot Trading agents

The types of buyers and sellers are set in configration properties `buyerAgentType` and `sellerAgentType` and the buyers and sellers configured round-robin from these types.  
For example, if there is only one type of buyer, then all buyers are that type.  If there are two types of buyers configured
then half the buyers will be the first type, and half the buyers will be the second type if the number of buyers is even but
if the number of buyers is odd then there will be an extra buyer of the first type. Perhaps a good practice is to have
the buyerAgentType and sellerAgentType arrays have an entry for each buyer and seller, but for convenience in simple
cases the round robin is used.  

The module [market-agents](https://github.com/DrPaulBrewer/market-agents) is imported to provide the robot trading agents.  

The algorithms provided are intentionally fairly simple when compared to Neural Networks and some other approaches
to machine learning. Several of the algorithms chosen have been the topics of papers in the economics literature.

Among the choices are:

* The [Zero Intelligence trader](https://en.wikipedia.org/wiki/Zero-intelligence_trader) of Gode and Sunder[1] that bids/asks randomly for non-zero profit.
* Kaplan's Sniper algorithm
* a "truthful" or identity-function algorithm that always bids the value
* a bisection algorithm that bids or asks halfway between the current bid/current ask if profitable to do so, and initially bids/asks an extreme value when no bid/ask is present
* a "oneupmanship" algorithm that increases the bid or decreases the ask by 1 unit if profitable to do so
* others, and a base class for writing your own algorithm

[1] 

## Usage 

###Stand Alone App

When used as a stand alone app `node index.js` or `npm run` will run the simulation, reading the `config.json` file and
outputting various log files, including: `buyorders.csv`, `sellorders.csv`, `ohlc.csv`, `trades.csv`, `profits.csv`, and `volume.csv`. 

With the exception of `profits.csv` these logs have header rows and are in comma-separated value format, compatible with
Excel and other spreadsheets and most analysis software that accepts  a`.csv` file as data input.

### As a module
    
    import * as SMRS from 'single-market-robot-simulator'; // ES6

    const SMRS = require("single-market-robot-simulator"); // CJS

returns an object containing constructors for `Log`, `Simulation` and function `runSimulation`.  Simulation functionality
will run either in the browser or nodejs without modification ("isomorphic javascript").  On the browser, security policies
require different procedures for writing out files.  Therefore, the log files are not immediately written out to .csv files
(as with the stand alone app) but are maintained in memory for use with browser-based plotting software.  It is the 
responsibility of other browser software (e.g. `single-market-robot-simulator-savezip`) to write the logs to browser-side
`.csv` files.    

Simulations can be run in either synchronous or asynchronous mode.  Asynchronous mode is useful for running on the browser
so that the event loop and user interface does not freeze while waiting for simulation results.

Example source code for a web-based simulator based on `single-market-robot-simulator` may be found at

http://github.com/DrPaulBrewer/robot-trading-webapp

and the resulting simulator web app is at

http://drpaulbrewer.github.io/robot-trading-webapp/

## Tests

    npm test
    
will run the tests, if you have node 6 or later and mocha installed.  You can also click on the build or coverage badges to view public test reports.

## Copyright 

Copyright 2016- Paul Brewer, Economic and Financial Technology Consulting LLC

## License: 

[The MIT License](./LICENSE.md)



