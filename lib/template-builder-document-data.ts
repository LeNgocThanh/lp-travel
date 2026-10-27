export type TemplateDocumentPrimitive = string | number | boolean | null;
export type TemplateDocumentValue = TemplateDocumentPrimitive | TemplateDocumentValue[] | { [key: string]: TemplateDocumentValue };
export type TemplateDocumentData = { [key: string]: TemplateDocumentValue };

export function getTemplateDataValue(data: TemplateDocumentData, path: string): TemplateDocumentValue | undefined {
  return path.split(".").reduce<TemplateDocumentValue | undefined>((current, key) => current && typeof current === "object" && !Array.isArray(current) ? current[key] : undefined, data);
}

export function displayTemplateValue(value: TemplateDocumentValue | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? "" : String(item)).filter(Boolean).join(", ");
  if (typeof value === "object") return "—";
  return String(value);
}

export const TEMPLATE_BUILDER_SAMPLE_DATA: Record<string, TemplateDocumentData> = {
  ITINERARY: {
    itinerary: {
      title: "ITINERARY",
      inclusions: ["Accommodations based on twin/double occupancy", "Tours and sightseeing as per the itinerary", "Transfers by vehicles with A/C", "Tour guide(s) escort as per the itinerary"],
      exclusions: ["E-Visa to Vietnam", "Meals not mentioned in the itinerary", "Personal expenses and optional services", "Services not mentioned in the itinerary"],
      notes: ["We strongly recommend the purchase of travel insurance.", "Prices are valid 30 days from the date of offers."],
      generatedDays: [{ dayNumber: 1, date: "21/06/2026" }, { dayNumber: 2, date: "22/06/2026" }, { dayNumber: 3, date: "23/06/2026" }],
      days: [
        { dayNumber: 1, date: "Sun, 21 Jun 26", title: "Ho Chi Minh arrival – City tour", transport: "Private Car", meals: "-/L/D", content: "Upon your arrival in Ho Chi Minh City, you will be welcomed and transferred to begin your city exploration.", accommodation: "Hotel in Ho Chi Minh city", overnight: "Overnight in Ho Chi Minh city", flight: "VN 123", notes: "Check-in time 14:00.", isLastDay: false },
        { dayNumber: 2, date: "Mon, 22 Jun 26", title: "Ho Chi Minh – Mekong Delta", transport: "Private Car", meals: "B/L/D", content: "Today, leave the city behind and journey into the lush and fertile Mekong Delta.", accommodation: "Hotel in Ho Chi Minh city", overnight: "Overnight in Ho Chi Minh city", flight: "", notes: "", isLastDay: true },
      ],
    },
    customer: { name: "Mr. Pratid and Group" },
    lead: { destination: "Ho Chi Minh – Mekong Delta", travelDate: "2026-06-21", duration: "3D2N", durationDays: 3 },
  },
  INVOICE: {
    invoice: {
      number: "INV-LP-260926",
      bookingCode: "LP-260926",
      date: "30/09/2026",
      dueDate: "15/11/2026",
      issuerName: "Mr Duc Anh",
      issuerContact: "+84 98 123 456",
      issuerEmail: "sales@example.com",
      totalAmountUsd: "1,496.00",
      depositAmountUsd: "748.00",
      depositDueDate: "26/09/2026",
      balanceAmountUsd: "748.00",
      items: [{ number: 1, description: "DAD–PQC", quantity: 8, unit: "Pax", price: "187.00", amount: "1,496.00" }],
      paymentOptions: [{ name: "Secure Online Payment via Credit Card", content: "(Vietnamese Dong Only)\nhttps://checkout.onepay.vn/mylink/lapassiontravel" }, { name: "Bank Transfer", content: "Beneficiary Name: LA PASSION TRAVEL COMPANY LIMITED\nAccount Number: 66668888698\nBeneficiary Bank: TPBank" }],
    },
    customer: { name: "Mr. Pratid and Group", contact: "+66 9122 5401", email: "customer@example.com" },
  },
  ESTIMATE: {
    estimate: {
      totalCost: "12.100.000 ₫",
      totalRevenue: "38.000.000 ₫",
      profit: "25.900.000 ₫",
      costItems: [{ category: "1. Accommodation", unitPrice: "4.000.000 ₫", quantity: 2, amount: "8.000.000 ₫", vat: "800.000 ₫", note: "Đã đặt cọc" }, { category: "2. Transportation", unitPrice: "3.000.000 ₫", quantity: 1, amount: "3.000.000 ₫", vat: "300.000 ₫", note: "" }],
      revenueItems: [{ settlementType: "Tour", description: "DAD–PQC", unitPriceUsd: "187.00", quantity: 8, amountUsd: "1,496.00", amountVnd: "38.000.000 ₫" }],
    },
  },
  QUOTATION: { quotation: { number: "QT-0001", total: "$1,500.00", items: [] }, customer: { name: "Nguyen Van A" } },
  OTHER: {},
};
