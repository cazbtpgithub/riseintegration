const noderfc = require('node-rfc');

// Connection parameters for SAP system
const abapSystem = {
    ashost: 'vhwclhd4db01',
    client: '100',
    user: 'FIOET_SAP',
    passwd: 'Password@987654321',
};

// Create a new client instance
const client = new noderfc.Client(abapSystem);

async function connectAndCallRFC() {
    try {
        // Open connection to the SAP system
        console.log('Connecting to SAP system...');
        await client.open();
        console.log('Connected to SAP successfully.');

        // Name of the RFC module to call
        const rfcName = 'ZGDTEST';

        // Example parameters for the RFC (modify according to your RFC's actual import parameters)
        const rfcParams = {
            // PARAM_NAME: 'Value' 
        };

        console.log(`Calling RFC: ${rfcName}...`);
        
        // Invoke the RFC
        const result = await client.call(rfcName, rfcParams);
        
        console.log('RFC Call Successful. Result:');
        console.dir(result, { depth: null, colors: true });

    } catch (err) {
        console.error('Error occurred during SAP connection or RFC call:', err);
    } finally {
        if (client.isOpen) {
            try {
                await client.close();
                console.log('Connection closed.');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

connectAndCallRFC();
