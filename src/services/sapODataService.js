const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Basic Auth credentials for SAP (Reads dynamically from config file)
const getSapAuth = () => {
    try {
        const credPath = path.join(__dirname, '../config/sapCredentials.json');
        const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        return {
            username: creds.username,
            password: creds.password
        };
    } catch (error) {
        console.error('Error reading SAP credentials file:', error.message);
        // Fallback to .env variables if file read fails
        return {
            username: process.env.SAP_USER,
            password: process.env.SAP_PASSWORD
        };
    }
};

// Base URL host for the SAP service (Reads dynamically from config file)
const getSapBaseUrl = () => {
    try {
        const credPath = path.join(__dirname, '../config/sapCredentials.json');
        const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        return creds.baseUrl || process.env.SAP_HOST;
    } catch (error) {
        console.error('Error reading SAP config file for baseUrl:', error.message);
        return process.env.SAP_HOST;
    }
};

// Base URL for the SAP OData service
// This points to our new sample service created via SEGW
const getBaseUrl = () => {
    return `${getSapBaseUrl()}/sap/opu/odata/sap/Z_SAMPLE_ODATA_SRV`;
};

/**
 * Fetch data from SAP using a GET request.
 */
const fetchData = async () => {
    try {
        // Calling our newly created UserSet
        const response = await axios.get(`${getBaseUrl()}/UserSet`, {
            auth: getSapAuth(),
            headers: {
                'Accept': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('SAP GET request failed:', error.response ? error.response.data : error.message);
        throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

/**
 * Fetch a CSRF token from SAP (required for POST/PUT/DELETE).
 */
const fetchCsrfToken = async () => {
    try {
        const response = await axios.get(getBaseUrl(), {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });

        // The token is returned in the headers
        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];

        return { token, cookies };
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token from SAP');
    }
};

/**
 * Post data to SAP using a POST request.
 * Handles the CSRF token fetching automatically.
 */
const postData = async (payload) => {
    try {
        // 1. Fetch the CSRF token and session cookies
        const { token, cookies } = await fetchCsrfToken();

        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        // 2. Make the POST request with the token and cookies
        // Posting to UserSet
        const response = await axios.post(`${getBaseUrl()}/UserSet`, payload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('SAP POST request failed:', error.response ? error.response.data : error.message);
        throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

/**
 * Call the ZGDTEST RFC via OData (assuming it's wrapped in an OData service)
 */
const callZGDTESTOData = async (payload) => {
    try {
        const { token, cookies } = await fetchCsrfToken();

        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        // Posting to the ZGDTEST OData entity/endpoint (modify as per actual SAP Gateway config)
        const response = await axios.post(`${getBaseUrl()}/ZGDTESTSet`, payload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('SAP ZGDTEST OData request failed:', error.response ? error.response.data : error.message);
        throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
    }
};

/**
 * Fetch Material Stock data using the provided endpoint and dynamic credentials/parameters.
 */
const getMaterialStock = async (params) => {
    try {
        const material = params.Material || '';
        const plant = params.Plant || '';
        const customer = params.Customer || '';
        const supplier = params.Supplier || '';
        const inventoryStockType = params.InventoryStockType || '';
        
        const filterStr = `$filter=Material eq '${material}' and Plant eq '${plant}' and Customer eq '${customer}' and Supplier eq '${supplier}' and InventoryStockType eq '${inventoryStockType}'`;
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?${filterStr}&$format=json&sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'Accept': 'application/json'
            }
        });

        // Parse the OData response and map only the requested fields
        let results = [];
        if (response.data && response.data.d && response.data.d.results) {
            results = response.data.d.results;
        } else if (response.data && response.data.value) { // OData V4 fallback
            results = response.data.value;
        } else {
            // Fallback if not wrapped in d.results or value
            results = Array.isArray(response.data) ? response.data : [response.data];
        }

        const parsedData = results.map(item => ({
            Material: item.Material,
            Plant: item.Plant,
            StorageLocation: item.StorageLocation,
            Batch: item.Batch,
            Supplier: item.Supplier,
            Customer: item.Customer,
            WBSElementInternalID: item.WBSElementInternalID,
            SDDocument: item.SDDocument,
            SDDocumentItem: item.SDDocumentItem,
            InventorySpecialStockType: item.InventorySpecialStockType,
            InventoryStockType: item.InventoryStockType,
            MaterialBaseUnit: item.MaterialBaseUnit,
            MatlWrhsStkQtyInMatlBaseUnit: item.MatlWrhsStkQtyInMatlBaseUnit
        }));

        return parsedData;
    } catch (error) {
        console.error('Material Stock GET request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch Inspection Result Value using dynamic parameters.
 */
const getInspectionResultValue = async (params) => {
    try {
        const inspectionLot = params.InspectionLot || '';
        const inspPlanOperationInternalID = params.InspPlanOperationInternalID || '';
        const inspectionCharacteristic = params.InspectionCharacteristic || '';
        const inspResultValueInternalID = params.InspResultValueInternalID || '';
        
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_INSPECTIONLOT_SRV/A_InspectionResultValue(InspectionLot='${inspectionLot}',InspPlanOperationInternalID='${inspPlanOperationInternalID}',InspectionCharacteristic='${inspectionCharacteristic}',InspResultValueInternalID='${inspResultValueInternalID}')?$format=json&sap-client=110`;
        
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'Accept': 'application/json'
            }
        });

        // The response might be just an object or wrapped in d
        let results = response.data.d || response.data;
        return Array.isArray(results) ? results : [results];

    } catch (error) {
        console.error('Inspection Result Value GET request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch a CSRF token specifically for Material Document API.
 */
const fetchMaterialDocumentCsrfToken = async () => {
    try {
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });
        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return { token, cookies };
    } catch (error) {
        const detail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('Failed to fetch Material Document CSRF token:', detail);
        throw new Error(`Could not retrieve CSRF token for Material Document API: ${detail}`);
    }
};

/**
 * Post Material Document Header to SAP.
 */
const postMaterialDocumentHeader = async (payload) => {
    try {
        const { token, cookies } = await fetchMaterialDocumentCsrfToken();
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader?sap-client=110`;
        const response = await axios.post(url, payload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // The response might be wrapped in .d for OData V2
        const rawData = response.data.d || response.data;
        
        // Filter the response to only include the requested fields
        const filteredData = {
            MaterialDocumentYear: rawData.MaterialDocumentYear,
            MaterialDocument: rawData.MaterialDocument,
            InventoryTransactionType: rawData.InventoryTransactionType,
            DocumentDate: rawData.DocumentDate,
            PostingDate: rawData.PostingDate,
            CreationDate: rawData.CreationDate,
            CreationTime: rawData.CreationTime,
            CreatedByUser: rawData.CreatedByUser,
            MaterialDocumentHeaderText: rawData.MaterialDocumentHeaderText,
            ReferenceDocument: rawData.ReferenceDocument,
            VersionForPrintingSlip: rawData.VersionForPrintingSlip,
            ManualPrintIsTriggered: rawData.ManualPrintIsTriggered,
            CtrlPostgForExtWhseMgmtSyst: rawData.CtrlPostgForExtWhseMgmtSyst,
            GoodsMovementCode: rawData.GoodsMovementCode
        };

        return filteredData;
    } catch (error) {
        console.error('Material Document POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Cancel Material Document.
 */
const cancelMaterialDocument = async (params) => {
    try {
        const { token, cookies } = await fetchMaterialDocumentCsrfToken();
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        const materialDocumentYear = params.MaterialDocumentYear || '';
        const materialDocument = params.MaterialDocument || '';

        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/Cancel?MaterialDocumentYear='${materialDocumentYear}'&MaterialDocument='${materialDocument}'&sap-client=110`;
        const response = await axios.post(url, {}, { // Sending empty body for function import
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // The response might be wrapped in .d for OData V2
        return response.data.d || response.data;
    } catch (error) {
        console.error('Material Document Cancel POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch a CSRF token specifically for Inspection Result Record API.
 */
const fetchInspectionResultRecordCsrfToken = async () => {
    try {
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/ZQM_QA32_CHAR_CHANGE_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });
        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return { token, cookies };
    } catch (error) {
        console.error('Failed to fetch Inspection Result Record CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token for Inspection Result Record API');
    }
};

/**
 * Post Inspection Result Record to SAP.
 */
const postInspectionResultRecord = async (payload) => {
    try {
        const { token, cookies } = await fetchInspectionResultRecordCsrfToken();
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/ZQM_QA32_CHAR_CHANGE_SRV/HeaderentitySet?sap-client=110`;
        const response = await axios.post(url, payload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // The response might be wrapped in .d for OData V2
        return response.data.d || response.data;
    } catch (error) {
        console.error('Inspection Result Record POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch a CSRF token specifically for Inspection Lot API.
 */
const fetchInspectionLotCsrfToken = async () => {
    try {
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/ZQM_INSP_LOT_UD_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });
        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return { token, cookies };
    } catch (error) {
        console.error('Failed to fetch Inspection Lot CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token for Inspection Lot API');
    }
};

/**
 * Post Inspection Lot to SAP.
 */
const postInspectionLot = async (payload) => {
    try {
        const { token, cookies } = await fetchInspectionLotCsrfToken();
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/ZQM_INSP_LOT_UD_SRV/UsagedecisionSet?sap-client=110`;
        const response = await axios.post(url, payload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // The response might be wrapped in .d for OData V2
        return response.data.d || response.data;
    } catch (error) {
        console.error('Inspection Lot POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch a CSRF token specifically for API_INSPECTIONLOT_SRV.
 */
const fetchApiInspectionLotCsrfToken = async () => {
    try {
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_INSPECTIONLOT_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });
        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return { token, cookies };
    } catch (error) {
        console.error('Failed to fetch API_INSPECTIONLOT_SRV CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token for API_INSPECTIONLOT_SRV');
    }
};

/**
 * Fetch Inspection Lot header (InspectionLot, ChangedDateTime) from SAP API_INSPECTIONLOT_SRV.
 */
const getInspectionLotHeader = async (inspectionLot) => {
    try {
        const lotNumber = String(inspectionLot).trim();
        const formattedLot = /^\d+$/.test(lotNumber) ? lotNumber.padStart(12, '0') : lotNumber;
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_INSPECTIONLOT_SRV/A_InspectionLot('${formattedLot}')?sap-client=110&$select=InspectionLot,ChangedDateTime&$format=json`;

        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });

        const data = response.data.d || response.data;
        return {
            data,
            csrfToken: response.headers['x-csrf-token'],
            cookies: response.headers['set-cookie']
        };
    } catch (error) {
        console.error('Inspection Lot GET request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Post Inspection Lot -01:
 * 1. Fetch InspectionLot & ChangedDateTime from SAP GET API A_InspectionLot.
 * 2. Post InspectionLot, InspLotQtyPosted, UsageDecisionStockType, ChangedDateTime to SAP POST API A_InspLotMatlDocItem.
 */
const postInspectionLot_01 = async (payload) => {
    try {
        const rawInspectionLot = payload.InspectionLot;
        if (!rawInspectionLot) {
            const err = new Error('InspectionLot is required in payload');
            err.statusCode = 400;
            throw err;
        }

        // 1. Fetch InspectionLot & ChangedDateTime from SAP GET API
        const lotHeader = await getInspectionLotHeader(rawInspectionLot);
        const sapLotData = lotHeader.data || {};
        const changedDateTime = sapLotData.ChangedDateTime;

        let token = lotHeader.csrfToken;
        let cookies = lotHeader.cookies;

        if (!token) {
            const csrfRes = await fetchApiInspectionLotCsrfToken();
            token = csrfRes.token;
            cookies = csrfRes.cookies;
        }

        if (!token) {
            throw new Error('No CSRF token returned from SAP for API_INSPECTIONLOT_SRV');
        }

        // 2. Prepare payload for SAP POST API A_InspLotMatlDocItem
        const postPayload = {
            InspectionLot: String(sapLotData.InspectionLot || rawInspectionLot),
            InspLotQtyPosted: String(payload.InspLotQtyPosted !== undefined ? payload.InspLotQtyPosted : ''),
            UsageDecisionStockType: String(payload.UsageDecisionStockType || ''),
            ChangedDateTime: changedDateTime
        };

        if (payload.StorageLocation) {
            postPayload.StorageLocation = String(payload.StorageLocation);
        }
        if (payload.InspLotMaterialPostedTo) {
            postPayload.InspLotMaterialPostedTo = String(payload.InspLotMaterialPostedTo);
        }
        if (payload.InspLotBatchTransferredTo) {
            postPayload.InspLotBatchTransferredTo = String(payload.InspLotBatchTransferredTo);
        }
        if (payload.MaterialDocumentItemText) {
            postPayload.MaterialDocumentItemText = String(payload.MaterialDocumentItemText);
        }

        // 3. Post to SAP A_InspLotMatlDocItem
        const postUrl = `${getSapBaseUrl()}/sap/opu/odata/sap/API_INSPECTIONLOT_SRV/A_InspLotMatlDocItem?sap-client=110`;
        const response = await axios.post(postUrl, postPayload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? (Array.isArray(cookies) ? cookies.join('; ') : cookies) : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return response.data.d || response.data;
    } catch (error) {
        console.error('Inspection Lot -01 POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

/**
 * Fetch a CSRF token specifically for Production Order Confirmation Cancel API.
 */
const fetchProdOrderConfCancelCsrfToken = async () => {
    try {
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });
        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return { token, cookies };
    } catch (error) {
        console.error('Failed to fetch Prod Order Conf Cancel CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token for Prod Order Conf Cancel API');
    }
};

/**
 * Cancel Production Order Confirmation.
 */
const CancelProdnOrdConf = async (params) => {
    try {
        const { token, cookies } = await fetchProdOrderConfCancelCsrfToken();
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        // Dynamically build function import query string
        // Assuming params are passed as key-value pairs (e.g., ConfirmationGroup, ConfirmationCount)
        let queryParams = '';
        if (params && Object.keys(params).length > 0) {
            queryParams = Object.keys(params)
                .map(key => `${key}='${params[key]}'`)
                .join('&');
        }
        
        let url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/CancelProdnOrdConf`;
        if (queryParams) {
            url += `?${queryParams}&sap-client=110`;
        } else {
            url += `?sap-client=110`;
        }

        const response = await axios.post(url, {}, { // Sending empty body, payload in endpoint
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // The response might be wrapped in .d for OData V2
        return response.data.d || response.data;
    } catch (error) {
        console.error('Prod Order Conf Cancel POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Production order confirmation cancel.
 */
const productionOrderConfirmationCancel = async (params) => {
    try {
        const { token, cookies } = await fetchProdOrderConfCancelCsrfToken(); // Reusing the same CSRF fetch logic
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        let queryParams = '';
        if (params && Object.keys(params).length > 0) {
            queryParams = Object.keys(params)
                .map(key => `${key}=%27${params[key]}%27`)
                .join('&');
        }
        
        let url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/CancelProdnOrdConf`;
        if (queryParams) {
            url += `?${queryParams}&sap-client=110`;
        } else {
            url += `?sap-client=110`;
        }

        const response = await axios.post(url, params, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return response.data.d || response.data;
    } catch (error) {
        console.error('Production Order Confirmation Cancel POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch a CSRF token specifically for Prd Order Confirmation API.
 */
const fetchPrdOrderConfirmationCsrfToken = async () => {
    try {
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });
        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return { token, cookies };
    } catch (error) {
        console.error('Failed to fetch Prd Order Confirmation CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token for Prd Order Confirmation API');
    }
};

/**
 * Post Prd Order Confirmation to SAP.
 */
const postPrdOrderConfirmation = async (payload) => {
    try {
        const { token, cookies } = await fetchPrdOrderConfirmationCsrfToken();
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/ZPP_PROD_CONFI_API_SRV/HeaderentitySet?sap-client=110`;
        const response = await axios.post(url, payload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': token,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // The response might be wrapped in .d for OData V2
        return response.data.d || response.data;
    } catch (error) {
        console.error('Prd Order Confirmation POST request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch Production Order Details
 */
const getProductionOrderDetails = async (params) => {
    try {
        const productionPlant = params.ProductionPlant || '';
        const mfgOrderCreationDate = params.MfgOrderCreationDate || ''; 

        let filterStr = '';
        const filters = [];
        if (productionPlant) {
            filters.push(`ProductionPlant eq '${productionPlant}'`);
        }
        if (mfgOrderCreationDate) {
            filters.push(`MfgOrderCreationDate eq datetime'${mfgOrderCreationDate}'`);
        }
        if (filters.length > 0) {
            filterStr = `$filter=${filters.join(' and ')}&`;
        }

        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2?${filterStr}$expand=to_ProductionOrderComponent,to_ProductionOrderOperation&sap-client=110&$format=json`;

        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'Accept': 'application/json'
            }
        });

        let results = [];
        if (response.data && response.data.d && response.data.d.results) {
            results = response.data.d.results;
        } else if (response.data && response.data.value) {
            results = response.data.value;
        } else {
            results = Array.isArray(response.data) ? response.data : [response.data];
        }

        return results;
    } catch (error) {
        console.error('Production Order Details GET request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch Material List from SAP S/4HANA using ZMM_MATERIAL_DETAILS_SRV OData service.
 * Handles single material, material range, material type, creation date / date range, or combined filters.
 */
const getMaterialList = async (params = {}) => {
    try {
        const filters = [];

        // 1. Date / Date Range (Ersda) - processed first to align with SAP SEGW expectations
        const ersdaFrom = params.ErsdaFrom || params.ersdaFrom || params.DateFrom || params.fromDate || params.Ersda || params.ersda;
        const ersdaTo = params.ErsdaTo || params.ersdaTo || params.DateTo || params.toDate;

        const formatODataDatetime = (dateVal, isEnd = false) => {
            if (!dateVal) return '';
            const strVal = String(dateVal).trim();
            if (strVal.startsWith("datetime'")) return strVal;
            let cleanDate = strVal;
            if (cleanDate.length === 10) { // e.g. "2025-03-29"
                cleanDate = isEnd ? `${cleanDate}T23:59:59` : `${cleanDate}T00:00:00`;
            }
            return `datetime'${cleanDate}'`;
        };

        if (ersdaFrom && ersdaTo) {
            const formattedFrom = formatODataDatetime(ersdaFrom, false);
            const formattedTo = formatODataDatetime(ersdaTo, true);
            filters.push(`Ersda ge ${formattedFrom} and Ersda le ${formattedTo}`);
        } else if (ersdaFrom) {
            const formattedFrom = formatODataDatetime(ersdaFrom, false);
            if (!ersdaTo && typeof ersdaFrom === 'string' && ersdaFrom.trim().length === 10) {
                const formattedTo = formatODataDatetime(ersdaFrom, true);
                filters.push(`Ersda ge ${formattedFrom} and Ersda le ${formattedTo}`);
            } else {
                filters.push(`Ersda ge ${formattedFrom}`);
            }
        } else if (ersdaTo) {
            const formattedTo = formatODataDatetime(ersdaTo, true);
            filters.push(`Ersda le ${formattedTo}`);
        }

        // 2. Material Number (Single or Range)
        const matnr = params.Matnr || params.matnr || params.material || params.Material;
        const matnrFrom = params.MatnrFrom || params.matnrFrom || params.MatnrLow || params.MaterialFrom;
        const matnrTo = params.MatnrTo || params.matnrTo || params.MatnrHigh || params.MaterialTo;

        if (matnrFrom && matnrTo) {
            filters.push(`Matnr ge '${matnrFrom}' and Matnr le '${matnrTo}'`);
        } else if (matnrFrom) {
            filters.push(`Matnr ge '${matnrFrom}'`);
        } else if (matnrTo) {
            filters.push(`Matnr le '${matnrTo}'`);
        } else if (matnr) {
            filters.push(`Matnr eq '${matnr}'`);
        }

        // 3. Material Type (Mtart)
        const mtart = params.Mtart || params.mtart || params.materialType || params.MaterialType;
        if (mtart) {
            filters.push(`Mtart eq '${mtart}'`);
        }

        // Direct custom $filter override if provided
        if (params.$filter) {
            filters.push(params.$filter);
        }

        let filterQuery = '';
        if (filters.length > 0) {
            filterQuery = `$filter=${filters.join(' and ')}&`;
        }

        const sapClient = params.sapClient || params['sap-client'] || '110';
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/ZMM_MATERIAL_DETAILS_SRV/MaterialSet?${filterQuery}sap-client=${sapClient}&$format=json`;

        console.log(`[getMaterialList] Calling SAP OData URL: ${url}`);

        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'Accept': 'application/json'
            }
        });

        let results = [];
        if (response.data && response.data.d && response.data.d.results) {
            results = response.data.d.results;
        } else if (response.data && response.data.d) {
            results = Array.isArray(response.data.d) ? response.data.d : [response.data.d];
        } else if (response.data && response.data.value) {
            results = response.data.value;
        } else {
            results = Array.isArray(response.data) ? response.data : [response.data];
        }

        return results;
    } catch (error) {
        console.error('Material List GET request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch Inspection Lot details for a given Material Document and Year from SAP OData ZMM_INSP_LOT_SRV.
 * SAP Endpoint: /sap/opu/odata/sap/ZMM_INSP_LOT_SRV/MaterialdocSet(Mblnr='<mblnr>',Gjahr='<gjahr>')
 */
const getMaterialDocInspLot = async (mblnr, gjahr) => {
    try {
        const sapClient = '110';
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/ZMM_INSP_LOT_SRV/MaterialdocSet(Mblnr='${mblnr}',Gjahr='${gjahr}')?sap-client=${sapClient}&$format=json`;

        console.log(`[getMaterialDocInspLot] Calling SAP OData URL: ${url}`);

        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'Accept': 'application/json'
            }
        });

        const rawData = (response.data && response.data.d) ? response.data.d : response.data;
        const { __metadata, ...cleanData } = rawData || {};
        const result = {
            ...cleanData,
            Mblnr: cleanData.Mblnr || mblnr,
            Gjahr: cleanData.Gjahr || gjahr,
            InspLot: cleanData.InspLot || '',
            Type: cleanData.Type || '',
            Message: cleanData.Message || ''
        };

        return result;
    } catch (error) {
        console.error('getMaterialDocInspLot GET request failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.response ? error.response.status : 500;
        throw err;
    }
};

/**
 * Fetch CSRF token for Production Order Service (API_PRODUCTION_ORDER_2_SRV).
 */
const fetchProductionOrderCsrfToken = async () => {
    try {
        const url = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV?sap-client=110`;
        const response = await axios.get(url, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });

        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return { token, cookies };
    } catch (error) {
        console.error('Failed to fetch Production Order CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token for Production Order API');
    }
};

/**
 * Service to Create a Production Order and Release it.
 * Flow:
 * 1. GET CSRF token and session cookies from API_PRODUCTION_ORDER_2_SRV?sap-client=110
 * 2. POST to A_ProductionOrder_2?sap-client=110 with payload
 * 3. Extract ManufacturingOrder from response
 * 4. Wait 1 second (1000ms)
 * 5. GET A_ProductionOrder_2('{ManufacturingOrder}')?sap-client=110 to get ETag and CSRF token
 * 6. POST ReleaseOrder?ManufacturingOrder='{ManufacturingOrder}'&sap-client=110 with ETag & token
 * 7. Return the response
 */
const productionOrderCreateRelease = async (payload = {}) => {
    try {
        // Step 1: Fetch CSRF token and cookies
        const { token: csrfToken, cookies: initialCookies } = await fetchProductionOrderCsrfToken();
        if (!csrfToken) {
            throw new Error('No CSRF token returned from SAP for Production Order API');
        }

        let currentCookies = initialCookies || [];

        // Step 2: Post payload to create production order
        const createPayload = {
            ManufacturingOrderType: payload.ManufacturingOrderType || 'ZSFG',
            Material: payload.Material || 'COLFIBSMFG652DBL',
            ProductionPlant: payload.ProductionPlant || '1200',
            TotalQuantity: payload.TotalQuantity !== undefined ? String(payload.TotalQuantity) : '100',
            ProductionUnit: payload.ProductionUnit || 'KM',
            BasicSchedulingType: payload.BasicSchedulingType || '4',
            ...payload
        };

        const createUrl = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2?sap-client=110`;
        const createResponse = await axios.post(createUrl, createPayload, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': csrfToken,
                'Cookie': currentCookies.length > 0 ? (Array.isArray(currentCookies) ? currentCookies.join('; ') : currentCookies) : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (createResponse.headers['set-cookie']) {
            currentCookies = createResponse.headers['set-cookie'];
        }

        const createdOrderData = createResponse.data?.d || createResponse.data;
        const manufacturingOrder = createdOrderData?.ManufacturingOrder;

        if (!manufacturingOrder) {
            throw new Error('ManufacturingOrder was not found in SAP creation response');
        }

        console.log(`Created Manufacturing Order: ${manufacturingOrder}. Waiting 1 second before releasing...`);

        // Step 3: Wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 4: GET production order details to fetch ETag and Token
        const getOrderUrl = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${manufacturingOrder}')?sap-client=110`;
        const getOrderResponse = await axios.get(getOrderUrl, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Cookie': currentCookies.length > 0 ? (Array.isArray(currentCookies) ? currentCookies.join('; ') : currentCookies) : '',
                'Accept': 'application/json'
            }
        });

        const etag = getOrderResponse.headers['etag'] || getOrderResponse.data?.d?.__metadata?.etag;
        const releaseToken = getOrderResponse.headers['x-csrf-token'] || csrfToken;
        if (getOrderResponse.headers['set-cookie']) {
            currentCookies = getOrderResponse.headers['set-cookie'];
        }

        // Step 5: Post to ReleaseOrder FunctionImport
        const releaseUrl = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/ReleaseOrder?ManufacturingOrder='${manufacturingOrder}'&sap-client=110`;
        const releaseHeaders = {
            'X-CSRF-Token': releaseToken,
            'Cookie': currentCookies.length > 0 ? (Array.isArray(currentCookies) ? currentCookies.join('; ') : currentCookies) : '',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (etag) {
            releaseHeaders['If-Match'] = etag;
        }

        const releaseResponse = await axios.post(releaseUrl, {}, {
            auth: getSapAuth(),
            headers: releaseHeaders
        });

        const releaseData = releaseResponse.data?.d || releaseResponse.data;
        return {
            ManufacturingOrder: manufacturingOrder,
            ...releaseData
        };
    } catch (error) {
        console.error('Production Order Create and Release failed:', error.response ? error.response.data : error.message);
        const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

/**
 * Service to change Production Order Quantity via PATCH.
 * Flow:
 * 1. GET CSRF token and cookies from API_PRODUCTION_ORDER_2_SRV/?sap-client=110
 * 2. GET A_ProductionOrder_2('{ManufacturingOrder}')?sap-client=110 to get ETag and CSRF token
 * 3. PATCH A_ProductionOrder_2('{ManufacturingOrder}')?sap-client=110 with TotalQuantity and If-Match: etag
 * 4. Return result
 */
const productionOrderQtyChange = async (params = {}) => {
    try {
        const dynamicOrder = 
            params.ManufacturingOrder || 
            params.manufacturingOrder || 
            params.orderNumber || 
            params.OrderNumber || 
            params.orderNo || 
            params.OrderNo || 
            params.orderId || 
            params.OrderId || 
            params.order || 
            params.Order || 
            params.aufnr || 
            params.AUFNR || 
            '001210000181';

        const manufacturingOrder = String(dynamicOrder).trim();
        const totalQuantity = params.TotalQuantity !== undefined ? String(params.TotalQuantity) : '150.000';


        // Step 1: Fetch CSRF token and session cookies
        const { token: csrfToken, cookies: initialCookies } = await fetchProductionOrderCsrfToken();
        if (!csrfToken) {
            throw new Error('No CSRF token returned from SAP for Production Order API');
        }

        let currentCookies = initialCookies || [];

        // Step 2: GET order to retrieve ETag and token
        const getOrderUrl = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${manufacturingOrder}')?sap-client=110`;
        const getOrderResponse = await axios.get(getOrderUrl, {
            auth: getSapAuth(),
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Cookie': currentCookies.length > 0 ? (Array.isArray(currentCookies) ? currentCookies.join('; ') : currentCookies) : '',
                'Accept': 'application/json'
            }
        });

        const etag = getOrderResponse.headers['etag'] || getOrderResponse.data?.d?.__metadata?.etag;
        const patchToken = getOrderResponse.headers['x-csrf-token'] || csrfToken;
        if (getOrderResponse.headers['set-cookie']) {
            currentCookies = getOrderResponse.headers['set-cookie'];
        }

        const currentQty = getOrderResponse.data?.d?.TotalQuantity;

        // Step 3: PATCH TotalQuantity
        const patchUrl = `${getSapBaseUrl()}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${manufacturingOrder}')?sap-client=110`;
        const patchPayload = {
            TotalQuantity: totalQuantity
        };

        const patchHeaders = {
            'X-CSRF-Token': patchToken,
            'Cookie': currentCookies.length > 0 ? (Array.isArray(currentCookies) ? currentCookies.join('; ') : currentCookies) : '',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (etag) {
            patchHeaders['If-Match'] = etag;
        }

        const patchResponse = await axios.patch(patchUrl, patchPayload, {
            auth: getSapAuth(),
            headers: patchHeaders
        });

        return {
            ManufacturingOrder: manufacturingOrder,
            PreviousQuantity: currentQty,
            TotalQuantity: totalQuantity,
            StatusCode: patchResponse.status,
            Status: 'Success'
        };
    } catch (error) {
        console.error('Production Order Qty Change failed:', error.response ? error.response.data : error.message);
        let errMsg = error.message;
        if (error.response?.data?.error?.message?.value) {
            errMsg = error.response.data.error.message.value;
        } else if (error.response?.data) {
            errMsg = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
        }
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

/**
 * Service to Technically Complete (TECO) a Production Order.
 * Flow:
 * 1. Fetch CSRF token and session cookies from API_PRODUCTION_ORDER_2_SRV
 * 2. GET A_ProductionOrder_2('{ManufacturingOrder}')?sap-client=110 to retrieve ETag and CSRF token
 * 3. POST to TechlyCmpltOrder?ManufacturingOrder='{ManufacturingOrder}'&sap-client=110 with ETag & CSRF token
 * 4. Return result
 */
const productionOrderTeco = async (params = {}) => {
    try {
        const dynamicOrder = 
            params.ManufacturingOrder || 
            params.manufacturingOrder || 
            params.orderNumber || 
            params.OrderNumber || 
            params.orderNo || 
            params.OrderNo || 
            params.orderId || 
            params.OrderId || 
            params.order || 
            params.Order || 
            params.aufnr || 
            params.AUFNR || 
            '001210000181';

        const manufacturingOrder = String(dynamicOrder).trim();

        // Credentials: default to FIOET_SAP / Password@123456789 (normalizes FIOET -> FIOET_SAP)
        const baseAuth = getSapAuth();
        const rawUsername = params.username || params.user || baseAuth.username || 'FIOET_SAP';
        const auth = {
            username: rawUsername === 'FIOET' ? 'FIOET_SAP' : rawUsername,
            password: params.password || params.pass || baseAuth.password || 'Password@123456789'
        };

        const baseUrl = params.baseUrl || getSapBaseUrl();

        // Step 1: Fetch initial CSRF token and session cookies
        let csrfToken = null;
        let currentCookies = [];

        try {
            const tokenUrl = `${baseUrl}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV?sap-client=110`;
            const tokenResponse = await axios.get(tokenUrl, {
                auth,
                headers: {
                    'X-CSRF-Token': 'Fetch',
                    'Accept': 'application/json'
                }
            });
            csrfToken = tokenResponse.headers['x-csrf-token'];
            if (tokenResponse.headers['set-cookie']) {
                currentCookies = tokenResponse.headers['set-cookie'];
            }
        } catch (tokenErr) {
            console.warn('Initial token fetch warning:', tokenErr.message);
        }

        // Step 2: GET order to retrieve ETag, CSRF token, and current cookies
        const getOrderUrl = `${baseUrl}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${manufacturingOrder}')?sap-client=110`;
        const getHeaders = {
            'X-CSRF-Token': 'Fetch',
            'Accept': 'application/json'
        };
        if (currentCookies.length > 0) {
            getHeaders['Cookie'] = Array.isArray(currentCookies) ? currentCookies.join('; ') : currentCookies;
        }

        const getOrderResponse = await axios.get(getOrderUrl, {
            auth,
            headers: getHeaders
        });

        const etag = getOrderResponse.headers['etag'] || getOrderResponse.data?.d?.__metadata?.etag;
        const postToken = getOrderResponse.headers['x-csrf-token'] || csrfToken;
        if (getOrderResponse.headers['set-cookie']) {
            currentCookies = getOrderResponse.headers['set-cookie'];
        }

        const orderDetails = getOrderResponse.data?.d || getOrderResponse.data;

        // Step 3: POST to TechlyCmpltOrder FunctionImport
        const tecoUrl = `${baseUrl}/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/TechlyCmpltOrder?ManufacturingOrder='${manufacturingOrder}'&sap-client=110`;
        const tecoHeaders = {
            'X-CSRF-Token': postToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (currentCookies.length > 0) {
            tecoHeaders['Cookie'] = Array.isArray(currentCookies) ? currentCookies.join('; ') : currentCookies;
        }
        if (etag) {
            tecoHeaders['If-Match'] = etag;
        }

        const tecoResponse = await axios.post(tecoUrl, {}, {
            auth,
            headers: tecoHeaders
        });

        const tecoData = tecoResponse.data?.d || tecoResponse.data;

        return {
            ManufacturingOrder: manufacturingOrder,
            ETag: etag,
            CSRFToken: postToken,
            StatusCode: tecoResponse.status,
            Status: 'Success',
            OrderDetails: orderDetails,
            Data: tecoData
        };
    } catch (error) {
        console.error('Production Order TECO failed:', error.response ? error.response.data : error.message);
        let errMsg = error.message;
        if (error.response?.data?.error?.message?.value) {
            errMsg = error.response.data.error.message.value;
        } else if (error.response?.data) {
            errMsg = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
        }
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

/**
 * GET CSRF token and service metadata for UD Reversal service (ZPP_INSP_CANCEL_SRV_SRV).
 * GET http://vhwclds4ap01.sap.wco.com:8000/sap/opu/odata/sap/ZPP_INSP_CANCEL_SRV_SRV/?sap-client=110
 */
const getUdReversalToken = async (params = {}) => {
    try {
        const baseAuth = getSapAuth();
        const rawUsername = params.username || params.user || baseAuth.username || 'FIOET_SAP';
        const auth = {
            username: rawUsername === 'FIOET' ? 'FIOET_SAP' : rawUsername,
            password: params.password || params.pass || baseAuth.password || 'Password@123456789'
        };

        const baseUrl = params.baseUrl || getSapBaseUrl();
        const url = `${baseUrl}/sap/opu/odata/sap/ZPP_INSP_CANCEL_SRV_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth,
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });

        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return {
            CSRFToken: token,
            Cookies: cookies,
            StatusCode: response.status,
            ServiceMetadata: response.data
        };
    } catch (error) {
        console.error('Failed to get UD Reversal CSRF token:', error.response ? error.response.data : error.message);
        let errMsg = error.message;
        if (error.response?.data?.error?.message?.value) {
            errMsg = error.response.data.error.message.value;
        } else if (error.response?.data) {
            errMsg = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
        }
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

const fetchUdReversalCsrfToken = async (baseUrl, auth) => {
    const res = await getUdReversalToken({ baseUrl, username: auth.username, password: auth.password });
    return { token: res.CSRFToken, cookies: res.Cookies };
};

/**
 * Service to process Usage Decision (UD) Reversal via ZPP_INSP_CANCEL_SRV_SRV.
 * Flow:
 * 1. GET CSRF token and cookies from /sap/opu/odata/sap/ZPP_INSP_CANCEL_SRV_SRV/?sap-client=110
 * 2. POST to /sap/opu/odata/sap/ZPP_INSP_CANCEL_SRV_SRV/zinspection_lotSet?sap-client=110 with payload & CSRF token
 * 3. Return created entity data
 */
const postUdReversal = async (params = {}, customHeaders = {}) => {
    try {
        const baseAuth = getSapAuth();
        const rawUsername = params.username || params.user || baseAuth.username || 'FIOET_SAP';
        const auth = {
            username: rawUsername === 'FIOET' ? 'FIOET_SAP' : rawUsername,
            password: params.password || params.pass || baseAuth.password || 'Password@123456789'
        };

        const baseUrl = params.baseUrl || getSapBaseUrl();

        // Step 1: Use passed CSRF token or fetch a fresh one
        let csrfToken = customHeaders['x-csrf-token'] || customHeaders['X-CSRF-Token'] || params.csrfToken || params.token;
        let cookies = customHeaders['cookie'] || customHeaders['Cookie'] || params.cookies;

        if (!csrfToken) {
            const tokenRes = await getUdReversalToken({ baseUrl, username: auth.username, password: auth.password });
            csrfToken = tokenRes.CSRFToken;
            if (!cookies) {
                cookies = tokenRes.Cookies;
            }
        }

        if (!csrfToken) {
            throw new Error('No CSRF token returned from SAP for UD Reversal API');
        }

        // Normalize fields
        const dynamicLot = 
            params.PRUEFLOS || 
            params.prueflos || 
            params.inspectionLot || 
            params.InspectionLot || 
            params.lotNumber || 
            params.LotNumber || 
            params.lot || 
            '040000002247';

        const dynamicDate = 
            params.BUDAT || 
            params.budat || 
            params.postingDate || 
            params.PostingDate || 
            params.date || 
            '20261017';

        const payload = {
            PRUEFLOS: String(dynamicLot).trim(),
            BUDAT: String(dynamicDate).trim(),
            STATUS: params.STATUS !== undefined ? params.STATUS : '',
            MESSAGE: params.MESSAGE !== undefined ? params.MESSAGE : ''
        };

        // Step 2: Post to zinspection_lotSet
        const postUrl = `${baseUrl}/sap/opu/odata/sap/ZPP_INSP_CANCEL_SRV_SRV/zinspection_lotSet?sap-client=110`;
        const postHeaders = {
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (cookies && (Array.isArray(cookies) ? cookies.length > 0 : String(cookies).trim().length > 0)) {
            postHeaders['Cookie'] = Array.isArray(cookies) ? cookies.join('; ') : cookies;
        }

        const response = await axios.post(postUrl, payload, {
            auth,
            headers: postHeaders
        });

        const data = response.data?.d || response.data;

        return {
            PRUEFLOS: payload.PRUEFLOS,
            BUDAT: payload.BUDAT,
            CSRFToken: csrfToken,
            StatusCode: response.status,
            Status: data?.STATUS || 'Success',
            Message: data?.MESSAGE || 'UD reversal executed successfully',
            Data: data
        };
    } catch (error) {
        console.error('UD Reversal request failed:', error.response ? error.response.data : error.message);
        let errMsg = error.message;
        if (error.response?.data?.error?.message?.value) {
            errMsg = error.response.data.error.message.value;
        } else if (error.response?.data) {
            errMsg = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
        }
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

const udReversal = postUdReversal;

/**
 * GET CSRF token and service metadata for Posting Period Check service (ZPOSTING_PERIOD_CHECK_SRV).
 * GET http://vhwclds4ap01.sap.wco.com:8000/sap/opu/odata/sap/ZPOSTING_PERIOD_CHECK_SRV/?sap-client=110
 */
const getPostingPeriodCheckToken = async (params = {}) => {
    try {
        const baseAuth = getSapAuth();
        const rawUsername = params.username || params.user || baseAuth.username || 'FIOET_SAP';
        const auth = {
            username: rawUsername === 'FIOET' ? 'FIOET_SAP' : rawUsername,
            password: params.password || params.pass || baseAuth.password || 'Password@123456789'
        };

        const baseUrl = params.baseUrl || getSapBaseUrl();
        const url = `${baseUrl}/sap/opu/odata/sap/ZPOSTING_PERIOD_CHECK_SRV/?sap-client=110`;
        const response = await axios.get(url, {
            auth,
            headers: {
                'X-CSRF-Token': 'Fetch',
                'Accept': 'application/json'
            }
        });

        const token = response.headers['x-csrf-token'];
        const cookies = response.headers['set-cookie'];
        return {
            CSRFToken: token,
            Cookies: cookies,
            StatusCode: response.status,
            ServiceMetadata: response.data
        };
    } catch (error) {
        console.error('Failed to get Posting Period Check CSRF token:', error.response ? error.response.data : error.message);
        let errMsg = error.message;
        if (error.response?.data?.error?.message?.value) {
            errMsg = error.response.data.error.message.value;
        } else if (error.response?.data) {
            errMsg = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
        }
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

const fetchPostingPeriodCheckCsrfToken = async (baseUrl, auth) => {
    const res = await getPostingPeriodCheckToken({ baseUrl, username: auth.username, password: auth.password });
    return { token: res.CSRFToken, cookies: res.Cookies };
};

/**
 * Service to process Posting Period Check via ZPOSTING_PERIOD_CHECK_SRV.
 * Flow:
 * 1. GET CSRF token and cookies from /sap/opu/odata/sap/ZPOSTING_PERIOD_CHECK_SRV/?sap-client=110
 * 2. POST to /sap/opu/odata/sap/ZPOSTING_PERIOD_CHECK_SRV/zperiod_checkSet?sap-client=110 with payload & CSRF token
 * 3. Return created entity data
 */
const checkPostingPeriod = async (params = {}, customHeaders = {}) => {
    try {
        const baseAuth = getSapAuth();
        const rawUsername = params.username || params.user || baseAuth.username || 'FIOET_SAP';
        const auth = {
            username: rawUsername === 'FIOET' ? 'FIOET_SAP' : rawUsername,
            password: params.password || params.pass || baseAuth.password || 'Password@123456789'
        };

        const baseUrl = params.baseUrl || getSapBaseUrl();

        // Step 1: Use passed CSRF token or fetch a fresh one
        let csrfToken = customHeaders['x-csrf-token'] || customHeaders['X-CSRF-Token'] || params.csrfToken || params.token;
        let cookies = customHeaders['cookie'] || customHeaders['Cookie'] || params.cookies;

        if (!csrfToken || !cookies) {
            const tokenRes = await getPostingPeriodCheckToken({ baseUrl, username: auth.username, password: auth.password });
            if (!csrfToken) {
                csrfToken = tokenRes.CSRFToken;
            }
            if (!cookies) {
                cookies = tokenRes.Cookies;
            }
        }

        if (!csrfToken) {
            throw new Error('No CSRF token returned from SAP for Posting Period Check API');
        }

        // Format default date YYYYMMDD
        const now = new Date();
        const defaultBudat = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        const rawDate = 
            params.BUDAT || 
            params.budat || 
            params.postingDate || 
            params.PostingDate || 
            params.date || 
            defaultBudat;

        // Clean up date string (e.g. 2026-11-05 -> 20261105)
        const cleanBudat = String(rawDate).replace(/[-/.]/g, '').trim();

        const payload = {
            BUDAT: cleanBudat,
            STATUS: params.STATUS !== undefined ? params.STATUS : '',
            MESSAGE: params.MESSAGE !== undefined ? params.MESSAGE : ''
        };

        // Step 2: Post to zperiod_checkSet
        const postUrl = `${baseUrl}/sap/opu/odata/sap/ZPOSTING_PERIOD_CHECK_SRV/zperiod_checkSet?sap-client=110`;
        const postHeaders = {
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (cookies) {
            postHeaders['Cookie'] = Array.isArray(cookies) 
                ? cookies.map(c => c.split(';')[0]).join('; ') 
                : cookies;
        }

        const response = await axios.post(postUrl, payload, {
            auth,
            headers: postHeaders
        });

        const data = response.data?.d || response.data;

        return {
            BUDAT: payload.BUDAT,
            STATUS: data?.STATUS !== undefined ? data.STATUS : payload.STATUS,
            MESSAGE: data?.MESSAGE !== undefined ? data.MESSAGE : 'Posting period check executed successfully',
            CSRFToken: csrfToken,
            StatusCode: response.status,
            Data: data
        };
    } catch (error) {
        console.error('Posting Period Check request failed:', error.response ? error.response.data : error.message);
        let errMsg = error.message;
        if (error.response?.data?.error?.message?.value) {
            errMsg = error.response.data.error.message.value;
        } else if (error.response?.data) {
            errMsg = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
        }
        const err = new Error(errMsg);
        err.statusCode = error.statusCode || (error.response ? error.response.status : 500);
        throw err;
    }
};

const postPostingPeriodCheck = checkPostingPeriod;

module.exports = {
    fetchData,
    postData,
    callZGDTESTOData,
    getMaterialStock,
    getInspectionResultValue,
    postMaterialDocumentHeader,
    getMaterialDocInspLot,
    cancelMaterialDocument,
    postInspectionResultRecord,
    postInspectionLot,
    getInspectionLotHeader,
    fetchApiInspectionLotCsrfToken,
    postInspectionLot_01,
    CancelProdnOrdConf,
    productionOrderConfirmationCancel,
    postPrdOrderConfirmation,
    getProductionOrderDetails,
    getMaterialList,
    fetchProductionOrderCsrfToken,
    productionOrderCreateRelease,
    productionOrderQtyChange,
    productionOrderTeco,
    fetchUdReversalCsrfToken,
    getUdReversalToken,
    postUdReversal,
    udReversal,
    getPostingPeriodCheckToken,
    fetchPostingPeriodCheckCsrfToken,
    checkPostingPeriod,
    postPostingPeriodCheck
};






