const sapODataService = require('../services/sapODataService');
const sapRFCService = require('../services/sapRFCService');

/**
 * Controller to handle GET requests for SAP data.
 */
const getSAPData = async (req, res) => {
    try {
        // You can extract query parameters or specific entity IDs from the request if needed
        // const { entityId } = req.query;

        // Pass to the service layer to make the actual call
        const data = await sapODataService.fetchData();

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error in getSAPData controller:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch data from SAP S/4HANA',
            details: error.message
        });
    }
};

/**
 * Controller to handle POST requests to send data to SAP.
 */
const postSAPData = async (req, res) => {
    try {
        // Extract the payload to send to SAP from the incoming request body
        const payload = req.body;

        if (!payload || Object.keys(payload).length === 0) {
            return res.status(400).json({ success: false, error: 'Request body is empty' });
        }

        // Pass to the service layer to make the actual call
        const responseData = await sapODataService.postData(payload);

        res.status(201).json({
            success: true,
            message: 'Data successfully created in SAP',
            data: responseData
        });
    } catch (error) {
        console.error('Error in postSAPData controller:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to post data to SAP S/4HANA',
            details: error.message
        });
    }
};

/**
 * Controller to handle ZGDTEST via Native RFC.
 */
const callRFC = async (req, res) => {
    try {
        const params = req.body || {};
        const responseData = await sapRFCService.callZGDTEST(params);

        res.status(200).json({
            success: true,
            message: 'Native RFC call ZGDTEST successful',
            data: responseData
        });
    } catch (error) {
        console.error('Error in callRFC controller:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to call native SAP RFC',
            details: error.message
        });
    }
};

/**
 * Controller to handle ZGDTEST via OData.
 */
const callODataRFC = async (req, res) => {
    try {
        const payload = req.body || {};
        const responseData = await sapODataService.callZGDTESTOData(payload);

        res.status(200).json({
            success: true,
            message: 'OData call for ZGDTEST successful',
            data: responseData
        });
    } catch (error) {
        console.error('Error in callODataRFC controller:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to call SAP OData for ZGDTEST',
            details: error.message
        });
    }
};

/**
 * Controller to handle Material Stock requests.
 */
const getMaterialStock = async (req, res) => {
    try {
        const payload = req.body || {};
        const data = await sapODataService.getMaterialStock(payload);

        res.status(200).json({
            Message: 'Material stock data retrieved successfully',
            StatusCode: 200,
            Data: data
        });
    } catch (error) {
        console.error('Error in getMaterialStock controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to fetch Material Stock data',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Inspection Result Value requests.
 */
const getInspectionResultValue = async (req, res) => {
    try {
        const payload = req.body || {};
        const data = await sapODataService.getInspectionResultValue(payload);

        res.status(200).json({
            Message: 'Inspection Result Value data retrieved successfully',
            StatusCode: 200,
            Data: data
        });
    } catch (error) {
        console.error('Error in getInspectionResultValue controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to fetch Inspection Result Value data',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Material Document Header creation requests.
 */
const postMaterialDocumentHeader = async (req, res) => {
    try {
        const payload = req.body || {};
        const data = await sapODataService.postMaterialDocumentHeader(payload);

        res.status(201).json({
            Message: 'Material Document Header created successfully',
            StatusCode: 201,
            Data: data
        });
    } catch (error) {
        console.error('Error in postMaterialDocumentHeader controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to create Material Document Header',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Goods Issue on Process Order (261 movement).
 * This hits the same SAP endpoint as Material Document Header but serves a different business process.
 */
const postGoodsIssueProcessOrder = async (req, res) => {
    try {
        const payload = req.body || {};
        // Re-use the existing service logic since the SAP API endpoint is exactly the same!
        const data = await sapODataService.postMaterialDocumentHeader(payload);

        res.status(201).json({
            Message: 'Goods Issue on Process Order created successfully',
            StatusCode: 201,
            Data: data
        });
    } catch (error) {
        console.error('Error in postGoodsIssueProcessOrder controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to create Goods Issue on Process Order',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Goods Issue on Cost center (201 movement).
 * This hits the same SAP endpoint as Material Document Header but serves a different business process.
 */
const postGoodsIssueCostCenter = async (req, res) => {
    try {
        const payload = req.body || {};
        // Re-use the existing service logic since the SAP API endpoint is exactly the same!
        const data = await sapODataService.postMaterialDocumentHeader(payload);

        res.status(201).json({
            Message: 'Goods Issue on Cost center created successfully',
            StatusCode: 201,
            Data: data
        });
    } catch (error) {
        console.error('Error in postGoodsIssueCostCenter controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to create Goods Issue on Cost center',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Stock transfer material to material (309 movement).
 * This hits the same SAP endpoint as Material Document Header but serves a different business process.
 */
const postStockTransferMaterialToMaterial = async (req, res) => {
    try {
        const payload = req.body || {};
        // Re-use the existing service logic since the SAP API endpoint is exactly the same!
        const data = await sapODataService.postMaterialDocumentHeader(payload);

        res.status(201).json({
            Message: 'Stock transfer material to material created successfully',
            StatusCode: 201,
            Data: data
        });
    } catch (error) {
        console.error('Error in postStockTransferMaterialToMaterial controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to create Stock transfer material to material',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Material Document Cancel.
 */
const cancelMaterialDocument = async (req, res) => {
    try {
        const params = req.body || req.query || {};
        const data = await sapODataService.cancelMaterialDocument(params);

        res.status(200).json({
            Message: 'Material Document cancelled successfully',
            StatusCode: 200,
            Data: data
        });
    } catch (error) {
        console.error('Error in cancelMaterialDocument controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to cancel Material Document',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Production Order creation requests.
 */
const postProductionOrder = async (req, res) => {
    try {
        const payload = req.body || {};
        const data = await sapODataService.postProductionOrder(payload);

        res.status(201).json({
            Message: 'Production Order created successfully',
            StatusCode: 201,
            Data: data
        });
    } catch (error) {
        console.error('Error in postProductionOrder controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to create Production Order',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Inspection Lot creation/update requests.
 */
const postInspectionLot = async (req, res) => {
    try {
        const payload = req.body || {};
        const data = await sapODataService.postInspectionLot(payload);

        res.status(201).json({
            Message: 'Inspection Lot processed successfully',
            StatusCode: 201,
            Data: data
        });
    } catch (error) {
        console.error('Error in postInspectionLot controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to process Inspection Lot',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Production Order Confirmation Cancel.
 */
const CancelProdnOrdConf = async (req, res) => {
    try {
        const params = req.body || req.query || {};
        const data = await sapODataService.CancelProdnOrdConf(params);

        res.status(200).json({
            Message: 'Production Order Confirmation cancelled successfully',
            StatusCode: 200,
            Data: data
        });
    } catch (error) {
        console.error('Error in CancelProdnOrdConf controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to cancel Production Order Confirmation',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle pocancel.
 */
const pocancel = async (req, res) => {
    try {
        const params = req.body || req.query || {};
        const data = await sapODataService.pocancel(params);

        res.status(200).json({
            Message: 'PO Cancelled successfully',
            StatusCode: 200,
            Data: data
        });
    } catch (error) {
        console.error('Error in pocancel controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to cancel PO',
            StatusCode: statusCode,
            Data: []
        });
    }
};

/**
 * Controller to handle Prd Order Confirmation creation requests.
 */
const postPrdOrderConfirmation = async (req, res) => {
    try {
        const payload = req.body || {};
        const data = await sapODataService.postPrdOrderConfirmation(payload);

        res.status(201).json({
            Message: 'Prd Order Confirmation processed successfully',
            StatusCode: 201,
            Data: data
        });
    } catch (error) {
        console.error('Error in postPrdOrderConfirmation controller:', error.message);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            Message: error.message || 'Failed to process Prd Order Confirmation',
            StatusCode: statusCode,
            Data: []
        });
    }
};

module.exports = {
    getSAPData,
    postSAPData,
    callRFC,
    callODataRFC,
    getMaterialStock,
    getInspectionResultValue,
    postMaterialDocumentHeader,
    postGoodsIssueProcessOrder,
    postGoodsIssueCostCenter,
    postStockTransferMaterialToMaterial,
    cancelMaterialDocument,
    postProductionOrder,
    postInspectionLot,
    CancelProdnOrdConf,
    pocancel,
    postPrdOrderConfirmation
};
