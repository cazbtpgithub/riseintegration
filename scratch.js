const axios = require('axios');
const url = 'http://vhwclds4ap01.sap.wco.com:8000/sap/opu/odata/sap/API_INSPECTIONLOT_SRV/$metadata';

axios.get(url, {
  auth: { username: 'FIOET_SAP', password: 'Password@987654321' }
}).then(r => {
  const data = r.data;
  
  // Extract A_InspectionLotType
  const lotTypeMatch = data.match(/<EntityType Name="A_InspectionLotType".*?<\/EntityType>/s);
  if (lotTypeMatch) {
    const keys = [...lotTypeMatch[0].matchAll(/<PropertyRef Name="([^"]+)"/g)].map(m => m[1]);
    console.log("Keys for A_InspectionLot:", keys);
  }

  // Extract A_InspectionResultValueType
  const resultTypeMatch = data.match(/<EntityType Name="A_InspectionResultValueType".*?<\/EntityType>/s);
  if (resultTypeMatch) {
    const keys = [...resultTypeMatch[0].matchAll(/<PropertyRef Name="([^"]+)"/g)].map(m => m[1]);
    console.log("Keys for A_InspectionResultValue:", keys);
  }
}).catch(e => console.error(e.message));
