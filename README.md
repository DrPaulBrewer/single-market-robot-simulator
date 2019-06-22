# single-market-robot-simulator

[![Greenkeeper badge](https://badges.greenkeeper.io/DrPaulBrewer/single-market-robot-simulator.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/DrPaulBrewer/single-market-robot-simulator.svg?branch=master)](https://travis-ci.org/DrPaulBrewer/single-market-robot-simulator)
[![Coverage Status](https://coveralls.io/repos/github/DrPaulBrewer/single-market-robot-simulator/badge.svg?branch=master)](https://coveralls.io/github/DrPaulBrewer/single-market-robot-simulator?branch=master)


A stand alone nodejs app and software module for creating numerical experiments with robots trading in a single market.

The induced supply and demand is configurable, as are the types and speeds of trading robots populating the market.

This code can run either in a browser or on NodeJS and would
normally be a "middle" portion of a code stack.  Visualizations and friendly user-interfaces are the responsibility of other code, or you, the user.

## Programmer's Documentation on ESDoc

The [ESDoc site for single-market-robot-simulator](https://doc.esdoc.org/github.com/DrPaulBrewer/single-market-robot-simulator/) contains documentation prepared from source code of this module.

## Use of Modern JavaScript -- Babel compiler

Note that the source code uses modern JavaScript syntax and must be compiled with the Facebook-sponsored open source Babel compiler. The source code is in ./src and the Babel-compiled version in ./build.  The babel tools are linked as package.json devDependencies.  This is primarily a concern for other programmers and does not affect stand-alone usage.

## Installation

### installation not necessary -- use Docker

No installation is necessary if you have Docker (highly recommended for Windows and Mac usage). Skip to the "Usage" section.    

### as stand alone JavaScript software

To run as a nodejs command-line program, clone this repository and run `npm install -D` or `npm i -D` from the cloned directory to install all of the dependencies, including the testing and development dependencies `-D`:

     git clone https://github.com/DrPaulBrewer/single-market-robot-simulator
     cd ./single-market-robot-simulator
     npm install -D  

### as a library in another open source npm JavaScript program

If, instead, you want to use it as a library in another module to be released on npm, simply use `npm i -S` as usual:

     npm i single-robot-market-simulator -S

### as a library in a JavaScript web app

To use this as part of a web site, you will probably want
to look at something like browserify, jspm, or webpack to
server as a wrapper and help with bundling and integration.

To use this as a library on the browser with `jspm`, you should set an override option on install forcing dependency `fs` to `@empty`.   

This was done in the [robot-trading-webapp](http://github.com/DrPaulBrewer/robot-trading-webapp) example prototype web app that uses a very early version of this code (1.0.0) from May, 2017.  The "robot-trading-webapp" prototype is no longer under active development and does not receive updates or bug fixes. You may still try it but I do not recommend it for producing new research data.

It can also be used with `webpack`.  I do not recall if any
special settings are required.

### Paid App Under Development

An afforable [paid web app](https://econ1.net) is in development that is much nicer, includes visualization and an editor, has time-saving features, and integrates with Google Cloud and Google Drive,

## Configuration

Configuration in the stand alone app occurs in a .json file called `config.json` or `sim.json`.  `config.json` is currently read by `main()` by default in stand-alone app mode but this may change to `sim.json` in v6.0.0 to better agree with other contexts ([2], and the Docker stand-alones) where the file `sim.json` is used,  

When used as a software module, the configuration object is passed to the function `runSimulation()` or the constructor `new Simulation()`.

A partial (but still valid) format for `config.json` is given in `configSchema.json` as a JSON Schema.

### Configurable supply and demand

The values and costs to be distributed among the trading robots are configured in the properties `buyerValues` and `sellerCosts`, each an array that is distributed round-robin style to the buyer robots and seller robots respectively.  Each of these values and costs will be distributed exactly once at the beginning of each period of the market.

To be clear, if the `numberOfBuyers` exceeds the length of `buyerValues`, then some buyers will not receive a unit value. Those buyers will exist but do nothing.   If the length of `buyerValues` exceeds the `numberOfBuyers` then some buyers will receive more than one unit value, which is OK and even expected. By "round-robin" I mean that an element `j` of `buyerValues` will be assigned to buyer `j mod numberOfBuyers` .   This form of specification is not convenient for every imaginable use, but it is convenient for setting a particular aggregate supply and demand and keeping it constant while tinkering with the number of buyers, sellers or other parameters.

The descending sorted `buyerValues` can be used to form a step function that is the aggregate demand function for the market.

Similarly the ascending sorted `sellerCosts` can be used to form a step function that is the aggregate supply function for the market.

### Robot Trading agents

The types of buyers and sellers are set in configration properties `buyerAgentType` and `sellerAgentType` and the buyers and sellers configured round-robin from these types.  
For example, if there is only one type of buyer, then all buyers are that type.  If there are two types of buyers configured then the buyers will alternate between these types, with half the buyers will be the first type, and half the buyers will be the second type if the number of buyers is even. If the number of buyers is odd then there will be an extra buyer of the first type. Perhaps a good practice is to have
the buyerAgentType and sellerAgentType arrays have an entry for each buyer and seller, but for convenience in simple
cases the round robin is used.   

The module [market-agents](https://github.com/DrPaulBrewer/market-agents) is imported to provide the robot trading agents.  

The algorithms provided are intentionally fairly simple when compared to Neural Networks and some other approaches
to machine learning. Several of the algorithms chosen have been the topics of papers in the economics literature.

Among the choices are:

* The [Zero Intelligence trader](https://en.wikipedia.org/wiki/Zero-intelligence_trader) of Gode and Sunder[1] that bids/asks randomly for non-zero profit.
* a Sniper similar to Kaplan's Sniper algorithm but explicitly liquidity-reducing.  For now, I still call it "KaplanSniperAgent" because of its historical roots.  See [2].
* a "truthful" or identity-function algorithm that always bids the unit value or asks the unit cost.
* a bisection algorithm that bids or asks halfway between the current bid/current ask if profitable to do so, and initially bids/asks an extreme value when no bid/ask is present
* a "oneupmanship" algorithm that increases the bid or decreases the ask by 1 unit if profitable to do so
* others, and a base class for writing your own algorithm

## Usage

### Stand Alone App

#### when run from Docker
It is possible to run the software on Docker without having a Linux system (otherwise recommended), and without installing nodejs and npm (otherwise required).  Docker downloads a Linux container containing everything needed and runs it on any computer.

To run on Docker, you must first install [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows 10 Pro, Windows 10 for Education, Mac) or [Docker community edition](https://docs.docker.com/install/) (Linux).

Create a work directory containing a `sim.json` file with the simulation configuration.  This follows the format given above
for `config.json` only the filename is changed.

The most recent Docker container is for version 5.6.0.  To
run that, use this docker command:

    docker run -it \
           -v /path/to/your/work/directory:/work \
           drpaulbrewer/single-market-robot-simulator:5.6.0

To run the simulator code as it existed for the research project [2] (version 4.3.0),  use this Docker command:

    docker run -it \
           -v /path/to/your/work/directory:/work \
           drpaulbrewer/single-market-robot-simulator:4.3.0

#### when installed from GitHub
 If installed from github onto a suitable system (preferably Linux, though it may run on Windows 10 or Mac -- and with nodejs and npm previously installed) it can be used as a stand alone nodejs app.

 `node build/index.js` from the installation directory will run the simulation, reading the `config.json` file and outputting various log files.
 
 You can name a file like `/my-files/research/project123/sim.json` but the simulator will then fetch that file but continue to run and output market data files into the current directory, and not necessarily in the directory where that `sim.json` file is located.  Instead, consider copying the `sim.json` file to a new directory, `cd` to that new directory, and run
 
 `node /path/to/single-market-robot-simulator/build/index.js sim.json`  
 
 where you should replace `/path/to/` with the actual directory path where the simulator is installed.


#### Outputs

A number of .csv comma-separated-value files are produced containing the market data.  

Output files include:

`buyorders.csv`, `sellorders.csv`, `ohlc.csv`, `trades.csv`, `profits.csv`, and `effalloc.csv`.

These logs have header rows and are  compatible with Excel and other spreadsheets and most analysis software.

There are no output progress messages unless `quiet: false` is in the `sim.json` properties.  There is a file called `period` that can be used as a progress indicator.  It contains only a single number -- the current period number.  

### Usage as a software module

Depending on whether you are using ES6 or CJS modules, importing looks like this:

    import * as SMRS from 'single-market-robot-simulator'; // ES6

    const SMRS = require("single-market-robot-simulator"); // CJS

and returns an object `SMRS` containing a constructor for `Simulation` and function `runSimulation`.  Functionality
will run either in the browser or nodejs without modification ("isomorphic javascript").  

On the browser, standard browser security policies require different procedures for writing out files.  Therefore, the data logs cannot be immediately written out to .csv files
(as with the stand alone app) but are maintained in memory for use with other systems, such as browser-based plotting software.  It is the responsibility of other software (e.g. `single-market-robot-simulator-savezip`) to write the logs to browser-side `.csv` files or elsewhere and/or to provide for visualizations.

Simulations can be run in either synchronous or asynchronous mode.  Asynchronous mode is useful for running on the browser
so that the event loop and user interface do not freeze while waiting for simulation results.

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

Paul Brewer and Anmol Ratan (2019), "Profitability, Efficiency, and Inequality in Double Auction Markets with Snipers."  Accepted at Journal of Economic Behavior and Organization, forthcoming.

## Before asking the author for help

#### Foreword
This portion is written for a relatively non-technical audience, including researchers in Economics and/or beginning programmers, who might be interested in getting set up to use the software to run market simulations.

I will appreciate a social "hello" from researchers, students, and others attempting to use the free version of this software.

But I do not have  time to answer every question.  Nor can I answer every question -- for free -- in a way that will be satisfying or timely to everyone.  I have written this section to help with that issue.

Technology can be frustrating, and
having a conversation about frustration that also involves lacking useful notes and being ill-prepared, is often mutually frustrating and tends to be a waste of time.  If that seems arrogant, imagine I am talking about myself.  

I lack useful notes on what happens if the software is run on unsuitable machines.  And I'm ill-prepared to answer questions for free when I spent years producing the free software for free and co-wrote the first peer-reviewed research article for free (that the journal publisher will hide behind a paywall in lieu of a few thousand dollars, while in tech we thankfully can release free software for free). Like most people, I need to make some money.

Keep in mind that you might also lack useful notes or be ill-prepared (i.e. it doesn't work but you don't know why and you didn't write anything down about the error messages or exactly what you did; or your question is about how to construct a
simulation without reading the documentation or studying other
examples).  

But on a happier note...

#### Availability for Engagements

If you would like to buy consulting time for either occasional assistance with a project or full-service creation and execution of a project -- you may find more availability.  I am located in the USA and charge USA prices.

The experience from **years** spent developing this software can not be quickly communicated to someone who has never written a single page JavaScript app. But the technical knowledge can be "self-taught" from available online and print sources (O'Reilley Press) and obtained without a CS or software engineering degree. Before this project, I assisted with technology for the California Institute of Technology, Laboratory for Experimental Economics and Political Science. So, I've been at this a while.  

If you are at a university and want me to speak with or advise a student developer team, there should be something
easily forseeable in it for the future development of this project (e.g. open source and related and building on what existed before, without conflicting with any other related activities), and funding and support equivalent to a tenured or pro-staff position at US rates. Without funding, I can't solve your new problem for free simply for the science or another co-authored publication for my CV or even for the contribution to free software. At zero price there is tons of demand for this sort of thing, or for almost anything really.  

#### Questions

Before asking me a question, please try these things first:
* consider that your problem might be solved faster by
  - asking a local computer-savvy colleague to sit down with you and review what is happening. I can't see it from here
  and if you need to do a Google or Skype Hangout for me to see it, an emailed bill for my time should be expected.
  - perhaps upgrading your computer. More cores, 8 GB or more ram, and an SSD are all a plus. Typically a full-sized desktop has more heat dissipation and can be higher performance than a laptop or mini cube.
  - optionally spending less than $100 on the paid version of this software when available at https://econ1.net --  which will be used over the web (no installation), be compatible with the free Docker usage method above, has a web-based editor, can run in the cloud, and stores the results in your Google Drive
  - optionally renting a more power computer on the cloud.  
* be sure you really have a short, solvable question
 - open-ended discussions are not short, solvable questions
 - constructive criticism is ok but I'll be the judge of its constructive-ness. Keep it civil and remember that you haven't paid anything for this software, it was not a custom project for you, and my goals may have nothing to do with your specific needs.
 - anything taking several pages to ask or answer (like this rant and advice) is too broad
 - explaining the question out loud to an unfamiliar (possibly fictional) person can help you solve your own problem.  Also known as [Rubber duck debugging](https://en.wikipedia.org/wiki/Rubber_duck_debugging)
 - if suspecting a bug, prepare and test a list of steps to reproduce it
 - be prepared to answer: **"What have you tried?"**
 - don't be be a [help vampire](https://en.wiktionary.org/wiki/help_vampire). While it seems natural to ask preliminary questions instead of "wasting time" reading, learning, or trying things yourself -- the strategy of pushing your preparatory work (reading, learning, trying things yourself) off on others is generally seen as counterproductive.
* post a public question to a relevant forum (the sites mentioned below are popular and include peer-review of questions and answers):
 - for Docker questions or general software usage questions, try https://superuser.com
 - for JavaScript programming questions, try https://stackoverflow.com
 - for Economics questions, try https://economics.stackexchange.com

# Thanks for Visiting and Good Luck with your Simulations!
