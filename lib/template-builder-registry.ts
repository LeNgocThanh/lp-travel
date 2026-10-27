import "server-only";
import { TEMPLATE_DOCUMENT_ADAPTERS } from "@/lib/template-builder-adapters";
import { BUILDER_DATASETS, BUILDER_DOCUMENT_TYPES, BUILDER_VARIABLES } from "@/lib/template-builder";
import { TEMPLATE_BUILDER_SAMPLE_DATA } from "@/lib/template-builder-document-data";

export const TEMPLATE_DOCUMENT_REGISTRY = Object.fromEntries(BUILDER_DOCUMENT_TYPES.map((type) => [type.value, {
  type: type.value,
  label: type.label,
  variables: BUILDER_VARIABLES[type.value] ?? [],
  datasets: BUILDER_DATASETS[type.value] ?? [],
  sampleData: TEMPLATE_BUILDER_SAMPLE_DATA[type.value] ?? {},
  buildData: TEMPLATE_DOCUMENT_ADAPTERS[type.value] ?? null,
}]));

export function getTemplateDocumentDefinition(documentType: string) {
  const definition = TEMPLATE_DOCUMENT_REGISTRY[documentType];
  if (!definition) throw new Error(`Loại tài liệu ${documentType} chưa được đăng ký.`);
  return definition;
}
