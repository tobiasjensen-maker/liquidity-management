// Sample data for Cash Flow Intelligence Dashboard

export type ForecastPoint = {
    date: string;
    label: string;
    actual: number | null;
    projected: number | null;
    threshold: number;
};

export type OverdueInvoice = {
    id: string;
    invoiceNumber: string;
    customer: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
    reminderSent: boolean;
};

export type CashEvent = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'inflow' | 'outflow';
    confidence: 'high' | 'medium' | 'low';
};

export type ShortfallWarning = {
    id: string;
    predictedDate: string;
    projectedDeficit: number;
    daysUntil: number;
    suggestions: string[];
};

export type EarlyPaymentOpportunity = {
    id: string;
    supplier: string;
    invoiceAmount: number;
    discountPercent: number;
    savings: number;
    deadline: string;
    daysLeft: number;
};

// Helper to generate dates relative to today
const today = new Date();
const addDays = (d: Date, days: number) => {
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
};
const fmt = (d: Date) => d.toISOString().split('T')[0];
const fmtShort = (d: Date) =>
    `${d.getDate()}.${d.getMonth() + 1}`;

// 90-day forecast data (6 actual days + 90 projected days)
// The forecast should show a realistic cash flow pattern:
// - Starts at ~285k
// - Drops sharply around day 2 (salary: -145k)
// - Partial recovery around day 5-10 (incoming invoices)
// - Dips below threshold around day 18 (moms + accumulated outflows)
// - Recovers after day 25 as payments come in
const cashFlowPattern: number[] = [];
let balance = 285000;
// Day -5 to -1: actual historical (slight decline)
for (let i = 0; i < 6; i++) {
    cashFlowPattern.push(Math.round(balance));
    balance -= 1500 + Math.random() * 1000;
}
// Day 0+: projected future
const events: Record<number, number> = {
    2: -145000,  // Løn
    5: 67500,    // Faktura Møllers Transport
    7: -28000,   // Husleje
    10: 95000,   // Faktura Aarhus Kommune
    12: -35600,  // Software-licenser
    15: 23400,   // Faktura Grøn Energi
    18: -52000,  // Moms
};
for (let d = 0; d <= 90; d++) {
    if (events[d]) {
        balance += events[d];
    }
    // Small daily drift (minor expenses)
    balance -= 800 + Math.sin(d * 0.3) * 500;
    cashFlowPattern.push(Math.round(balance));
}

export const forecastData: ForecastPoint[] = cashFlowPattern.map((value, i) => {
    const day = addDays(today, i - 5);
    const isActual = i < 6;
    return {
        date: fmt(day),
        label: fmtShort(day),
        actual: isActual ? value : null,
        projected: isActual ? null : value,
        threshold: 50000,
    };
});

export const overdueInvoices: OverdueInvoice[] = [
    {
        id: '1',
        invoiceNumber: 'FAK-2024-1847',
        customer: 'Nordisk Kontor ApS',
        amount: 42500,
        dueDate: fmt(addDays(today, -42)),
        daysOverdue: 42,
        reminderSent: true,
    },
    {
        id: '2',
        invoiceNumber: 'FAK-2024-1923',
        customer: 'Hansen & Co. A/S',
        amount: 18750,
        dueDate: fmt(addDays(today, -28)),
        daysOverdue: 28,
        reminderSent: false,
    },
    {
        id: '3',
        invoiceNumber: 'FAK-2024-1956',
        customer: 'Danske Maskiner ApS',
        amount: 8500,
        dueDate: fmt(addDays(today, -14)),
        daysOverdue: 14,
        reminderSent: false,
    },
    {
        id: '4',
        invoiceNumber: 'FAK-2024-1978',
        customer: 'Petersen Byg & Anlæg',
        amount: 31200,
        dueDate: fmt(addDays(today, -7)),
        daysOverdue: 7,
        reminderSent: false,
    },
    {
        id: '5',
        invoiceNumber: 'FAK-2024-1992',
        customer: 'Sjælland IT Solutions',
        amount: 12800,
        dueDate: fmt(addDays(today, -3)),
        daysOverdue: 3,
        reminderSent: false,
    },
];

export const upcomingEvents: CashEvent[] = [
    {
        id: '1',
        date: fmt(addDays(today, 2)),
        description: 'Løn, april',
        amount: -145000,
        type: 'outflow',
        confidence: 'high',
    },
    {
        id: '2',
        date: fmt(addDays(today, 5)),
        description: 'Faktura #1834 — Møllers Transport',
        amount: 67500,
        type: 'inflow',
        confidence: 'medium',
    },
    {
        id: '3',
        date: fmt(addDays(today, 7)),
        description: 'Husleje, Kontorlokale',
        amount: -28000,
        type: 'outflow',
        confidence: 'high',
    },
    {
        id: '4',
        date: fmt(addDays(today, 10)),
        description: 'Faktura #1856 — Aarhus Kommune',
        amount: 95000,
        type: 'inflow',
        confidence: 'high',
    },
    {
        id: '5',
        date: fmt(addDays(today, 12)),
        description: 'Software-licenser (årlig)',
        amount: -35600,
        type: 'outflow',
        confidence: 'high',
    },
    {
        id: '6',
        date: fmt(addDays(today, 15)),
        description: 'Faktura #1901 — Grøn Energi A/S',
        amount: 23400,
        type: 'inflow',
        confidence: 'low',
    },
    {
        id: '7',
        date: fmt(addDays(today, 18)),
        description: 'Moms (kvartalsvis)',
        amount: -52000,
        type: 'outflow',
        confidence: 'high',
    },
];

export const shortfallWarnings: ShortfallWarning[] = [
    {
        id: '1',
        predictedDate: fmt(addDays(today, 18)),
        projectedDeficit: -38500,
        daysUntil: 18,
        suggestions: [
            'Anmod om tidlig betaling fra Aarhus Kommune (DKK 95.000)',
            'Udskyd betaling af software-licenser til 1. maj',
        ],
    },
];

export const earlyPaymentOpportunities: EarlyPaymentOpportunity[] = [
    {
        id: '1',
        supplier: 'Dansk Kontorforsyning A/S',
        invoiceAmount: 15600,
        discountPercent: 2,
        savings: 312,
        deadline: fmt(addDays(today, 8)),
        daysLeft: 8,
    },
    {
        id: '2',
        supplier: 'Nordic Paper & Print',
        invoiceAmount: 8900,
        discountPercent: 1.5,
        savings: 134,
        deadline: fmt(addDays(today, 12)),
        daysLeft: 12,
    },
];

// KPI summary data
export const kpiData = {
    currentBalance: 285000,
    projectedBalance30: 142500,
    overdueTotal: 113750,
    upcomingOutflows: 260600,
};
