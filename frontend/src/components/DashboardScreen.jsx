import React, { useMemo, useState } from 'react';
import {
    TrendingUp,
    Receipt,
    PiggyBank,
    ShoppingCart,
    Utensils,
    Car,
    Zap,
    Store,
    Smartphone,
    MoreHorizontal,
    CalendarDays,
    Upload,
    ScanLine,

    ChevronDown,
    PieChart,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Wallet
} from 'lucide-react';

export default function DashboardScreen({ transactions, onNavigateToScan }) {
    const [dateRange, setDateRange] = useState('30d'); // 30d, 3m, 6m, 1y
    const [currency, setCurrency] = useState('₺');
    const [budgetLimits, setBudgetLimits] = useState({
        '30d': 10000,
        '3m': 30000,
        '6m': 60000,
        '1y': 120000
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

    // Chart Interaction State
    // Chart Interaction State
    const [hoveredPoint, setHoveredPoint] = useState(null); // { x, y, value, dateLabel }
    const [hoveredCategory, setHoveredCategory] = useState(null); // { name, percent, value }

    // --- STATS CALCULATION ---
    const stats = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999); // End of today

        // 1. Determine Start Date
        const startDate = new Date();
        if (dateRange === '30d') startDate.setDate(now.getDate() - 30);
        else if (dateRange === '3m') startDate.setMonth(now.getMonth() - 3);
        else if (dateRange === '6m') startDate.setMonth(now.getMonth() - 6);
        else if (dateRange === '1y') startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);

        // 3. Filter Transactions (Date & Currency)
        const filterFn = (t, start, end) => {
            let d = new Date(t.date);
            if (isNaN(d.getTime())) {
                const parts = t.date.replace(/\//g, '.').split('.');
                if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
            // Check Currency (Default to ₺ if missing)
            const tCurr = t.currency || '₺';
            // Normalize symbols using simple logic if needed, but assuming strict match for now
            // Allow matching symbols: '₺' matches 'TL', '$' matches 'USD' etc if needed.
            // For now assume cleaner is doing its job.

            return !isNaN(d.getTime()) && d >= start && d <= end && tCurr === currency;
        };

        const currentPeriodTransactions = transactions.filter(t => filterFn(t, startDate, now));

        // Previous Period for Comparison
        const prevStartDate = new Date(startDate);
        const prevEndDate = new Date(startDate); // Comparison ends where current starts

        let diffTime = now.getTime() - startDate.getTime();
        prevStartDate.setTime(prevStartDate.getTime() - diffTime);

        const prevPeriodTransactions = transactions.filter(t => filterFn(t, prevStartDate, prevEndDate));

        // 4. Calculate Aggregates
        let totalSpent = 0;
        let prevTotalSpent = 0;
        let totalCount = 0;
        const categoryTotals = {};

        currentPeriodTransactions.forEach(t => {
            const amount = parseFloat(t.tot);
            if (!isNaN(amount)) {
                totalSpent += amount;
                totalCount++;
                const cat = t.cat || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
            }
        });

        prevPeriodTransactions.forEach(t => {
            const amount = parseFloat(t.tot);
            if (!isNaN(amount)) prevTotalSpent += amount;
        });

        const percentChange = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;
        const currentLimit = budgetLimits[dateRange] || 10000;
        const budgetProgress = Math.min((totalSpent / currentLimit) * 100, 100);

        const avgTransaction = totalCount > 0 ? totalSpent / totalCount : 0;

        // Top Categories (All sort desc)
        // Top Categories (All sort desc)
        let runningPercent = 0;
        const topCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => {
                const percent = totalSpent > 0 ? (value / totalSpent) * 100 : 0;
                const startPercent = runningPercent;
                runningPercent += percent;
                return { name, value, percent, startPercent, endPercent: runningPercent };
            });

        // Largest Transactions
        const largestTransactions = [...currentPeriodTransactions]
            .sort((a, b) => parseFloat(b.tot) - parseFloat(a.tot))
            .slice(0, 5);


        // 4. Chart Data Preparation
        let chartData = [];
        let labels = [];

        if (dateRange === '30d') {
            // Daily Grouping
            const daysMap = new Map();
            // Init last 30 days with 0
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(now.getDate() - (29 - i));
                const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
                daysMap.set(key, {
                    val: 0,
                    label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                    fullDate: d.toLocaleDateString('en-US')
                });
            }

            currentPeriodTransactions.forEach(t => {
                let d = new Date(t.date);
                if (isNaN(d.getTime())) {
                    const parts = t.date.replace(/\//g, '.').split('.');
                    if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
                const key = d.toISOString().split('T')[0];
                if (daysMap.has(key)) {
                    daysMap.get(key).val += parseFloat(t.tot) || 0;
                }
            });
            chartData = Array.from(daysMap.values());

        } else {
            // Monthly Grouping
            const monthMap = new Map();
            let monthCount = dateRange === '3m' ? 3 : (dateRange === '6m' ? 6 : 12);

            for (let i = 0; i < monthCount; i++) {
                const d = new Date();
                d.setMonth(now.getMonth() - (monthCount - 1 - i));
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                monthMap.set(key, {
                    val: 0,
                    label: d.toLocaleDateString('en-US', { month: 'short' }),
                    fullDate: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                });
            }

            currentPeriodTransactions.forEach(t => {
                let d = new Date(t.date);
                // Parsing fix
                if (isNaN(d.getTime())) {
                    const parts = t.date.replace(/\//g, '.').split('.');
                    if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }

                if (!isNaN(d.getTime())) {
                    const key = `${d.getFullYear()}-${d.getMonth()}`;
                    if (monthMap.has(key)) {
                        monthMap.get(key).val += parseFloat(t.tot) || 0;
                    }
                }
            });
            chartData = Array.from(monthMap.values());
        }

        // 5. Generate SVG Paths
        if (chartData.length === 0) return { totalSpent, prevTotalSpent, percentChange, budgetProgress, avgTransaction, projectedSavings: 0, topCategories: [], largestTransactions: [], trendPoints: "", areaPath: "", totalCount: 0, chartData: [] };

        const maxVal = Math.max(...chartData.map(d => d.val), 1);
        const points = chartData.map((d, idx) => {
            // Safe division
            const x = chartData.length > 1 ? (idx / (chartData.length - 1)) * 100 : 50;
            const y = 100 - ((d.val / maxVal) * 80); // Leave 20% breathing room at top, base is 100
            return { x, y, value: d.val, label: d.label, fullDate: d.fullDate };
        });

        const trendPointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
        const areaPathStr = `M0,100 ` + points.map(p => `L${p.x},${p.y}`).join(' ') + ` L100,100 Z`;

        return {
            totalSpent,
            prevTotalSpent,
            percentChange,
            budgetProgress,
            avgTransaction,
            projectedSavings: totalSpent * 0.1, // Mock logic
            topCategories,
            largestTransactions,
            trendPoints: trendPointsStr,
            areaPath: areaPathStr,
            totalCount,
            chartPoints: points,
            currentLimit: budgetLimits[dateRange] || 10000
        };
    }, [transactions, dateRange, currency, budgetLimits]);

    // HELPERS
    const getCategoryIcon = (cat) => {
        const c = cat.toLowerCase();
        if (c.includes('food') || c.includes('restaurant') || c.includes('dining')) return <Utensils size={18} />;
        if (c.includes('grocery') || c.includes('market')) return <ShoppingCart size={18} />;
        if (c.includes('transport') || c.includes('fuel') || c.includes('gas')) return <Car size={18} />;
        if (c.includes('electric') || c.includes('bill') || c.includes('utility')) return <Zap size={18} />;
        if (c.includes('tech') || c.includes('software') || c.includes('electronics')) return <Smartphone size={18} />;
        return <Store size={18} />;
    };

    const getCategoryHexColor = (cat) => {
        const c = cat.toLowerCase();
        if (c.includes('food') || c.includes('restaurant')) return '#f97316'; // Orange
        if (c.includes('grocery') || c.includes('market')) return '#16a34a'; // Green
        if (c.includes('transport') || c.includes('fuel')) return '#2563eb'; // Blue
        if (c.includes('tech') || c.includes('software') || c.includes('electronics')) return '#9333ea'; // Purple
        if (c.includes('bills') || c.includes('utility')) return '#eab308'; // Yellow
        if (c.includes('fashion') || c.includes('clothing')) return '#ec4899'; // Pink

        // Generate consistent color for other categories based on string hash
        let hash = 0;
        for (let i = 0; i < c.length; i++) {
            hash = c.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 70%, 50%)`;
    };

    const getCategoryColor = (cat) => {
        const hex = getCategoryHexColor(cat);
        // Map hex back to Tailwind classes for backward compatibility if needed, or remove this if fully switching
        // For now, let's keep the existing class logic but aligned with hex roughly for bg classes
        // Actually, better to just use the hex for the dot.
        return 'bg-slate-50'; // Neutral background for icon
    };

    const rangeLabels = {
        '30d': 'Last 30 Days',
        '3m': 'Last 3 Months',
        '6m': 'Last 6 Months',
        '1y': 'Last 1 Year'
    };

    const handlePieMouseMove = (e) => {
        if (!stats.topCategories.length) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate mouse position relative to center
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        // Calculate angle in degrees (0 is top, clockwise)
        // atan2 returns angle from x-axis (right), so we need to adjust
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        // Correct to start from top (12 o'clock)
        angle = angle + 90;
        if (angle < 0) angle += 360;

        // Convert key angle to percentage (0 - 100)
        const percent = (angle / 360) * 100;

        // Find category
        const found = stats.topCategories.find(c => percent >= c.startPercent && percent < c.endPercent);
        if (found) {
            setHoveredCategory(found);
        } else {
            setHoveredCategory(null);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Spending Summary</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base">Track your expenses and find savings opportunities.</p>
                    <div className="flex items-center gap-2 pt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        <ScanLine size={16} />
                        <span>Data stored locally on your device</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                {/* Currency Selector */}
                <div className="relative">
                    <button
                        onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-sm transition-colors shadow-sm min-w-[80px] justify-between"
                    >
                        <span>{currency}</span>
                        <ChevronDown size={14} />
                    </button>
                    {isCurrencyDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200">
                            {['₺', '$', '€', '£'].map(c => (
                                <button key={c} onClick={() => { setCurrency(c); setIsCurrencyDropdownOpen(false); }} className={`text-left px-3 py-2 rounded-md text-sm font-bold transition-colors ${currency === c ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                    {isCurrencyDropdownOpen && <div className="fixed inset-0 z-20" onClick={() => setIsCurrencyDropdownOpen(false)}></div>}
                </div>
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors shadow-sm min-w-[150px] justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <CalendarDays size={20} />
                            <span>{rangeLabels[dateRange]}</span>
                        </div>
                        <ChevronDown size={16} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200">
                            {Object.entries(rangeLabels).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => { setDateRange(key); setIsDropdownOpen(false); }}
                                    className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${dateRange === key ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                    {isDropdownOpen && <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>}
                </div>

                <button onClick={onNavigateToScan} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:bg-primary-dark transition-colors">
                    <Upload size={20} />
                    <span>Scan Receipt</span>
                </button>
            </div>


            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Spending ({rangeLabels[dateRange]})</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{currency}{stats.totalSpent.toFixed(2)}</h3>
                        <div className="flex items-center gap-1 mt-2 text-xs font-semibold">
                            {stats.percentChange > 0 ? (
                                <span className="text-red-500 flex items-center bg-red-50 px-1.5 py-0.5 rounded">
                                    <ArrowUpRight size={14} className="mr-0.5" />
                                    {Math.abs(stats.percentChange).toFixed(0)}%
                                </span>
                            ) : (
                                <span className="text-emerald-500 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded">
                                    <ArrowDownRight size={14} className="mr-0.5" />
                                    {Math.abs(stats.percentChange).toFixed(0)}%
                                </span>
                            )}
                            <span className="text-slate-400 font-medium">vs previous period</span>
                        </div>
                    </div>
                </div>
                {/* Card 2 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-purple-50 dark:bg-blue-900/20 rounded-lg text-purple-600">
                            <Receipt size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Avg. Transaction</p>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{currency}{stats.avgTransaction.toFixed(2)}</h3>
                        <p className="text-xs text-slate-400 mt-2">Based on {stats.totalCount} receipts</p>
                    </div>
                </div>
                {/* Card 3 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-blue-900/20 rounded-lg text-emerald-600">
                            <Target size={24} />
                        </div>
                        <button onClick={() => {
                            const currentLimit = budgetLimits[dateRange] || 10000;
                            const newLimit = prompt(`Enter new budget for ${rangeLabels[dateRange]}:`, currentLimit);
                            if (newLimit && !isNaN(newLimit)) {
                                setBudgetLimits(prev => ({ ...prev, [dateRange]: parseFloat(newLimit) }));
                            }
                        }} className="text-xs font-bold text-emerald-600 hover:underline">Edit Goal</button>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Monthly Budget</p>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{Math.round(stats.budgetProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 mb-2">
                            <div className={`h-3 rounded-full transition-all duration-500 ${stats.budgetProgress > 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${stats.budgetProgress}%` }}></div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{currency}{stats.totalSpent.toFixed(0)} <span className='text-slate-400 text-sm font-normal'>/ {currency}{stats.currentLimit}</span></h3>
                    </div>
                </div>
            </div>

            {/* Main Interactive Chart Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 relative">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {dateRange === '30d' ? 'Daily Spending Trend' : 'Monthly Spending Trend'}
                        </h3>
                        <p className="text-slate-500 text-sm">Spending movements in selected period</p>
                    </div>
                </div>

                {/* Chart Container - with Mouse Interaction */}
                <div
                    className="w-full h-64 relative cursor-crosshair group"
                    onMouseLeave={() => setHoveredPoint(null)}
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const width = rect.width;
                        const xPercent = (x / width) * 100;

                        // Find closest point
                        if (stats.chartPoints && stats.chartPoints.length > 0) {
                            const closest = stats.chartPoints.reduce((prev, curr) => {
                                return (Math.abs(curr.x - xPercent) < Math.abs(prev.x - xPercent) ? curr : prev);
                            });
                            setHoveredPoint(closest);
                        }
                    }}
                >
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-400 pointer-events-none">
                        <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full h-0"></div>
                        <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full h-0"></div>
                        <div className="border-b border-dashed border-slate-200 dark:border-slate-700 w-full h-0"></div>
                        <div className="border-b border-slate-200 dark:border-slate-700 w-full h-0"></div>
                    </div>

                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#0a68f5" stopOpacity="0.2"></stop>
                                <stop offset="100%" stopColor="#0a68f5" stopOpacity="0"></stop>
                            </linearGradient>
                        </defs>
                        <path d={stats.areaPath} fill="url(#chartGradient)" stroke="none"></path>
                        <polyline fill="none" points={stats.trendPoints} stroke="#0a68f5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" vectorEffect="non-scaling-stroke"></polyline>
                    </svg>

                    {/* Interactive Elements (HTML Overlay to prevent distortion) */}
                    {hoveredPoint && (
                        <>
                            {/* Vertical Line */}
                            <div
                                className="absolute top-0 bottom-0 border-l-2 border-slate-200 dark:border-slate-600 border-dashed pointer-events-none transition-all duration-75"
                                style={{ left: `${hoveredPoint.x}%` }}
                            ></div>

                            {/* Dot */}
                            <div
                                className="absolute w-4 h-4 bg-white border-4 border-primary rounded-full shadow-md z-10 pointer-events-none transition-all duration-75 transform -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${hoveredPoint.x}%`, top: `${hoveredPoint.y}%` }}
                            ></div>

                            {/* Tooltip */}
                            <div
                                className="absolute z-20 bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl pointer-events-none transition-all duration-75 transform -translate-x-1/2 -translate-y-full mt-[-12px] whitespace-nowrap flex flex-col items-center"
                                style={{ left: `${hoveredPoint.x}%`, top: `${hoveredPoint.y}%` }}
                            >
                                <span className="font-bold text-sm">{currency}{hoveredPoint.value.toFixed(2)}</span>
                                <span className="text-slate-300 text-[10px] uppercase tracking-wide">{hoveredPoint.fullDate}</span>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                            </div>
                        </>
                    )}

                    {/* X Axis Labels (Dynamic) */}
                    <div className="absolute bottom-[-24px] left-0 right-0 flex justify-between text-[10px] text-slate-400 font-medium px-1">
                        {stats.chartPoints?.filter((_, i) => i % Math.ceil(stats.chartPoints.length / 6) === 0).map((p, i) => (
                            <span key={i}>{p.label}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Breakdown & Transactions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Category Breakdown */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col max-h-[500px]">
                    <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-xl z-10">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Category Breakdown</h3>
                        <div className="p-1.5 bg-slate-50 rounded text-slate-500"><PieChart size={16} /></div>
                    </div>
                    <div className="p-6 flex flex-col md:flex-row gap-8 items-center h-full">
                        {/* CSS Conic Gradient Pie Chart */}
                        <div
                            className="relative size-48 rounded-full border-4 border-slate-50 shadow-inner flex-shrink-0 cursor-pointer"
                            onMouseMove={handlePieMouseMove}
                            onMouseLeave={() => setHoveredCategory(null)}
                            style={{
                                background: stats.topCategories.length > 0
                                    ? `conic-gradient(${stats.topCategories.map(c => {
                                        // Map categories to colors manually or use helper
                                        const color = getCategoryHexColor(c.name);
                                        return `${color} ${c.startPercent}% ${c.endPercent}%`;
                                    }).join(', ')})`
                                    : '#f1f5f9'
                            }}>
                            <div className="absolute inset-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center flex-col transition-all duration-200 pointer-events-none">
                                {hoveredCategory ? (
                                    <>
                                        <span className="text-xs font-bold text-slate-400 uppercase max-w-[80%] text-center truncate">{hoveredCategory.name}</span>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white" style={{ color: getCategoryHexColor(hoveredCategory.name) }}>
                                            {hoveredCategory.percent.toFixed(1)}%
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">{currency}{hoveredCategory.value.toFixed(0)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs font-bold text-slate-400">TOTAL</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">{currency}{stats.totalSpent.toFixed(0)}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 w-full space-y-4 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
                            {stats.topCategories.length > 0 ? stats.topCategories.map(cat => (
                                <div key={cat.name} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryHexColor(cat.name) }}></div>
                                            </div>
                                            <div className={`p-1.5 rounded-lg bg-slate-50 text-slate-500`}>
                                                {getCategoryIcon(cat.name)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{currency}{cat.value.toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                        <div className="h-2 rounded-full" style={{ width: `${cat.percent}%`, backgroundColor: getCategoryHexColor(cat.name) }}></div>
                                    </div>
                                </div>
                            )) : <p className="text-slate-400 text-sm">No data for selected period.</p>}
                        </div>
                    </div>
                </div>


                {/* Recent Large Transactions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full max-h-[500px]">
                    <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Largest Transactions</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                                <tr className="text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                    <th className="font-semibold px-6 py-3">Merchant</th>
                                    <th className="font-semibold px-6 py-3">Date</th>
                                    <th className="font-semibold px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {stats.largestTransactions.map((tx, idx) => (
                                    <tr key={tx.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                                            <div className="size-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                <Store size={18} />
                                            </div>
                                            {tx.merch || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{tx.date}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">{currency}{parseFloat(tx.tot).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {stats.largestTransactions.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No records found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
                        <button onClick={onNavigateToScan} className="w-full text-center text-sm font-medium text-slate-500 hover:text-primary transition-colors">View All Transactions</button>
                    </div>
                </div>
            </div>
        </div >
    );
}
