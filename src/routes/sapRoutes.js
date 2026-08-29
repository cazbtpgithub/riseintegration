const express = require('express');
const router = express.Router();
const sapController = require('../controllers/sapController');

// GET route to fetch data from SAP S/4HANA OData
router.get('/data', sapController.getSAPData);

// POST route to send data to SAP S/4HANA OData
router.post('/data', sapController.postSAPData);

// POST route for Native RFC ZGDTEST
router.post('/rfc/zgdtest', sapController.callRFC);

// POST route for OData ZGDTEST
router.post('/odata/zgdtest', sapController.callODataRFC);

// POST route for Material Stock
router.post('/material-stock', sapController.getMaterialStock);

// POST route for Inspection Result Value
router.post('/inspection-result-value', sapController.getInspectionResultValue);

// POST route for Material Document Header (311 Movement)
router.post('/material-document-header', sapController.postMaterialDocumentHeader);

// POST route for Goods Issue on Process Order (261 Movement)
router.post('/goods-issue-process-order', sapController.postGoodsIssueProcessOrder);

// POST route for Goods Issue on Cost center (201 Movement)
router.post('/goods-issue-cost-center', sapController.postGoodsIssueCostCenter);

// POST route for Stock transfer material to material (309 Movement)
router.post('/stock-transfer-material-to-material', sapController.postStockTransferMaterialToMaterial);

// POST route for Material Document Cancel
router.post('/material-document-cancel', sapController.cancelMaterialDocument);

// POST route for Production Order
router.post('/production-order', sapController.postProductionOrder);

// POST route for Inspection Lot
router.post('/inspection-lot', sapController.postInspectionLot);

// POST route for Production Order Confirmation Cancel
router.post('/CancelProdnOrdConf', sapController.CancelProdnOrdConf);

// POST route for pocancel
router.post('/pocancel', sapController.pocancel);

module.exports = router;
