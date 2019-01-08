/**
 *
 * breezart adapter
 *
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "breezart",                  // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Node.js breezart Adapter",  // Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <mail@breezart.com>"
 *          ]
 *          "desc":         "breezart adapter",          // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "daemon",                   // possible values "daemon", "schedule", "subscribe"
 *          "materialize":  true,                       // support of admin3
 *          "schedule":     "0 0 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "test1": true,
 *          "test2": 42,
 *          "mySelect": "auto"
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const Breezart = require('./lib/breezart-client'); //AP: Use breezart utility lib
var HOST = '192.168.1.8'; //Вывести в параметры IOB
var PORT = 1560; //Вывести в параметры IOB
var device = new Breezart({ ip: HOST, password: 59513 }); //Вывести в параметры IOB

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.breezart.0
const adapter = new utils.Adapter('breezart');

/*Variable declaration, since ES6 there are let to declare variables. Let has a more clearer definition where 
it is available then var.The variable is available inside a block and it's childs, but not outside. 
You can define the same variable name inside a child without produce a conflict with the variable of the parent block.*/
let variable = 1234;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        device.destroy();
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));

});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    
    if (!state || state.ack) return;
    
    const command = id.split('.').pop(); //Разбираем какая команда пришла 
    adapter.log.info('Command is: ' + command);

    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
    
    if (state.ack) { // Просто читаем значения
        adapter.log.info('Ack = ' + state.ack);
    
        device.getStatus(() => {
            switch ( command ) {  
                case 'RotationSpeed': state.val = device.Speed;
                adapter.log.info('Speed is ' + state.val);
                break;
                
                case 'UnitState': state.val = device.UnitState;
                adapter.log.info('UnitState is ' + state.val);
                break;
             
            }
        });
    }

    if (!state.ack) { // А здесь пишем...
        adapter.log.info('Write: Ack = ' + state.ack + ' ' + id.split('.').pop() + ' ' + state.val);
        switch ( command ) {  
            case 'RotationSpeed': 
                if (state.val > 0 && state.val < 9 ) {
                    device.setRotationSpeed(state.val, () => { adapter.log.info('setRotationSpeed: ' + state.val) });
                }
                break; 
            case 'Power': 
                device.setPower(state.val, () => { adapter.log.info('setPower: ' + state.val) });
            break; 
            
            default: adapter.log.error('Command not handled: ' + command);
        }

        //state.ack = true;
    }
        
    //adapter.setState('testVariable', true);
    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    if (adapter.config.ip) {
        main();
    }
});

function BreezartInit(){
    device.getStatus(() => {

        adapter.setState('Power', (device.UnitState === 1 || device.UnitState === 3), true); 
        adapter.setState('UnitState', device.UnitState, true); 
        adapter.setState('SpeedMin', device.SpeedMin, true); 
        adapter.setState('SpeedMax', device.SpeedMax, true); 
        adapter.setState('UnitState', device.UnitState, true); 
        adapter.setState('RotationSpeed', device.Speed, true); 
        adapter.setState('OutputTemperature', device.Tempr, true); 
        adapter.log.info('Max Speed is: ' + device.SpeedMax + ', Min Speed is: ' + device.SpeedMin);
        
    });
}


function PollBreezart(){
    device.getStatus(() => {
        //adapter.log.info('getStatus');
        //adapter.log.info('Current Speed is: ' + device.Speed + ', OldSpeed was: ' + device.OldSpeed);

        adapter.setState('Power', (device.UnitState === 1 || device.UnitState === 3), true); 
        adapter.setState('UnitState', device.UnitState, true); 
        if  (device.Speed > 0 && device.Speed < 9 && device.Speed != device.OldSpeed) { 
            adapter.setState('RotationSpeed', device.Speed, true); 
            adapter.log.info('Current Speed is: ' + device.Speed + ', OldSpeed was: ' + device.OldSpeed);
        }
        adapter.setState('OutputTemperature', device.Tempr, true); 
        
    });
}

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('config test1: '    + adapter.config.test1);
    adapter.log.info('config test1: '    + adapter.config.test2);
    adapter.log.info('config mySelect: ' + adapter.config.mySelect);
    adapter.log.info('config ip: ' + adapter.config.ip);


    /**
     *
     *      For every state in the system there has to be also an object of type state
     *
     *      Here a simple breezart for a boolean variable named "testVariable"
     *
     *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
     *
     */

    
    //  adapter.setObject('testVariable', {
    //     type: 'state',
    //     common: {
    //         name: 'testVariable',
    //         type: 'boolean',
    //         role: 'indicator'
    //     },
    //     native: {}
    // });

    adapter.setObjectNotExists('Manual_mode', {
        type: "state",
        common: {
          name: "Manual_mode",
          role: "state",
          type: "boolean",
          desc: "Для ручного режима",
          read: true,
          write: true,
          def: false
        },
        native: {}
      });

      adapter.setObjectNotExists('RotationSpeed', {
        type: 'state',
        common: {
            name: 'RotationSpeed',
            type: 'number',
            role: 'level',
            read: true,
            write: true,
            min: 1,
            max: 8,
            desc: 'Rotation fan speed'
        },
        native: {}
    });

    adapter.setObjectNotExists('SpeedMin', {
        type: 'state',
        common: {
            name: 'MinSpeed',
            type: 'number',
            role: 'level',
            read: true,
            write: false,
            min: 1,
            max: 8,
            desc: 'Min fan speed'
        },
        native: {}
    });

    adapter.setObjectNotExists('SpeedMax', {
        type: 'state',
        common: {
            name: 'MaxSpeed',
            type: 'number',
            role: 'level',
            read: true,
            write: false,
            min: 1,
            max: 8,
            desc: 'Max fan speed'
        },
        native: {}
    });
   
    adapter.setObjectNotExists('OutputTemperature', {
        type: 'state',
        common: {
            name: 'OutputTemperature',
            type: 'number',
            role: 'level',
            read: true,
            write: true,
            min: -50,
            max: 70,
            desc: 'Breezart Output Temperature'
        },
        native: {}
    });

    adapter.setObjectNotExists('UnitState', {
        type: 'state',
        common: {
            name: 'UnitState',
            type: 'number',
            role: 'level',
            read: true,
            write: false,
            min: 0,
            max: 3,
            desc: 'Unit state'
        },
        native: {}
    });

    adapter.setObjectNotExists('Power', {
        type: 'state',
        common: {
            name: 'Power',
            type: 'boolean',
            role: 'state',
            read: true,
            write: true,
            def: false,
            desc: 'Set Power on|off'
        },
        native: {}
    });

    // in this breezart all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    adapter.getState('RotationSpeed');


    //AP:  New Breezart device created globally
      
    device.connect(); 
    
    BreezartInit();
    
    PollBreezart();
    setInterval(PollBreezart, 10000);
}

