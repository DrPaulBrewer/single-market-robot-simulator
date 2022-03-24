const fs = require('fs');

import('./index.mjs').then((SMRS)=>{
    main(SMRS);
});

function main(SMRS){

    const { Simulation, parse, secureJSONPolicy } = SMRS;

    /**
     * in stand-alone mode, read simulation config from first named .json file and run simulation synchronously, outputting log files in .csv format
     */

    /* suggested by Krumia's http://stackoverflow.com/users/1461424/krumia */
    /* posting at http://stackoverflow.com/a/25710749/103081 */

    const simConfigFileName = process.argv.find((s)=>(s.endsWith(".json")));

    if (!simConfigFileName)
      throw new Error("no sim.json configuration file specified on command line");

    function mainPeriod(sim){
        fs.writeFileSync('./period', ''+sim.period);
    }

    const config = parse(
      fs.readFileSync(simConfigFileName, 'utf8'),
      secureJSONPolicy
    );

    config.logToFileSystem = true;

    new Simulation(config).run({sync:true, update:mainPeriod });

}
