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

// POST route for Stock transfer from storageloc to storagelocation (311 Movement)
router.post('/stock-transfer-from-storageloc-to-storagelocation', sapController.postStockTransferStorageLocToStorageLoc);

// POST route for Goods Issue on Process Order (261 Movement)
router.post('/goods-issue-process-order', sapController.postGoodsIssueProcessOrder);

// POST route for Goods Issue on Cost center (201 Movement)
router.post('/goods-issue-cost-center', sapController.postGoodsIssueCostCenter);

// POST route for Stock transfer material to material (309 Movement)
router.post('/stock-transfer-material-to-material', sapController.postStockTransferMaterialToMaterial);

// POST route for Stock Transfer from Quality to unrestricted (321 Movement)
router.post('/stock-transfer-from-quality-to-unrestricted', sapController.postStockTransferQualityToUnrestricted);

// POST route for Material Document Cancel
router.post('/material-document-cancel', sapController.cancelMaterialDocument);

// POST route for Inspection Result Record
router.post('/Inspection-Result-Record', sapController.postInspectionResultRecord);

// POST route for Inspection Lot
router.post('/inspection-lot', sapController.postInspectionLot);

// POST route for Production Order Confirmation Cancel
router.post('/CancelProdnOrdConf', sapController.CancelProdnOrdConf);

// POST route for Production order confirmation cancel
router.post('/production-order-confirmation-cancel', sapController.productionOrderConfirmationCancel);

// POST route for Prd Order Confirmation
router.post('/prdorderconfirmation', sapController.postPrdOrderConfirmation);

// POST route for Production Order Details
router.post('/prodordergetdetails', sapController.getProductionOrderDetails);

module.exports = router;
