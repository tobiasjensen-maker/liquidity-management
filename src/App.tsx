import { useState } from 'react';
import {
    Layout,
    Header,
    Navigation2,
    Card,
    Button,
    IconButton,
    Badge,
    Select2,
    Icon,
    Dialog,
    Tooltip,
    Alert,
    useToast,
} from '@economic/taco';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ReferenceLine,
} from 'recharts';
import {
    forecastData,
    overdueInvoices,
    upcomingEvents,
    shortfallWarnings,
    earlyPaymentOpportunities,
    kpiData,
    type OverdueInvoice,
} from './data';

// Toast helper — uses taco's useToast under the hood
let _toaster: any = null;
function showNotification(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') {
    if (!_toaster) return;
    if (type === 'success') _toaster.success(message);
    else if (type === 'warning') _toaster.warning(message);
    else if (type === 'error') _toaster.error(message);
    else _toaster.information(message);
}

function ToastInitializer() {
    const toaster = useToast();
    _toaster = toaster;
    return null;
}

function formatDKK(n: number) {
    return n.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

// --- KPI Cards ---
function KpiCards({ period }: { period: string }) {
    const days = parseInt(period);

    // Get projected balance at end of selected period
    const endIdx = Math.min(5 + days, forecastData.length - 1);
    const projectedBalance = forecastData[endIdx]?.projected ?? forecastData[endIdx]?.actual ?? 0;
    const aboveThreshold = projectedBalance > 50000;

    // Sum outflows within the selected period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    const periodOutflows = upcomingEvents
        .filter((ev) => ev.type === 'outflow' && new Date(ev.date) <= cutoffDate)
        .reduce((sum, ev) => sum + Math.abs(ev.amount), 0);

    return (
        <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg border border-grey-200 p-4">
                <div className="text-xs text-grey-600 mb-1 font-bold">Aktuel saldo</div>
                <div className="text-2xl font-bold text-black">{formatDKK(kpiData.currentBalance)}</div>
                <div className="text-xs text-grey-500 mt-1">DKK</div>
            </div>
            <div className="bg-white rounded-lg border border-grey-200 p-4">
                <div className="text-xs text-grey-600 mb-1 font-bold">Forventet saldo ({days} dage)</div>
                <div className="text-2xl font-bold text-black">{formatDKK(projectedBalance)}</div>
                <div className={`text-xs mt-1 flex items-center gap-1 ${aboveThreshold ? 'text-green-600' : 'text-red-500'}`}>
                    <Icon name={aboveThreshold ? 'circle-tick' : 'circle-warning'} className="w-3 h-3" />
                    {aboveThreshold ? 'Over tærskelværdi' : 'Under tærskelværdi'}
                </div>
            </div>
            <div className="bg-white rounded-lg border border-grey-200 p-4">
                <div className="text-xs text-grey-600 mb-1 font-bold">Forfaldne fakturaer</div>
                <div className="text-2xl font-bold text-red-500">{formatDKK(kpiData.overdueTotal)}</div>
                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <Icon name="circle-warning" className="w-3 h-3" /> {overdueInvoices.length} fakturaer
                </div>
            </div>
            <div className="bg-white rounded-lg border border-grey-200 p-4">
                <div className="text-xs text-grey-600 mb-1 font-bold">Kommende udbetalinger</div>
                <div className="text-2xl font-bold text-black">{formatDKK(periodOutflows)}</div>
                <div className="text-xs text-grey-500 mt-1">Næste {days} dage</div>
            </div>
        </div>
    );
}

// --- Custom dot for event markers ---
function EventDot(props: any) {
    const { cx, cy, payload } = props;
    if (!payload?.event || !cx || !cy) return null;
    const isInflow = payload.event.type === 'inflow';
    return (
        <g>
            <circle cx={cx} cy={cy} r={10} fill={isInflow ? '#08AE87' : '#CE3F42'} fillOpacity={0.15} />
            <circle cx={cx} cy={cy} r={5} fill={isInflow ? '#08AE87' : '#CE3F42'} stroke="white" strokeWidth={2} />
        </g>
    );
}

// --- Custom tooltip for chart ---
function ChartTooltipContent({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const event = payload[0]?.payload?.event;
    return (
        <div className="bg-white rounded-lg shadow-lg border border-grey-200 p-3 max-w-[240px]">
            <div className="text-xs text-grey-500 mb-1">{label}</div>
            {payload.map((entry: any, i: number) => {
                if (entry.value == null) return null;
                return (
                    <div key={i} className="flex items-center justify-between gap-4 text-sm">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}
                        </span>
                        <span className="font-bold">DKK {formatDKK(entry.value)}</span>
                    </div>
                );
            })}
            {event && (
                <div className="mt-2 pt-2 border-t border-grey-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${event.type === 'inflow' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-bold">{event.description}</span>
                    </div>
                    <div className={`text-xs font-bold ${event.type === 'inflow' ? 'text-green-600' : 'text-red-500'}`}>
                        {event.type === 'inflow' ? '+' : ''}{formatDKK(event.amount)} DKK
                    </div>
                    {event.confidence !== 'high' && (
                        <div className="text-[10px] text-grey-400 mt-0.5">
                            Sikkerhed: {event.confidence === 'medium' ? 'Middel' : 'Lav'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Forecast Chart ---
function ForecastChart() {
    const [horizon, setHorizon] = useState('30');
    const [selectedEvent, setSelectedEvent] = useState<typeof upcomingEvents[0] | null>(null);
    const maxDays = parseInt(horizon);
    const filtered = forecastData.slice(0, 6 + maxDays);

    // Build a label→event lookup from upcomingEvents
    const eventByLabel: Record<string, typeof upcomingEvents[0]> = {};
    upcomingEvents.forEach((ev) => {
        const d = new Date(ev.date);
        const label = `${d.getDate()}.${d.getMonth() + 1}`;
        eventByLabel[label] = ev;
    });

    const chartData = filtered.map((p) => ({
        label: p.label,
        Faktisk: p.actual,
        Forventet: p.projected,
        event: eventByLabel[p.label] || null,
    }));

    const formatYAxis = (value: number) => {
        if (value === 0) return '0';
        const abs = Math.abs(value);
        const label = abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : String(abs);
        return value < 0 ? `-${label}` : label;
    };

    return (
        <Card title="Likviditetsforecast">
            <Card.Content>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-grey-600">Horisont:</span>
                        <div className="flex gap-1">
                            {['30', '60', '90'].map((h) => (
                                <Button
                                    key={h}
                                    appearance={horizon === h ? 'primary' : 'default'}
                                    onClick={() => setHorizon(h)}
                                >
                                    {h} dage
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-grey-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Indbetaling</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Udbetaling</span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
                        onClick={(state: any) => {
                            if (state?.activePayload?.[0]?.payload?.event) {
                                setSelectedEvent(state.activePayload[0].payload.event);
                            }
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEBEB" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#ACACAC" />
                        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} stroke="#ACACAC" width={55} domain={['auto', 'auto']} />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: 12, display: 'flex', justifyContent: 'center' }} />
                        <ReferenceLine y={0} stroke="#1a1a1a" strokeWidth={1} />
                        <ReferenceLine y={50000} stroke="#CE3F42" strokeDasharray="6 4" strokeWidth={2} label={{ value: 'Tærskel: 50k', position: 'right', fontSize: 11, fill: '#CE3F42' }} />
                        <Area
                            type="monotone"
                            dataKey="Faktisk"
                            stroke="#4573D2"
                            fill="#4573D2"
                            fillOpacity={0.15}
                            strokeWidth={2}
                            connectNulls={false}
                            dot={{ r: 3 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="Forventet"
                            stroke="#08AE87"
                            fill="#08AE87"
                            fillOpacity={0.08}
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            connectNulls={false}
                            dot={<EventDot />}
                            activeDot={{ r: 6, stroke: '#08AE87', strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>

                {/* Selected event detail card */}
                {selectedEvent && (
                    <div className="mt-3 border border-grey-200 rounded-lg p-3 flex items-center justify-between bg-grey-50">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                selectedEvent.type === 'inflow' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                <Icon
                                    name={selectedEvent.type === 'inflow' ? 'arrow-right' : 'arrow-left'}
                                    className={`w-4 h-4 ${selectedEvent.type === 'inflow' ? 'text-green-600' : 'text-red-500'}`}
                                />
                            </div>
                            <div>
                                <div className="text-sm font-bold">{selectedEvent.description}</div>
                                <div className="text-xs text-grey-500">
                                    {formatDate(selectedEvent.date)} — Sikkerhed: {
                                        selectedEvent.confidence === 'high' ? 'Høj' :
                                        selectedEvent.confidence === 'medium' ? 'Middel' : 'Lav'
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${selectedEvent.type === 'inflow' ? 'text-green-600' : 'text-red-500'}`}>
                                {selectedEvent.type === 'inflow' ? '+' : ''}{formatDKK(selectedEvent.amount)} DKK
                            </span>
                            <IconButton icon="close" tooltip="Luk" onClick={() => setSelectedEvent(null)} />
                        </div>
                    </div>
                )}
            </Card.Content>
        </Card>
    );
}

// --- Invoice Side Panel ---
function InvoicePanel({ invoice, onClose, onSendReminder }: {
    invoice: OverdueInvoice;
    onClose: () => void;
    onSendReminder: (inv: OverdueInvoice) => void;
}) {
    const [activeTab, setActiveTab] = useState<'document' | 'log' | 'workflows'>('document');

    const logEntries = [
        { date: formatDate(invoice.dueDate), event: 'Faktura oprettet', user: 'System', icon: 'document' as const },
        ...(invoice.daysOverdue > 30 ? [{ date: formatDate(invoice.dueDate), event: 'Første påmindelse sendt', user: 'Maria Svensen', icon: 'note' as const }] : []),
        ...(invoice.daysOverdue > 14 ? [{ date: 'I dag', event: 'Markeret som forfalden', user: 'System', icon: 'warning' as const }] : []),
    ];

    const workflows = [
        {
            name: 'Påmindelse efter 7 dage',
            active: true,
            trigger: '7 dage efter forfaldsdato',
            action: 'Send e-mail med betalingslink',
            lastRun: invoice.daysOverdue >= 7 ? `${invoice.daysOverdue - 7} dage siden` : null,
            nextRun: invoice.daysOverdue < 7 ? `Om ${7 - invoice.daysOverdue} dage` : null,
        },
        {
            name: 'Opfølgning efter 14 dage',
            active: true,
            trigger: '14 dage efter forfaldsdato',
            action: 'Send e-mail + SMS til kontaktperson',
            lastRun: invoice.daysOverdue >= 14 ? `${invoice.daysOverdue - 14} dage siden` : null,
            nextRun: invoice.daysOverdue < 14 ? `Om ${14 - invoice.daysOverdue} dage` : null,
        },
        {
            name: 'Rykker efter 30 dage',
            active: true,
            trigger: '30 dage efter forfaldsdato',
            action: 'Send rykker med gebyr (DKK 100)',
            lastRun: invoice.daysOverdue >= 30 ? `${invoice.daysOverdue - 30} dage siden` : null,
            nextRun: invoice.daysOverdue < 30 ? `Om ${30 - invoice.daysOverdue} dage` : null,
        },
        {
            name: 'Inkassovarsel efter 45 dage',
            active: false,
            trigger: '45 dage efter forfaldsdato',
            action: 'Send inkassovarsel via brev',
            lastRun: null,
            nextRun: invoice.daysOverdue < 45 ? `Om ${45 - invoice.daysOverdue} dage` : null,
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20" />
            {/* Panel */}
            <div
                className="relative w-[420px] h-full bg-white shadow-xl border-l border-grey-200 flex flex-col animate-slide-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-grey-200 flex-shrink-0">
                    <div>
                        <div className="font-bold text-base">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-grey-500">{invoice.customer}</div>
                    </div>
                    <IconButton icon="close" onClick={onClose} tooltip="Luk" />
                </div>

                {/* Tabs */}
                <div className="flex border-b border-grey-200 flex-shrink-0">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'document' ? 'border-blue-500 text-blue-600' : 'border-transparent text-grey-500 hover:text-grey-700'}`}
                        onClick={() => setActiveTab('document')}
                    >
                        Dokument
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'log' ? 'border-blue-500 text-blue-600' : 'border-transparent text-grey-500 hover:text-grey-700'}`}
                        onClick={() => setActiveTab('log')}
                    >
                        Log
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'workflows' ? 'border-blue-500 text-blue-600' : 'border-transparent text-grey-500 hover:text-grey-700'}`}
                        onClick={() => setActiveTab('workflows')}
                    >
                        Workflows
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'document' && (
                        <>
                            {/* Action bar */}
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-grey-200">
                                <IconButton icon="edit" tooltip="Rediger" onClick={() => showNotification('Redigering åbnet')} />
                                <IconButton icon="copy" tooltip="Kopier" onClick={() => showNotification('Kopieret')} />
                                <IconButton icon="print" tooltip="Udskriv" onClick={() => showNotification('Udskriver...')} />
                                <IconButton icon="download" tooltip="Download" onClick={() => showNotification('Downloader...')} />
                                <IconButton icon="delete" tooltip="Slet" appearance="danger" onClick={() => showNotification('Sletning kræver bekræftelse')} />
                            </div>

                            {/* Invoice preview */}
                            <div className="border border-grey-200 rounded-lg p-5 bg-white mb-4">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="text-xs text-grey-500">Fra</div>
                                        <div className="font-bold text-sm">Dit Firma ApS</div>
                                        <div className="text-xs text-grey-500">CVR-nr. 12345678</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold">FAKTURA</div>
                                        <div className="text-xs text-grey-500 mt-1">
                                            Fakturanr.: {invoice.invoiceNumber.replace('FAK-', '')}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="text-xs text-grey-500">Til</div>
                                    <div className="font-bold text-sm">{invoice.customer}</div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-xs mb-5">
                                    <div>
                                        <div className="text-grey-500">Fakturadato</div>
                                        <div className="font-bold">{formatDate(invoice.dueDate)}</div>
                                    </div>
                                    <div>
                                        <div className="text-grey-500">Forfaldsdato</div>
                                        <div className="font-bold text-red-500">{formatDate(invoice.dueDate)}</div>
                                    </div>
                                    <div>
                                        <div className="text-grey-500">Betingelser</div>
                                        <div className="font-bold">Netto 30 dage</div>
                                    </div>
                                </div>

                                <div className="border-t border-grey-200 pt-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-grey-500 text-left">
                                                <th className="pb-2 font-normal">Beskrivelse</th>
                                                <th className="pb-2 font-normal text-right">Antal</th>
                                                <th className="pb-2 font-normal text-right">Pris</th>
                                                <th className="pb-2 font-normal text-right">Beløb</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="py-1">Konsulentydelser</td>
                                                <td className="py-1 text-right">1</td>
                                                <td className="py-1 text-right">{formatDKK(invoice.amount * 0.8)}</td>
                                                <td className="py-1 text-right">{formatDKK(invoice.amount * 0.8)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="border-t border-grey-200 mt-2 pt-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-grey-500">Subtotal</span>
                                            <span>{formatDKK(invoice.amount * 0.8)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-grey-500">25% moms</span>
                                            <span>{formatDKK(invoice.amount * 0.2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold mt-1 pt-1 border-t border-grey-200">
                                            <span>Total DKK</span>
                                            <span>{formatDKK(invoice.amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Icon name="warning" className="text-red-500" />
                                    <span className="font-bold text-red-700">
                                        Forfalden — {invoice.daysOverdue} dage over forfaldsdato
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'log' && (
                        <div className="space-y-0">
                            {logEntries.map((entry, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <Icon name={entry.icon} className="w-4 h-4 text-green-600" />
                                        </div>
                                        {i < logEntries.length - 1 && <div className="w-px flex-1 bg-grey-200 my-1" />}
                                    </div>
                                    <div className="pb-4">
                                        <div className="text-xs text-grey-500 mb-0.5">{entry.date}</div>
                                        <div className="text-sm font-bold">{entry.event}</div>
                                        <div className="text-xs text-grey-500">{entry.user}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'workflows' && (
                        <div className="space-y-3">
                            <p className="text-xs text-grey-500 mb-2">
                                Automatiske påmindelser konfigureret for denne kunde
                            </p>
                            {workflows.map((wf, i) => {
                                const isExecuted = wf.lastRun !== null;
                                const isPending = !isExecuted && wf.active;
                                return (
                                    <div
                                        key={i}
                                        className={`rounded-lg border p-3 ${
                                            !wf.active
                                                ? 'border-grey-200 bg-grey-50 opacity-60'
                                                : isExecuted
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-blue-200 bg-blue-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Icon
                                                    name={isExecuted ? 'circle-tick' : wf.active ? 'refresh' : 'lock'}
                                                    className={`w-4 h-4 ${
                                                        isExecuted ? 'text-green-600' : wf.active ? 'text-blue-500' : 'text-grey-400'
                                                    }`}
                                                />
                                                <span className="text-sm font-bold">{wf.name}</span>
                                            </div>
                                            {isExecuted && (
                                                <Badge subtle className="!bg-green-100 !text-green-700">Sendt</Badge>
                                            )}
                                            {isPending && (
                                                <Badge subtle className="!bg-blue-100 !text-blue-700">Planlagt</Badge>
                                            )}
                                            {!wf.active && (
                                                <Badge subtle>Deaktiveret</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-grey-600 space-y-1 ml-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-grey-400 w-14">Trigger:</span>
                                                <span>{wf.trigger}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-grey-400 w-14">Handling:</span>
                                                <span>{wf.action}</span>
                                            </div>
                                            {isExecuted && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-grey-400 w-14">Udført:</span>
                                                    <span className="text-green-600 font-medium">{wf.lastRun}</span>
                                                </div>
                                            )}
                                            {isPending && wf.nextRun && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-grey-400 w-14">Næste:</span>
                                                    <span className="text-blue-600 font-medium">{wf.nextRun}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Timeline visualization */}
                            <div className="mt-4 pt-3 border-t border-grey-200">
                                <div className="text-xs font-bold text-grey-600 mb-2">Tidslinje</div>
                                <div className="relative">
                                    <div className="h-1 bg-grey-200 rounded-full" />
                                    {workflows.map((wf, i) => {
                                        const isExecuted = wf.lastRun !== null;
                                        const position = [15, 30, 65, 95][i];
                                        return (
                                            <Tooltip key={i} title={`${wf.name}${isExecuted ? ' (sendt)' : wf.active ? ' (planlagt)' : ' (deaktiveret)'}`}>
                                                <span
                                                    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white ${
                                                        isExecuted ? 'bg-green-500' : wf.active ? 'bg-blue-500' : 'bg-grey-300'
                                                    }`}
                                                    style={{ left: `${position}%` }}
                                                />
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[10px] text-grey-400 mt-1">
                                    <span>Forfald</span>
                                    <span>7d</span>
                                    <span>14d</span>
                                    <span>30d</span>
                                    <span>45d</span>
                                </div>
                            </div>

                            <div className="mt-3">
                                <Button
                                    appearance="ghost"
                                    onClick={() => showNotification('Åbner workflow-indstillinger...')}
                                >
                                    <Icon name="settings" className="w-4 h-4 mr-1" />
                                    Rediger workflows
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-grey-200 flex-shrink-0">
                    <Button appearance="ghost" onClick={onClose}>Luk</Button>
                    <Button
                        appearance="primary"
                        onClick={() => {
                            onSendReminder(invoice);
                            onClose();
                        }}
                        disabled={invoice.reminderSent}
                    >
                        {invoice.reminderSent ? 'Påmindelse sendt' : 'Send påmindelse'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Overdue Invoices ---
function OverdueInvoicesPanel() {
    const [invoices, setInvoices] = useState(overdueInvoices);
    const [selectedInvoice, setSelectedInvoice] = useState<OverdueInvoice | null>(null);

    const handleSendReminder = (inv: OverdueInvoice) => {
        setInvoices((prev) =>
            prev.map((i) => (i.id === inv.id ? { ...i, reminderSent: true } : i))
        );
        showNotification(`Betalingspåmindelse sendt til ${inv.customer}`, 'success');
    };

    const totalOverdue = invoices.reduce((sum, inv) => sum + inv.amount, 0);

    return (
        <>
            <Card title="Forfaldne fakturaer">
                <Card.Content>
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-grey-600">
                            {invoices.length} fakturaer — i alt{' '}
                            <span className="font-bold text-red-500">DKK {formatDKK(totalOverdue)}</span>
                        </div>
                    </div>
                    <div className="divide-y divide-grey-200">
                        {invoices.map((inv) => (
                            <div
                                key={inv.id}
                                className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-grey-50 -mx-2 px-2 rounded"
                                onClick={() => setSelectedInvoice(inv)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold truncate">{inv.customer}</span>
                                        <Badge subtle>{inv.daysOverdue} dage</Badge>
                                        {inv.reminderSent && (
                                            <Tooltip title="Påmindelse sendt">
                                                <span><Icon name="circle-tick" className="text-green-500 w-4 h-4" /></span>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="text-xs text-grey-500 mt-0.5">
                                        {inv.invoiceNumber} — Forfald: {formatDate(inv.dueDate)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold whitespace-nowrap">DKK {formatDKK(inv.amount)}</span>
                                    <Icon name="chevron-right" className="text-grey-400 w-4 h-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card.Content>
            </Card>

            {selectedInvoice && (
                <InvoicePanel
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onSendReminder={handleSendReminder}
                />
            )}
        </>
    );
}

// --- Upcoming Cash Events ---
function UpcomingEventsPanel() {
    return (
        <Card title="Kommende likviditetshændelser">
            <Card.Content>
                <div className="divide-y divide-grey-200">
                    {upcomingEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between py-2.5">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        event.type === 'inflow' ? 'bg-green-500' : 'bg-red-400'
                                    }`}
                                />
                                <div className="min-w-0">
                                    <div className="text-sm truncate">{event.description}</div>
                                    <div className="text-xs text-grey-500">{formatDate(event.date)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-sm font-bold whitespace-nowrap ${
                                        event.type === 'inflow' ? 'text-green-600' : 'text-red-500'
                                    }`}
                                >
                                    {event.type === 'inflow' ? '+' : ''}{formatDKK(event.amount)} DKK
                                </span>
                                {event.confidence !== 'high' && (
                                    <Tooltip
                                        title={
                                            event.confidence === 'medium'
                                                ? 'Middel sikkerhed — baseret på betalingshistorik'
                                                : 'Lav sikkerhed — kunden har varierende betalingsmønster'
                                        }
                                    >
                                        <span><Badge subtle small>{event.confidence === 'medium' ? '~' : '?'}</Badge></span>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card.Content>
        </Card>
    );
}

// --- AI Shortfall Warnings ---
const aiRecommendations = [
    {
        action: 'Anmod om tidlig betaling fra Aarhus Kommune',
        amount: 95000,
        impact: 'Lukker underskuddet fuldstændigt',
        confidence: 87,
        reasoning: 'Aarhus Kommune har historisk betalt 4 dage før forfald i 8 af 10 tilfælde. En tidlig anmodning har høj sandsynlighed for succes.',
        type: 'inflow' as const,
        buttonLabel: 'Send e-mail',
        buttonIcon: 'note' as const,
    },
    {
        action: 'Send påmindelse til Hansen & Co. A/S',
        amount: 18750,
        impact: 'Potentiel indbetaling inden underskud',
        confidence: 62,
        reasoning: 'Fakturaen er 28 dage forfalden. Historisk responstid efter påmindelse: 5-8 dage. Tidspunktet passer med at dække en del af hullet.',
        type: 'reminder' as const,
        buttonLabel: 'Send påmindelse',
        buttonIcon: 'refresh' as const,
    },
    {
        action: 'Optag kortfristet kassekredit via Danske Bank',
        amount: 50000,
        impact: 'Sikrer likviditet uanset indbetalinger',
        confidence: 91,
        reasoning: 'Din eksisterende kassekredit hos Danske Bank har DKK 200.000 uudnyttet. Renten er 4,5% p.a. — en midlertidig trækning på DKK 50.000 i 14 dage koster ca. DKK 86.',
        type: 'loan' as const,
        buttonLabel: 'Anmod',
        buttonIcon: 'document' as const,
    },
];

// --- Email Modal ---
const emailRecipients: Record<string, { name: string; email: string }> = {
    'inflow': { name: 'Aarhus Kommune', email: 'faktura@aarhus.dk' },
    'reminder': { name: 'Hansen & Co. A/S', email: 'bogholderi@hansenco.dk' },
};

function EmailModal({ rec, onClose, onSend }: {
    rec: typeof aiRecommendations[0];
    onClose: () => void;
    onSend: () => void;
}) {
    const recipient = emailRecipients[rec.type] ?? { name: '', email: '' };
    const isReminder = rec.type === 'reminder';

    const [to, setTo] = useState(recipient.email);
    const [subject, setSubject] = useState(
        isReminder
            ? `Betalingspåmindelse — Faktura FAK-2024-1923`
            : `Anmodning om tidlig betaling — Faktura #1856`
    );
    const [body, setBody] = useState(
        isReminder
            ? `Kære ${recipient.name},\n\nVi tillader os hermed at minde om faktura FAK-2024-1923 på DKK ${formatDKK(rec.amount)}, som forfaldt for 28 dage siden.\n\nVi vil sætte stor pris på, hvis betalingen kan gennemføres hurtigst muligt.\n\nBetalingslink: https://pay.e-conomic.dk/inv/FAK-2024-1923\n\nVenlig hilsen\nDit Firma ApS`
            : `Kære ${recipient.name},\n\nVi skriver for at forhøre os om muligheden for tidlig betaling af faktura #1856 på DKK ${formatDKK(rec.amount)}, som forfalder om 10 dage.\n\nEn tidlig indbetaling ville hjælpe os med at optimere vores likviditet i den kommende periode.\n\nBetaling kan ske til:\nReg.nr.: 1234\nKontonr.: 5678901234\n\nPå forhånd tak.\n\nVenlig hilsen\nDit Firma ApS`
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30" />
            <div
                className="relative bg-white rounded-xl shadow-2xl w-[650px] max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-grey-200 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-base font-bold m-0">
                        {isReminder ? 'Send betalingspåmindelse' : 'Send anmodning om tidlig betaling'}
                    </h2>
                    <IconButton icon="close" onClick={onClose} tooltip="Luk" />
                </div>

                <div className="px-6 pt-4">
                    <Alert state="information" title="AI-genereret kladde">
                        Beskeden er automatisk udfyldt baseret på fakturadata og kundehistorik. Rediger efter behov før afsendelse.
                    </Alert>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {/* To */}
                    <div>
                        <label className="block text-xs font-bold text-grey-600 mb-1">Til</label>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full h-8 px-3 text-sm border border-grey-300 rounded bg-white"
                        />
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-bold text-grey-600 mb-1">Emne</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full h-8 px-3 text-sm border border-grey-300 rounded bg-white"
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-xs font-bold text-grey-600 mb-1">Besked</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={12}
                            className="w-full px-3 py-2 text-sm border border-grey-300 rounded bg-white resize-y leading-relaxed"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-grey-200 flex items-center justify-end gap-3 flex-shrink-0">
                    <Button appearance="ghost" onClick={onClose}>Annuller</Button>
                    <Button
                        appearance="primary"
                        onClick={() => {
                            onSend();
                            onClose();
                        }}
                    >
                        Send e-mail
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- Bank Loan Modal ---
function BankLoanModal({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
    const [step, setStep] = useState<'review' | 'consent' | 'done'>('review');
    const [mitidChecked, setMitidChecked] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30" />
            <div
                className="relative bg-white rounded-xl shadow-2xl w-[750px] max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Title */}
                <div className="px-6 py-4 border-b border-grey-200 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-base font-bold m-0">
                        {step === 'review' && 'Ansøg om kassekredit — Danske Bank'}
                        {step === 'consent' && 'MitID-samtykke'}
                        {step === 'done' && 'Anmodning sendt'}
                    </h2>
                    <IconButton icon="close" onClick={onClose} tooltip="Luk" />
                </div>
                {step === 'review' && (
                    <div className="px-6 pt-4">
                        <Alert state="information" title="Kassekreditdetaljer">
                            DKK 50.000 fra eksisterende kreditfacilitet (DKK 200.000 uudnyttet). Forventet rente: 4,5% p.a. — ca. DKK 86 for 14 dage.
                        </Alert>
                    </div>
                )}
                <div className="p-6 overflow-y-auto">
                    {step === 'review' && (
                        <>
                            <p className="text-sm text-grey-600 mb-4">
                                Følgende data fra e-conomic sendes til Danske Bank for at behandle din kassekreditanmodning:
                            </p>

                            {/* Data that will be shared */}
                            <div className="space-y-2">
                                {[
                                    { label: 'Virksomhedsoplysninger', detail: 'Dit Firma ApS — CVR 12345678', icon: 'document' as const },
                                    { label: 'Aktuel banksaldo', detail: 'DKK 285.000,00', icon: 'lock' as const },
                                    { label: 'Omsætning (seneste 12 mdr.)', detail: 'DKK 3.450.000,00', icon: 'note' as const },
                                    { label: 'Resultat før skat', detail: 'DKK 412.000,00', icon: 'note' as const },
                                    { label: 'Forfaldne tilgodehavender', detail: 'DKK 113.750,00 (5 fakturaer)', icon: 'warning' as const },
                                    { label: 'Likviditetsprognose (30 dage)', detail: 'Forventet underskud DKK 38.500', icon: 'calendar' as const },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-grey-50 rounded-lg p-3 border border-grey-100">
                                        <Icon name={item.icon} className="w-4 h-4 text-grey-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-grey-500">{item.label}</div>
                                            <div className="text-sm font-medium">{item.detail}</div>
                                        </div>
                                        <Icon name="circle-tick" className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {step === 'consent' && (
                        <>
                            {/* MitID branding */}
                            <div className="flex items-center justify-center mb-5">
                                <div className="bg-[#0060E6] text-white rounded-xl px-6 py-3 flex items-center gap-3">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                        <rect width="24" height="24" rx="4" fill="white"/>
                                        <path d="M6 8h3v8H6V8zm4.5 0H14v8h-3.5V8zm5 0H19v8h-3.5V8z" fill="#0060E6"/>
                                    </svg>
                                    <span className="font-bold text-lg">MitID</span>
                                </div>
                            </div>

                            <p className="text-sm text-grey-600 mb-4 text-center">
                                For at sende dine økonomiske data til Danske Bank kræves dit samtykke via MitID.
                            </p>

                            <div className="border border-grey-200 rounded-lg p-4 mb-4">
                                <div className="text-sm font-bold mb-2">Samtykke-erklæring</div>
                                <div className="text-xs text-grey-600 space-y-2">
                                    <p>Jeg giver hermed samtykke til, at følgende data deles med Danske Bank til brug for behandling af min kassekreditanmodning:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>Virksomhedsoplysninger og CVR-nummer</li>
                                        <li>Aktuel banksaldo og likviditetsprognose</li>
                                        <li>Omsætning og resultat (seneste 12 måneder)</li>
                                        <li>Forfaldne tilgodehavender</li>
                                    </ul>
                                    <p>Data deles i henhold til GDPR art. 6, stk. 1, litra a. Du kan til enhver tid tilbagekalde dit samtykke.</p>
                                </div>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-grey-200 hover:bg-grey-50">
                                <input
                                    type="checkbox"
                                    checked={mitidChecked}
                                    onChange={(e) => setMitidChecked(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 accent-blue-600"
                                />
                                <span className="text-sm">
                                    Jeg bekræfter, at jeg har læst og accepterer ovenstående samtykke-erklæring
                                </span>
                            </label>
                        </>
                    )}

                    {step === 'done' && (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <Icon name="circle-tick" className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="text-base font-bold mb-2">Anmodning sendt til Danske Bank</div>
                            <p className="text-sm text-grey-600 mb-4">
                                Dine økonomiske data er sendt sikkert via MitID. Du modtager svar fra Danske Bank inden for 1-2 bankdage.
                            </p>
                            <div className="bg-grey-50 rounded-lg p-3 text-xs text-grey-500 inline-block">
                                Reference: KK-2026-{Math.floor(Math.random() * 9000 + 1000)}
                            </div>
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="px-6 py-4 border-t border-grey-200 flex items-center justify-end gap-3 flex-shrink-0">
                    {step === 'review' && (
                        <>
                            <Button appearance="ghost" onClick={onClose}>Annuller</Button>
                            <Button appearance="primary" onClick={() => setStep('consent')}>
                                Fortsæt til samtykke
                            </Button>
                        </>
                    )}
                    {step === 'consent' && (
                        <>
                            <Button appearance="ghost" onClick={() => setStep('review')}>Tilbage</Button>
                            <Button
                                appearance="primary"
                                disabled={!mitidChecked}
                                onClick={() => { setStep('done'); onComplete(); }}
                            >
                                Giv samtykke og send informationer
                            </Button>
                        </>
                    )}
                    {step === 'done' && (
                        <Button appearance="primary" onClick={onClose}>Luk</Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ShortfallWarningsPanel() {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState<number | null>(null);
    const [completedActions, setCompletedActions] = useState<number[]>([]);
    const active = shortfallWarnings.filter((w) => !dismissed.includes(w.id));

    if (active.length === 0) {
        return (
            <Card title="Likviditetsadvarsler">
                <Card.Content>
                    <div className="flex items-center gap-2 text-sm text-green-600 py-4">
                        <Icon name="circle-tick" />
                        Ingen likviditetsadvarsler de næste 30 dage
                    </div>
                </Card.Content>
            </Card>
        );
    }

    return (
        <>
        <div className="rounded-lg border border-purple-200 overflow-hidden">
            {/* Alert banner */}
            <div className="p-4">
            <Alert state="error" title="Likviditetsadvarsel">
                Din saldo forventes at falde under tærskelværdien d. {formatDate(active[0].predictedDate)} med et underskud på DKK {formatDKK(Math.abs(active[0].projectedDeficit))}.
            </Alert>
            </div>

            {/* AI header */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-3.5 border-b border-purple-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-base">&#10024;</span>
                        <span className="text-sm font-bold">AI-anbefalinger</span>
                        <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Automatisk</span>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white divide-y divide-grey-100">
                {aiRecommendations.map((rec, i) => {
                    const isCompleted = completedActions.includes(i);
                    return (
                        <div key={i} className={`px-5 py-3.5 ${isCompleted ? 'bg-green-50/50' : ''}`}>
                            <div className="flex items-start gap-3">
                                {/* Priority number or checkmark */}
                                {isCompleted ? (
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Icon name="circle-tick" className="w-4 h-4 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {i + 1}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-sm font-bold ${isCompleted ? 'line-through text-grey-400' : ''}`}>{rec.action}</span>
                                        {isCompleted && rec.type === 'loan' && (
                                            <Tooltip title="Din forespørgsel er under behandling i Danske Bank. Du hører fra banken, når der er lavet en afgørelse.">
                                                <span><Badge subtle className="!bg-yellow-100 !text-yellow-700">Under behandling</Badge></span>
                                            </Tooltip>
                                        )}
                                        {isCompleted && rec.type !== 'loan' && (
                                            <Badge subtle className="!bg-green-100 !text-green-700">Udført</Badge>
                                        )}
                                    </div>
                                    <div className={`flex items-center gap-3 text-xs ${isCompleted ? 'text-grey-400' : 'text-grey-500'}`}>
                                        <span className={isCompleted ? 'text-grey-400 font-bold' : rec.type === 'inflow' ? 'text-green-600 font-bold' : rec.type === 'defer' ? 'text-blue-600 font-bold' : rec.type === 'loan' ? 'text-purple-600 font-bold' : 'text-yellow-600 font-bold'}>
                                            {rec.type === 'inflow' ? '+' : rec.type === 'defer' ? '~' : rec.type === 'loan' ? '🏦' : '?'} DKK {formatDKK(rec.amount)}
                                        </span>
                                        <span className="text-grey-300">|</span>
                                        <span>{rec.impact}</span>
                                        {!isCompleted && (
                                            <>
                                                <span className="text-grey-300">|</span>
                                                <span className="flex items-center gap-1">
                                                    Sikkerhed: {rec.confidence}%
                                                    <span className="inline-block w-8 h-1 bg-grey-200 rounded-full">
                                                        <span
                                                            className={`block h-full rounded-full ${rec.confidence > 80 ? 'bg-green-500' : rec.confidence > 60 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                                            style={{ width: `${rec.confidence}%` }}
                                                        />
                                                    </span>
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Expandable reasoning */}
                                    {expandedIdx === i && !isCompleted && (
                                        <div className="mt-2 text-xs text-grey-600 bg-grey-50 rounded p-2.5 border border-grey-100">
                                            <span className="font-bold text-grey-700">&#129302; AI-begrundelse: </span>
                                            {rec.reasoning}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {!isCompleted && (
                                        <>
                                            <Button
                                                appearance="primary"
                                                onClick={() => {
                                                    if (rec.type === 'loan') {
                                                        setShowLoanModal(true);
                                                    } else if (rec.type === 'inflow' || rec.type === 'reminder') {
                                                        setShowEmailModal(i);
                                                    } else {
                                                        setCompletedActions((prev) => [...prev, i]);
                                                        showNotification(`${rec.action} — handling udført`, 'success');
                                                    }
                                                }}
                                            >
                                                {rec.buttonLabel}
                                            </Button>
                                            <IconButton
                                                icon={expandedIdx === i ? 'chevron-up' : 'chevron-down'}
                                                tooltip={expandedIdx === i ? 'Skjul begrundelse' : 'Vis begrundelse'}
                                                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="bg-grey-50 px-5 py-2.5 border-t border-grey-200 flex items-center justify-between">
                <span className="text-[10px] text-grey-400">Sidst opdateret: i dag kl. {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')} — Baseret på dine data i e-conomic</span>
                <Button appearance="ghost" onClick={() => showNotification('Opdaterer analyse...')}>
                    &#8635; Opdater
                </Button>
            </div>
        </div>
        {showLoanModal && <BankLoanModal onClose={() => setShowLoanModal(false)} onComplete={() => {
            const loanIdx = aiRecommendations.findIndex((r) => r.type === 'loan');
            if (loanIdx >= 0) setCompletedActions((prev) => [...prev, loanIdx]);
        }} />}
        {showEmailModal !== null && (
            <EmailModal
                rec={aiRecommendations[showEmailModal]}
                onClose={() => setShowEmailModal(null)}
                onSend={() => {
                    setCompletedActions((prev) => [...prev, showEmailModal]);
                    showNotification(`E-mail sendt til ${emailRecipients[aiRecommendations[showEmailModal].type]?.email}`, 'success');
                }}
            />
        )}
        </>
    );
}

// --- Early Payment Opportunities ---
function OpportunitiesPanel() {
    return (
        <Card title="Tidlig betaling — besparelser">
            <Card.Content>
                <div className="space-y-3">
                    {earlyPaymentOpportunities.map((opp) => (
                        <div key={opp.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="text-sm font-bold">{opp.supplier}</div>
                                    <div className="text-xs text-grey-600 mt-0.5">
                                        Fakturabeløb: DKK {formatDKK(opp.invoiceAmount)} — {opp.discountPercent}% rabat inden{' '}
                                        {formatDate(opp.deadline)}
                                    </div>
                                </div>
                                <Badge subtle>{opp.daysLeft} dage</Badge>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <div className="text-sm">
                                    Betal nu — spar{' '}
                                    <span className="font-bold text-green-700">DKK {formatDKK(opp.savings)}</span>
                                </div>
                                <Button
                                    appearance="primary"
                                    onClick={() =>
                                        showNotification(
                                            `Betaling til ${opp.supplier} godkendt — DKK ${formatDKK(opp.savings)} sparet`,
                                            'success'
                                        )
                                    }
                                >
                                    Godkend betaling
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card.Content>
        </Card>
    );
}

// --- Main App ---
export default function App() {
    const [period, setPeriod] = useState('30');
    const [activeView, setActiveView] = useState<'dashboard' | 'presentation'>('dashboard');

    return (
        <Layout>
            <ToastInitializer />
            <Layout.Top>
                {({ toggleSidebar }) => (
                    <Header>
                        <Header.MenuButton onClick={toggleSidebar} />
                        <Header.Logo href="/">e-conomic</Header.Logo>
                        <Header.PrimaryNavigation>
                            <Header.Link href="/">Hjem</Header.Link>
                            <Header.Link href="/salg">Salg</Header.Link>
                            <Header.Link href="/udgifter">Udgifter</Header.Link>
                            <Header.Link href="/regnskab">Regnskab</Header.Link>
                            <Header.Link href="/rapporter" aria-current="page">Rapporter</Header.Link>
                            <Header.Link href="/projekter">Projekter</Header.Link>
                        </Header.PrimaryNavigation>
                    </Header>
                )}
            </Layout.Top>
            <div className="flex flex-grow overflow-hidden">
                <Layout.Sidebar>
                    <Navigation2>
                        <Navigation2.Section>
                            <Navigation2.Group heading="Dashboards" defaultExpanded>
                                <Navigation2.Link href="/rapporter/overblik">Overblik</Navigation2.Link>
                                <Navigation2.Link
                                    href="#"
                                    active={activeView === 'dashboard'}
                                    onClick={(e: React.MouseEvent) => { e.preventDefault(); setActiveView('dashboard'); }}
                                >
                                    Likviditet
                                </Navigation2.Link>
                                <Navigation2.Link
                                    href="#"
                                    active={activeView === 'presentation'}
                                    onClick={(e: React.MouseEvent) => { e.preventDefault(); setActiveView('presentation'); }}
                                >
                                    Præsentation
                                </Navigation2.Link>
                            </Navigation2.Group>
                            <Navigation2.Group heading="Regnskab" defaultExpanded>
                                <Navigation2.Link href="/rapporter/saldobalance">Saldobalance</Navigation2.Link>
                                <Navigation2.Link href="/rapporter/periodeopdelt">Periodeopdelt saldobalance</Navigation2.Link>
                                <Navigation2.Link href="/rapporter/resultat">Resultatopgørelse</Navigation2.Link>
                                <Navigation2.Link href="/rapporter/balance">Balance</Navigation2.Link>
                                <Navigation2.Link href="/rapporter/nogletal">Nøgletal</Navigation2.Link>
                                <Navigation2.Link href="/rapporter/budget">Budget</Navigation2.Link>
                            </Navigation2.Group>
                            <Navigation2.Group heading="Kunder" defaultExpanded>
                                <Navigation2.Link href="/rapporter/kundekontokort">Kundekontokort</Navigation2.Link>
                                <Navigation2.Link href="/rapporter/debitorsaldoliste">Debitorsaldoliste</Navigation2.Link>
                                <Navigation2.Link href="/rapporter/omsaetning">Omsætningsstatistik</Navigation2.Link>
                            </Navigation2.Group>
                        </Navigation2.Section>
                    </Navigation2>
                </Layout.Sidebar>
                <Layout.Content>
                    <Layout.Page>
                        {activeView === 'dashboard' && (
                        <div className="flex flex-col w-full overflow-y-auto p-6">
                        {/* Page Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-black m-0">Likviditet</h1>
                                <p className="text-sm text-grey-600 mt-1 mb-4">
                                    Intelligent likviditetsprognose baseret på dine data i e-conomic
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-grey-600">Periode:</span>
                                <Select2
                                    defaultValue="30"
                                    onChange={(e: any) => {
                                        const val = e?.target?.value ?? e;
                                        setPeriod(String(val));
                                    }}
                                >
                                    <Select2.Option value="30">30 dage</Select2.Option>
                                    <Select2.Option value="60">60 dage</Select2.Option>
                                    <Select2.Option value="90">90 dage</Select2.Option>
                                </Select2>
                                <IconButton icon="print" tooltip="Udskriv" onClick={() => showNotification('Udskriver...')} />
                                <IconButton icon="download" tooltip="Eksporter PDF" onClick={() => showNotification('Eksporterer rapport...')} />
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <KpiCards period={period} />

                        {/* Shortfall Warning */}
                        <div className="mb-6">
                            <ShortfallWarningsPanel />
                        </div>

                        {/* Forecast Chart */}
                        <div className="mb-6">
                            <ForecastChart />
                        </div>

                        {/* Bottom panels grid */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <OverdueInvoicesPanel />
                            <div className="space-y-6">
                                <UpcomingEventsPanel />
                                <OpportunitiesPanel />
                            </div>
                        </div>
                        </div>
                        )}

                        {activeView === 'presentation' && (
                        <div className="flex flex-col w-full h-full">
                            <iframe
                                src={`${import.meta.env.BASE_URL}presentation.html`}
                                className="w-full h-full border-0"
                                title="Cash Flow Intelligence — Presentation"
                            />
                        </div>
                        )}
                    </Layout.Page>
                </Layout.Content>
            </div>
        </Layout>
    );
}
