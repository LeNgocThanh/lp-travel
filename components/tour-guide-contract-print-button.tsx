"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TourGuideContractPrintButton() { return <Button type="button" variant="outline" onClick={() => { document.body.classList.add("printing-guide-contract"); window.print(); document.body.classList.remove("printing-guide-contract"); }}><Printer />In / Xuất PDF</Button>; }
