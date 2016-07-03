single-market-robot-simulator
========

A stand alone nodejs app or module for creating robot trading simulations in a single market with configurable supply and demand. 

By default uses Gode and Sunder's Zero Intelligence Robots, but you can also write your own robots.

##Installation

To run as a nodejs command-line program, clone this repository and run `npm install` from the cloned
directory to install the dependencies:

     git clone https://github.com/DrPaulBrewer/single-market-robot-simulator
     cd ./single-market-robot-simulator
     npm install     

If, instead, you want to use it as a library in another program, simply use `npm i` as usual:

     npm i single-robot-market-simulator -S
    
##Configuration

Configuration in the stand alone app occurs in the file `config.json` which is read by `main()` in stand-alone app mode.

When used as a software module, the configuration object is passed to `runSimulation` or `new Simulation`.
    
Format for config.json is given in configSchema.json as a JSON Schema.

##Usage 

###Stand Alone App

When used as a stand alone app `node index.js` or `npm run` will run the simulation, reading the `config.json` file and
outputting log files: `buyorders.csv`, `sellorders.csv`, `ohlc.csv`, `trades.csv`, `profits.csv`, and `volume.csv`. 

With the exception of `profits.csv` these logs have header rows and are in comma-separated value format, compatible with
Excel and other spreadsheets and most analysis software that accepts  a`.csv` file as data input.

###As a module

    require("single-market-robot-simulator")

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

Documentation will be expanded as time permits.  

##Tests

    npm test
    
will run the tests.  You can also click on the build or coverage badges to view public test reports.

##Copyright 

Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC

##LICENSE: MIT License

This software is provided as-is.  Also, versions less than 1.0.0 represent software under development that is subject
to rapid change, and may not function or not fully function as intended. You may wish to review the results of 
automated tests, as well as write your own additional tests, before using it in an application.


