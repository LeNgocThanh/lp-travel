INSERT INTO "TemplateBuilderVersion" ("id", "documentId", "version", "status", "schema", "metadata", "createdById", "createdByName", "createdAt", "updatedAt")
SELECT 'builder_seed_itinerary_v2', "id", 2, 'DRAFT',
  '{"page":{"size":"A4","orientation":"portrait","margin":28,"fontFamily":"Arial","fontSize":11},"blocks":[{"id":"v2-itinerary-title","type":"heading","content":"ITINERARY","level":1,"align":"center","color":"#111827","fontSize":20,"bold":true,"marginTop":8},{"id":"v2-itinerary-summary","type":"itinerarySummary","marginTop":14},{"id":"v2-itinerary-details-title","type":"heading","content":"I. Details Itinerary:","level":2,"align":"left","color":"#111827","fontSize":14,"bold":true,"marginTop":28},{"id":"v2-itinerary-details","type":"itineraryDetails","marginTop":12},{"id":"v2-itinerary-end-space","type":"spacer","height":48},{"id":"v2-itinerary-end","type":"heading","content":"End of services!","level":3,"align":"center","color":"#111827","fontSize":13,"bold":true},{"id":"v2-itinerary-information","type":"itineraryInformation","marginTop":48}]}',
  '{"source":"hardcoded-current-layout","layoutVersion":2,"visualBuilderVersion":2}', 'SYSTEM_SEED', 'System Seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TemplateBuilderDocument" WHERE "code" = 'CURRENT_ITINERARY'
ON CONFLICT ("documentId", "version") DO NOTHING;

INSERT INTO "TemplateBuilderVersion" ("id", "documentId", "version", "status", "schema", "metadata", "createdById", "createdByName", "createdAt", "updatedAt")
SELECT 'builder_seed_invoice_v2', "id", 2, 'DRAFT',
  '{"page":{"size":"A4","orientation":"portrait","margin":32,"fontFamily":"Arial","fontSize":10},"blocks":[{"id":"v2-invoice-title","type":"heading","content":"INVOICE","level":1,"align":"center","color":"#111827","fontSize":18,"bold":true,"marginTop":8},{"id":"v2-invoice-parties","type":"invoiceParties","marginTop":20},{"id":"v2-invoice-items","type":"invoiceItems","marginTop":20},{"id":"v2-invoice-totals","type":"invoiceTotals","marginTop":10},{"id":"v2-invoice-payment-title","type":"heading","content":"PAYMENT OPTIONS","level":2,"align":"left","color":"#111827","fontSize":12,"bold":true,"marginTop":28},{"id":"v2-invoice-payment-options","type":"paymentOptions","marginTop":8},{"id":"v2-invoice-thanks","type":"heading","content":"Thank You For Travelling With Us!","level":3,"align":"center","color":"#111827","fontSize":11,"bold":true,"italic":true,"marginTop":36}]}',
  '{"source":"hardcoded-current-layout","layoutVersion":2,"visualBuilderVersion":2}', 'SYSTEM_SEED', 'System Seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TemplateBuilderDocument" WHERE "code" = 'CURRENT_INVOICE'
ON CONFLICT ("documentId", "version") DO NOTHING;

INSERT INTO "TemplateBuilderVersion" ("id", "documentId", "version", "status", "schema", "metadata", "createdById", "createdByName", "createdAt", "updatedAt")
SELECT 'builder_seed_estimate_v2', "id", 2, 'DRAFT',
  '{"page":{"size":"A4","orientation":"landscape","margin":20,"fontFamily":"Arial","fontSize":10},"blocks":[{"id":"v2-estimate-title","type":"heading","content":"BẢNG DỰ TOÁN","level":1,"align":"center","color":"#111827","fontSize":18,"bold":true},{"id":"v2-estimate-tables","type":"estimateTables","marginTop":20},{"id":"v2-estimate-profit","type":"estimateProfit","marginTop":24,"backgroundColor":"#f8fafc","padding":12}]}',
  '{"source":"hardcoded-current-layout","visualBuilderVersion":2}', 'SYSTEM_SEED', 'System Seed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TemplateBuilderDocument" WHERE "code" = 'CURRENT_ESTIMATE'
ON CONFLICT ("documentId", "version") DO NOTHING;
