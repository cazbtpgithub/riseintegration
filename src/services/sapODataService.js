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
 * Fetch a CSRF token specifically for Production Order API.
 */
const fetchProductionOrderCsrfToken = async () => {
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
        console.error('Failed to fetch Production Order CSRF token:', error.response ? error.response.data : error.message);
        throw new Error('Could not retrieve CSRF token for Production Order API');
    }
};

/**
 * Post Production Order to SAP.
 */
const postProductionOrder = async (payload) => {
    try {
        const { token, cookies } = await fetchProductionOrderCsrfToken();
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
        console.error('Production Order POST request failed:', error.response ? error.response.data : error.message);
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
 * Cancel PO (pocancel).
 */
const pocancel = async (params) => {
    try {
        const { token, cookies } = await fetchProdOrderConfCancelCsrfToken(); // Reusing the same CSRF fetch logic
        if (!token) {
            throw new Error('No CSRF token returned from SAP');
        }

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

        const response = await axios.post(url, {}, {
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
        console.error('PO Cancel POST request failed:', error.response ? error.response.data : error.message);
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

module.exports = {
    fetchData,
    postData,
    callZGDTESTOData,
    getMaterialStock,
    getInspectionResultValue,
    postMaterialDocumentHeader,
    cancelMaterialDocument,
    postProductionOrder,
    postInspectionLot,
    CancelProdnOrdConf,
    pocancel,
    postPrdOrderConfirmation
};
