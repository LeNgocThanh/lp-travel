CREATE TABLE "DocumentDataSource" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "documentType" TEXT NOT NULL, "adapterCode" TEXT NOT NULL, "description" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentDataSource_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DocumentDataField" (
  "id" TEXT NOT NULL, "dataSourceId" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL, "valueType" TEXT NOT NULL DEFAULT 'STRING', "sourcePath" TEXT, "operation" TEXT NOT NULL DEFAULT 'DIRECT', "operandPath" TEXT, "literalValue" TEXT, "format" TEXT NOT NULL DEFAULT 'NONE', "defaultValue" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "displayOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentDataField_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DocumentDataDataset" (
  "id" TEXT NOT NULL, "dataSourceId" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL, "sourcePath" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "displayOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentDataDataset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DocumentDataDatasetColumn" (
  "id" TEXT NOT NULL, "datasetId" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL, "valueType" TEXT NOT NULL DEFAULT 'STRING', "sourcePath" TEXT, "operation" TEXT NOT NULL DEFAULT 'DIRECT', "operandPath" TEXT, "literalValue" TEXT, "format" TEXT NOT NULL DEFAULT 'NONE', "defaultValue" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "displayOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentDataDatasetColumn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentDataSource_code_key" ON "DocumentDataSource"("code");
CREATE UNIQUE INDEX "DocumentDataSource_documentType_key" ON "DocumentDataSource"("documentType");
CREATE UNIQUE INDEX "DocumentDataField_dataSourceId_key_key" ON "DocumentDataField"("dataSourceId", "key");
CREATE INDEX "DocumentDataField_dataSourceId_active_displayOrder_idx" ON "DocumentDataField"("dataSourceId", "active", "displayOrder");
CREATE UNIQUE INDEX "DocumentDataDataset_dataSourceId_key_key" ON "DocumentDataDataset"("dataSourceId", "key");
CREATE INDEX "DocumentDataDataset_dataSourceId_active_displayOrder_idx" ON "DocumentDataDataset"("dataSourceId", "active", "displayOrder");
CREATE UNIQUE INDEX "DocumentDataDatasetColumn_datasetId_key_key" ON "DocumentDataDatasetColumn"("datasetId", "key");
CREATE INDEX "DocumentDataDatasetColumn_datasetId_active_displayOrder_idx" ON "DocumentDataDatasetColumn"("datasetId", "active", "displayOrder");
ALTER TABLE "DocumentDataField" ADD CONSTRAINT "DocumentDataField_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DocumentDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentDataDataset" ADD CONSTRAINT "DocumentDataDataset_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DocumentDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentDataDatasetColumn" ADD CONSTRAINT "DocumentDataDatasetColumn_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "DocumentDataDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "DocumentDataSource" ("id", "code", "name", "documentType", "adapterCode", "description", "createdAt", "updatedAt") VALUES
('data_source_itinerary', 'ITINERARY_SOURCE', 'Dữ liệu lịch trình', 'ITINERARY', 'ITINERARY', 'Nguồn an toàn từ QuickItinerary hoặc WorkCaseItinerary.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('data_source_invoice', 'INVOICE_SOURCE', 'Dữ liệu Invoice', 'INVOICE', 'INVOICE', 'Nguồn an toàn từ LeadInvoice.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('data_source_estimate', 'ESTIMATE_SOURCE', 'Dữ liệu dự toán', 'ESTIMATE', 'ESTIMATE', 'Nguồn an toàn từ InvoiceEstimate.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "DocumentDataField" ("id", "dataSourceId", "key", "label", "sourcePath", "displayOrder", "createdAt", "updatedAt") VALUES
('field_itinerary_title', 'data_source_itinerary', 'itinerary.title', 'Tiêu đề lịch trình', 'itinerary.title', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_itinerary_inclusions', 'data_source_itinerary', 'itinerary.inclusions', 'Inclusions', 'itinerary.inclusions', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_itinerary_exclusions', 'data_source_itinerary', 'itinerary.exclusions', 'Exclusions', 'itinerary.exclusions', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_itinerary_notes', 'data_source_itinerary', 'itinerary.notes', 'NOTES', 'itinerary.notes', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_customer_name_itinerary', 'data_source_itinerary', 'customer.name', 'Tên khách hàng', 'customer.name', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_number', 'data_source_invoice', 'invoice.number', 'Số Invoice', 'invoice.number', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_total', 'data_source_invoice', 'invoice.totalAmountUsd', 'Tổng tiền USD', 'invoice.totalAmountUsd', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_deposit', 'data_source_invoice', 'invoice.depositAmountUsd', 'Deposit', 'invoice.depositAmountUsd', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_balance', 'data_source_invoice', 'invoice.balanceAmountUsd', 'Balance', 'invoice.balanceAmountUsd', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_due', 'data_source_invoice', 'invoice.dueDate', 'Due Date', 'invoice.dueDate', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_customer_name_invoice', 'data_source_invoice', 'customer.name', 'Bill To', 'customer.name', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_estimate_cost', 'data_source_estimate', 'estimate.totalCost', 'Tổng chi phí', 'estimate.totalCost', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_estimate_revenue', 'data_source_estimate', 'estimate.totalRevenue', 'Tổng doanh thu', 'estimate.totalRevenue', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_estimate_profit', 'data_source_estimate', 'estimate.profit', 'Lợi nhuận', 'estimate.profit', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "DocumentDataDataset" ("id", "dataSourceId", "key", "label", "sourcePath", "displayOrder", "createdAt", "updatedAt") VALUES
('dataset_itinerary_days', 'data_source_itinerary', 'itinerary.days', 'Các ngày lịch trình', 'itinerary.days', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('dataset_invoice_items', 'data_source_invoice', 'invoice.items', 'Các dòng Invoice', 'invoice.items', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('dataset_invoice_options', 'data_source_invoice', 'invoice.paymentOptions', 'Payment Options', 'invoice.paymentOptions', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('dataset_estimate_costs', 'data_source_estimate', 'estimate.costItems', 'Chi phí dự toán', 'estimate.costItems', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('dataset_estimate_revenues', 'data_source_estimate', 'estimate.revenueItems', 'Quyết toán', 'estimate.revenueItems', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "DocumentDataDatasetColumn" ("id", "datasetId", "key", "label", "sourcePath", "displayOrder", "createdAt", "updatedAt") VALUES
('col_day_date', 'dataset_itinerary_days', 'date', 'Ngày', 'date', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_day_title', 'dataset_itinerary_days', 'title', 'Tiêu đề', 'title', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_day_transport', 'dataset_itinerary_days', 'transport', 'Phương tiện', 'transport', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_day_meals', 'dataset_itinerary_days', 'meals', 'Bữa ăn', 'meals', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_day_content', 'dataset_itinerary_days', 'content', 'Nội dung', 'content', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_invoice_description', 'dataset_invoice_items', 'description', 'Description', 'description', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_invoice_quantity', 'dataset_invoice_items', 'quantity', 'Qty', 'quantity', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_invoice_unit', 'dataset_invoice_items', 'unit', 'Unit', 'unit', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_invoice_price', 'dataset_invoice_items', 'price', 'Price/P', 'price', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_invoice_amount', 'dataset_invoice_items', 'amount', 'Amount', 'amount', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_option_name', 'dataset_invoice_options', 'name', 'Tên', 'name', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_option_content', 'dataset_invoice_options', 'content', 'Nội dung', 'content', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_cost_category', 'dataset_estimate_costs', 'category', 'Hạng mục', 'category', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_cost_price', 'dataset_estimate_costs', 'unitPrice', 'Đơn giá', 'unitPrice', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_cost_quantity', 'dataset_estimate_costs', 'quantity', 'Số lượng', 'quantity', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_cost_amount', 'dataset_estimate_costs', 'amount', 'Thành tiền', 'amount', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_cost_vat', 'dataset_estimate_costs', 'vat', 'VAT', 'vat', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_revenue_type', 'dataset_estimate_revenues', 'settlementType', 'Quyết toán', 'settlementType', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_revenue_description', 'dataset_estimate_revenues', 'description', 'Danh mục', 'description', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_revenue_price', 'dataset_estimate_revenues', 'unitPriceUsd', 'Đơn giá (USD)', 'unitPriceUsd', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_revenue_quantity', 'dataset_estimate_revenues', 'quantity', 'Số lượng', 'quantity', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_revenue_usd', 'dataset_estimate_revenues', 'amountUsd', 'Tiền đô', 'amountUsd', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('col_revenue_vnd', 'dataset_estimate_revenues', 'amountVnd', 'Tiền Việt', 'amountVnd', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
