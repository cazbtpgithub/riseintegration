const axios = require('axios');
const fs = require('fs');
const path = require('path');

const credPath = path.join(__dirname, '../src/config/sapCredentials.json');
const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));

async function testOrder() {
    // Test A: Ersda first, then Matnr in single $filter
    const urlA = `http://vhwclds4ap01.sap.wco.com:8000/sap/opu/odata/sap/ZMM_MATERIAL_DETAILS_SRV/MaterialSet?$filter=Ersda ge datetime'2025-03-29T00:00:00' and Ersda le datetime'2025-03-29T23:59:59' and Matnr eq 'DTG652D251'&sap-client=110&$format=json`;
    console.log("\nTesting URL A (Ersda first):", urlA);
    try {
        const resA = await axios.get(urlA, { auth: { username: creds.username, password: creds.password } });
        console.log("URL A SUCCESS!", resA.data.d.results ? resA.data.d.results.length : resA.data);
    } catch(e) {
        console.log("URL A FAIL:", e.response ? e.response.data : e.message);
    }

    // Test B: Dual $filter params as written in user prompt
    const urlB = `http://vhwclds4ap01.sap.wco.com:8000/sap/opu/odata/sap/ZMM_MATERIAL_DETAILS_SRV/MaterialSet?$filter=Ersda ge datetime'2025-03-29T00:00:00' and Ersda le datetime'2025-03-29T23:59:59'&$filter=Matnr eq 'DTG652D251'&sap-client=110&$format=json`;
    console.log("\nTesting URL B (Dual $filter):", urlB);
    try {
        const resB = await axios.get(urlB, { auth: { username: creds.username, password: creds.password } });
        console.log("URL B SUCCESS!", resB.data.d.results ? resB.data.d.results.length : resB.data);
    } catch(e) {
        console.log("URL B FAIL:", e.response ? e.response.data : e.message);
    }
}

testOrder();
