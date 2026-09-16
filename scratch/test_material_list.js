const sapODataService = require('../src/services/sapODataService');

async function testFilterLogic() {
    console.log("Testing filter scenarios for getMaterialList...");

    const testCases = [
        { name: "1. Single Material ID", params: { Matnr: 'DTG652D250' } },
        { name: "2. Material Range", params: { MatnrFrom: 'DTG652D250', MatnrTo: 'DTG652D251' } },
        { name: "3. Material Type", params: { Mtart: 'ZSFG' } },
        { name: "4. Date Range", params: { ErsdaFrom: '2025-03-29T00:00:00', ErsdaTo: '2025-03-29T23:59:59' } },
        { name: "5. Date Range + Material ID (Ersda first)", params: { ErsdaFrom: '2025-03-29T00:00:00', ErsdaTo: '2025-03-29T23:59:59', Matnr: 'DTG652D251' } }
    ];

    for (const test of testCases) {
        console.log(`\n==================================================`);
        console.log(`Test: ${test.name}`);
        try {
            const res = await sapODataService.getMaterialList(test.params);
            console.log("SUCCESS! Returned record count:", Array.isArray(res) ? res.length : 1);
            if (Array.isArray(res) && res.length > 0) {
                console.log("Sample Data:", JSON.stringify(res[0], null, 2));
            }
        } catch (err) {
            console.log("ERROR Response:", err.message);
        }
    }
}

testFilterLogic();
