ALTER TABLE "DocumentDataDataset" ADD COLUMN "operation" TEXT NOT NULL DEFAULT 'DIRECT_LIST';
ALTER TABLE "DocumentDataDataset" ADD COLUMN "startValue" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DocumentDataDataset" ADD COLUMN "maxRows" INTEGER NOT NULL DEFAULT 365;

INSERT INTO "DocumentDataField" ("id", "dataSourceId", "key", "label", "valueType", "sourcePath", "operation", "format", "displayOrder", "createdAt", "updatedAt")
VALUES
('field_itinerary_duration', 'data_source_itinerary', 'lead.duration', 'Duration gốc', 'STRING', 'lead.duration', 'DIRECT', 'NONE', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_itinerary_duration_days', 'data_source_itinerary', 'lead.durationDays', 'Số ngày từ Duration', 'NUMBER', 'lead.duration', 'EXTRACT_DURATION_DAYS', 'NONE', 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('field_itinerary_travel_date', 'data_source_itinerary', 'lead.travelDate', 'Travel Date', 'DATE', 'lead.travelDate', 'DIRECT', 'DATE', 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("dataSourceId", "key") DO NOTHING;

INSERT INTO "DocumentDataDataset" ("id", "dataSourceId", "key", "label", "sourcePath", "operation", "startValue", "maxRows", "displayOrder", "createdAt", "updatedAt")
VALUES ('dataset_itinerary_generated_days', 'data_source_itinerary', 'itinerary.generatedDays', 'Các ngày sinh từ Travel Date và Duration', 'lead.duration', 'GENERATE_DURATION_RANGE', 1, 365, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("dataSourceId", "key") DO NOTHING;

INSERT INTO "DocumentDataDatasetColumn" ("id", "datasetId", "key", "label", "valueType", "sourcePath", "operation", "operandPath", "literalValue", "format", "displayOrder", "createdAt", "updatedAt")
VALUES
('col_generated_day_number', 'dataset_itinerary_generated_days', 'dayNumber', 'Số thứ tự ngày', 'NUMBER', 'row.value', 'DIRECT', NULL, NULL, 'NONE', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('col_generated_day_date', 'dataset_itinerary_generated_days', 'date', 'Ngày', 'DATE', 'root.lead.travelDate', 'ADD_DAYS', 'row.value', '-1', 'DATE', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("datasetId", "key") DO NOTHING;
