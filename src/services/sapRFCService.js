let noderfc;
let isNativeRFCAvailable = false;

try {
    noderfc = require('node-rfc');
    isNativeRFCAvailable = true;
    console.log('Native node-rfc module loaded successfully.');
} catch (err) {
    console.warn('WARNING: node-rfc is not available. Native RFC calls will fail. Please install Python, C++ Build Tools, and SAP NW RFC SDK if you need native RFC capabilities.');
}

const getAbapSystemParams = () => {
    return {
        ashost: process.env.SAP_HOST_RFC || 'vhwclhd4db01',
        client: process.env.SAP_CLIENT || '100',
        user: process.env.SAP_USER || 'FIOET_SAP',
        passwd: process.env.SAP_PASSWORD || 'Password@987654321',
    };
};

/**
 * Connects to SAP natively and calls the ZGDTEST RFC.
 * This requires the native node-rfc addon to be built successfully.
 */
const callZGDTEST = async (params = {}) => {
    if (!isNativeRFCAvailable) {
        throw new Error('Native SAP RFC module (node-rfc) is not installed on this system. Please use the OData endpoint or set up your C++/Python build environment.');
    }

    const client = new noderfc.Client(getAbapSystemParams());

    try {
        await client.open();
        console.log('Connected to SAP natively via node-rfc.');

        const rfcName = 'ZGDTEST';
        const result = await client.call(rfcName, params);
        
        return result;
    } catch (err) {
        console.error('Error occurred during native SAP RFC call:', err);
        throw new Error(err.message || 'Error calling native RFC');
    } finally {
        if (client.isOpen) {
            try {
                await client.close();
                console.log('Native SAP connection closed.');
            } catch (err) {
                console.error('Error closing native connection:', err);
            }
        }
    }
};

module.exports = {
    callZGDTEST,
    isNativeRFCAvailable
};
