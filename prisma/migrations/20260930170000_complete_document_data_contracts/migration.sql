INSERT INTO "DocumentDataField" ("id", "dataSourceId", "key", "label", "valueType", "sourcePath", "operation", "format", "displayOrder", "createdAt", "updatedAt") VALUES
('field_itinerary_destination', 'data_source_itinerary', 'lead.destination', 'Điểm đến', 'STRING', 'lead.destination', 'DIRECT', 'NONE', 55, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_customer_contact', 'data_source_invoice', 'customer.contact', 'Contact', 'STRING', 'customer.contact', 'DIRECT', 'NONE', 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_customer_email', 'data_source_invoice', 'customer.email', 'Email khách hàng', 'STRING', 'customer.email', 'DIRECT', 'NONE', 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_booking_code', 'data_source_invoice', 'invoice.bookingCode', 'Booking Code', 'STRING', 'invoice.bookingCode', 'DIRECT', 'NONE', 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_issuer_name', 'data_source_invoice', 'invoice.issuerName', 'Invoice Issuer', 'STRING', 'invoice.issuerName', 'DIRECT', 'NONE', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_issuer_contact', 'data_source_invoice', 'invoice.issuerContact', 'Contact người lập', 'STRING', 'invoice.issuerContact', 'DIRECT', 'NONE', 110, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_issuer_email', 'data_source_invoice', 'invoice.issuerEmail', 'Email người lập', 'STRING', 'invoice.issuerEmail', 'DIRECT', 'NONE', 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_date', 'data_source_invoice', 'invoice.date', 'Invoice Date', 'DATE', 'invoice.date', 'DIRECT', 'DATE', 130, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_invoice_deposit_due', 'data_source_invoice', 'invoice.depositDueDate', 'Hạn Deposit', 'DATE', 'invoice.depositDueDate', 'DIRECT', 'DATE', 140, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("dataSourceId", "key") DO NOTHING;

INSERT INTO "DocumentDataDatasetColumn" ("id", "datasetId", "key", "label", "valueType", "sourcePath", "operation", "format", "displayOrder", "createdAt", "updatedAt") VALUES
('col_day_accommodation', 'dataset_itinerary_days', 'accommodation', 'Lưu trú', 'STRING', 'accommodation', 'DIRECT', 'NONE', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_day_overnight', 'dataset_itinerary_days', 'overnight', 'Overnight', 'STRING', 'overnight', 'DIRECT', 'NONE', 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_day_flight', 'dataset_itinerary_days', 'flight', 'Flight', 'STRING', 'flight', 'DIRECT', 'NONE', 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_day_notes', 'dataset_itinerary_days', 'notes', 'Ghi chú', 'STRING', 'notes', 'DIRECT', 'NONE', 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_invoice_number', 'dataset_invoice_items', 'number', 'Item', 'NUMBER', 'number', 'DIRECT', 'NONE', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_cost_note', 'dataset_estimate_costs', 'note', 'NOTE (TTTT NCC)', 'STRING', 'note', 'DIRECT', 'NONE', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("datasetId", "key") DO NOTHING;
