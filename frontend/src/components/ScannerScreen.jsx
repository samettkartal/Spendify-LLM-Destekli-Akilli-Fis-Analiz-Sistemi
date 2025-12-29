import React, { useState, useCallback, useMemo } from 'react';
import {
    UploadCloud,
    CheckCircle,
    Search,
    Filter,
    Trash2,
    Download,
    Edit,
    ScanLine,
    X,
    Check,
    Eye,
    Image as ImageIcon,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

const API_URL = "http://localhost:8000";

const ImageModal = ({ isOpen, onClose, imageUrl, alt }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="relative bg-white rounded-xl overflow-hidden max-w-4xl max-h-[90vh] w-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700">Receipt Image</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900">
                    {imageUrl ? (
                        <img src={imageUrl} alt={alt} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <ImageIcon size={48} />
                            <p>Image not found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ScannerScreen({ transactions, isLoading, onRefresh }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle');
    const [dragActive, setDragActive] = useState(false);

    // --- AKTİF FİŞ EDİTÖRÜ STATE'LERİ ---
    // --- AKTİF FİŞ EDİTÖRÜ STATE'LERİ ---
    const [activeReceiptId, setActiveReceiptId] = useState(null);
    const [merchant, setMerchant] = useState('');
    const [date, setDate] = useState('');
    const [total, setTotal] = useState('');
    const [tax, setTax] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [currency, setCurrency] = useState('₺');
    const [category, setCategory] = useState('Unknown');

    // Temp states for new uploads before saving
    const [tempFilename, setTempFilename] = useState(null);
    const [tempImageUrl, setTempImageUrl] = useState(null);

    // --- GÖRSEL MODALI ---
    const [modalOpen, setModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState(null);

    // --- TABLE SORTING & FILTERING ---
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // --- CONSTANTS & HELPERS ---


    const columnsConfig = [
        { key: "date", label: "Date", type: "text", sortable: true },
        { key: "merch", label: "Merchant", type: "text", sortable: true },
        { key: "cat", label: "Category", type: "select", options: ["Unknown", "Food", "Transport", "Software", "Hardware", "Grocery", "Other"], sortable: true },
        { key: "taxRate", label: "Tax Rate", type: "text" },
        { key: "tax", label: "Tax Amount", type: "number", sortable: true },
        { key: "tot", label: "Total", type: "number", sortable: true },
        { key: "currency", label: "Curr", type: "text", width: "50px" },
    ];

    const [selectedRows, setSelectedRows] = useState({});
    const [selectedColumns, setSelectedColumns] = useState(
        columnsConfig.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );

    const [searchTerm, setSearchTerm] = useState('');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterCategory, setFilterCategory] = useState('All');

    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // --- HANDLERS ---
    const handleDrag = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    }, []);

    const handleChange = (e) => {
        e.preventDefault(); if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    };

    const handleFile = async (selectedFile) => {
        setFile(selectedFile);
        setStatus('uploading');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();

            if (data.structured_data) {
                setMerchant(data.structured_data.merchant || '');
                setDate(data.structured_data.date || '');
                setTotal(data.structured_data.total_amount || '');
                setTax(data.structured_data.tax || '0.00');
                setTaxRate(data.structured_data.tax_rate || '');
                setCurrency(data.structured_data.currency || '₺');
                setCategory('Unknown');

                // Set temp file info
                setTempFilename(data.filename);
                setTempImageUrl(data.image_url);
                setActiveReceiptId(null); // It is a new receipt, not in DB yet
            }
            setStatus('analyzed');
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    const handleEditorChange = (field, value) => {
        if (field === 'total') {
            setTotal(value);
        } else {
            if (field === 'merchant') setMerchant(value);
            if (field === 'date') setDate(value);
            if (field === 'tax') setTax(value);
            if (field === 'taxRate') setTaxRate(value);
            if (field === 'currency') setCurrency(value);
            if (field === 'category') setCategory(value);
        }
    };

    const saveActiveReceipt = async () => {
        try {
            if (activeReceiptId) {
                // UPDATE existing
                const payload = {
                    merchant, date, total, tax, category, tax_rate: taxRate, currency
                };
                const res = await fetch(`${API_URL}/receipts/${activeReceiptId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error("Update failed");
            } else {
                // CREATE new
                if (!tempFilename) throw new Error("Missing file info");

                const payload = {
                    merchant, date, total, tax, category, tax_rate: taxRate, currency,
                    filename: tempFilename,
                    image_url: tempImageUrl
                };
                const res = await fetch(`${API_URL}/receipts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error("Save failed");
            }

            alert("Receipt saved successfully!");
            setStatus('idle');
            setFile(null);
            setTempFilename(null);
            setTempImageUrl(null);
            setActiveReceiptId(null);
            onRefresh();

        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    const handleEditClick = (row) => {
        setEditingId(row.id);
        setEditFormData({ ...row });
    };

    const handleTableEditChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTableSaveClick = async () => {
        if (!editingId) return;
        try {
            const payload = {
                merchant: editFormData.merch,
                date: editFormData.date,
                total: editFormData.tot,
                tax: editFormData.tax,
                category: editFormData.cat,
                tax_rate: editFormData.taxRate,
                currency: editFormData.currency
            };

            const res = await fetch(`${API_URL}/receipts/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Update failed");

            onRefresh();
            setEditingId(null);
            setEditFormData({});

        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        }
    };

    const handleTableDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this receipt?")) return;
        try {
            const res = await fetch(`${API_URL}/receipts/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Delete failed");
        }
    };

    const handleViewImage = (url) => {
        setModalImage(url);
        setModalOpen(true);
    };

    const handleExportExcel = () => {
        const activeColKeys = columnsConfig.filter(col => selectedColumns[col.key]);
        if (activeColKeys.length === 0) { alert("Select columns"); return; }

        const exportData = filteredTransactions.filter(row => selectedRows[row.id]);
        if (exportData.length === 0) { alert("Select rows"); return; }

        let csv = activeColKeys.map(c => c.label).join(",") + "\n";
        exportData.forEach(r => { csv += activeColKeys.map(c => r[c.key]).join(",") + "\n"; });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = "export.csv"; link.click();
    };

    const handleClearEditor = () => {
        setFile(null); setStatus('idle'); setMerchant(''); setDate(''); setTotal(''); setTax(''); setTaxRate(''); setCurrency('₺'); setCategory('Unknown'); setActiveReceiptId(null);
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredTransactions = useMemo(() => {
        let data = transactions.filter(item => {
            const s = searchTerm.toLowerCase();
            const match =
                (item.merch?.toLowerCase().includes(s)) ||
                (item.cat?.toLowerCase().includes(s)) ||
                (item.tot?.toString().includes(s));

            if (!match) return false;
            if (filterCategory !== 'All' && item.cat !== filterCategory) return false;
            return true;
        });

        if (sortConfig.key) {
            data.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Parse if date
                if (sortConfig.key === 'date') {
                    const parseDate = (dStr) => {
                        if (!dStr) return 0;
                        const parts = dStr.replace(/\//g, '.').split('.');
                        if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
                        return new Date(dStr).getTime();
                    };
                    aValue = parseDate(aValue);
                    bValue = parseDate(bValue);
                }
                // Parse if number
                else if (['tot', 'net', 'tax'].includes(sortConfig.key)) {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                }
                // Default string compare
                else {
                    aValue = (aValue || '').toString().toLowerCase();
                    bValue = (bValue || '').toString().toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [transactions, searchTerm, filterCategory, sortConfig]);

    const categories = ['All', ...new Set(transactions.map(d => d.cat))].filter(Boolean);

    const toggleRow = (id) => setSelectedRows(p => ({ ...p, [id]: !p[id] }));
    const toggleAll = (chk) => { const n = {}; if (chk) filteredTransactions.forEach(t => n[t.id] = true); setSelectedRows(n); };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-10">
            <ImageModal isOpen={modalOpen} onClose={() => setModalOpen(false)} imageUrl={modalImage} />

            {/* HEADER & UPLOAD */}
            <section className="flex flex-col gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-medium text-xs uppercase tracking-widest"><ScanLine size={16} /> local and secure</div>
                    <h2 className="text-3xl font-bold tracking-tight">Spendify</h2>
                </div>

                <div
                    className={`group relative w-full h-48 rounded-xl border-2 border-dashed transition-all duration-300 bg-surface-card flex flex-col items-center justify-center gap-4 cursor-pointer shadow-soft hover:shadow-md ${dragActive ? 'border-primary bg-primary-light/30' : 'border-slate-200 hover:border-primary'}`}
                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                >
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" accept="image/*" onChange={handleChange} />
                    <div className="size-14 rounded-full bg-primary-light text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300"><UploadCloud size={28} /></div>
                    {status === 'uploading' ? <p className="text-primary font-bold animate-pulse">Processing...</p> :
                        file ? <p className="font-semibold flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> {file.name}</p> :
                            <p className="text-slate-500">Drag or Select Receipt</p>}
                </div>
            </section>

            {/* --- UNIFIED EDITOR --- */}
            <section className={`transition-all duration-500 ${status === 'analyzed' ? 'opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-4'}`}>
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden border-t-4 border-t-primary">
                    <div className="bg-slate-50 px-6 py-3 border-b flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Edit size={16} /> Edit & Confirm</h3>
                        <button onClick={handleClearEditor} className="text-xs text-slate-400 hover:text-red-500">Cancel</button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500">MERCHANT</label><input className="w-full bg-gray-50 border border-slate-200 rounded p-2 font-bold" value={merchant} onChange={e => handleEditorChange('merchant', e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500">DATE</label><input className="w-full bg-gray-50 border border-slate-200 rounded p-2 font-bold" value={date} onChange={e => handleEditorChange('date', e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500">CATEGORY</label><select className="w-full bg-gray-50 border border-slate-200 rounded p-2 font-bold" value={category} onChange={e => handleEditorChange('category', e.target.value)}>{categories.concat(["Unknown"]).map(c => <option key={c} value={c}>{c}</option>)}</select></div>

                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500">TAX RATE</label><input className="w-full bg-gray-50 border border-slate-200 rounded p-2 font-bold" value={taxRate} onChange={e => handleEditorChange('taxRate', e.target.value)} placeholder="e.g. %18" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-red-500">TAX AMOUNT</label><input className="w-full bg-red-50 border border-red-200 text-red-700 rounded p-2 font-bold font-mono" value={tax} onChange={e => handleEditorChange('tax', e.target.value)} /></div>

                        <div className="col-span-1 md:col-span-2 flex gap-4">
                            <div className="space-y-1 w-24"><label className="text-xs font-bold text-slate-500">CURRENCY</label><input className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 rounded p-2 font-bold text-center" value={currency} onChange={e => handleEditorChange('currency', e.target.value)} /></div>
                            <div className="space-y-1 flex-1"><label className="text-xs font-bold text-emerald-600">GRAND TOTAL</label><input className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 rounded p-2 font-bold font-mono text-xl text-right" value={total} onChange={e => handleEditorChange('total', e.target.value)} /></div>
                        </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-4 border-t flex justify-end gap-3">
                        <button onClick={handleClearEditor} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancel</button>
                        <button onClick={saveActiveReceipt} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg shadow-sm font-bold text-sm flex items-center gap-2"><CheckCircle size={16} /> Save & Finish</button>
                    </div>
                </div>
            </section>

            {/* --- TABLE --- */}
            <section className="flex flex-col gap-4 flex-1">
                {/* Actions Bar */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm focus:border-primary outline-none" placeholder="Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="h-10 px-3 border rounded-lg bg-white text-slate-600 flex items-center gap-2"><Filter size={16} /> Filter</button>
                        <button onClick={handleExportExcel} className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 shadow-sm font-medium"><Download size={16} /> Excel</button>
                    </div>
                </div>

                {showFilterMenu && (
                    <div className="p-4 bg-surface-card border rounded-xl flex gap-4 shadow-sm animate-in slide-in-from-top-2">
                        <div><span className="text-xs font-bold text-slate-400 block mb-1">Category</span><select className="border rounded p-1 text-sm w-32" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="All">All</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <button onClick={() => { setFilterCategory('All'); setSearchTerm(''); }} className="text-xs text-red-500 underline self-end mb-1">Clear</button>
                    </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                    {isLoading ? <div className="p-10 text-center text-slate-400">Loading data...</div> :
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b text-xs uppercase font-bold text-slate-500">
                                    <tr>
                                        <th className="p-4 w-10 text-center"><input type="checkbox" onChange={e => toggleAll(e.target.checked)} /></th>
                                        <th className="p-4 w-12 text-center">Image</th>
                                        {columnsConfig.map(col => selectedColumns[col.key] && (
                                            <th
                                                key={col.key}
                                                className={`p-4 whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}
                                                onClick={() => col.sortable && requestSort(col.key)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {col.label}
                                                    {sortConfig.key === col.key && (
                                                        sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTransactions.map(row => {
                                        const isEdit = editingId === row.id;
                                        return (
                                            <tr key={row.id} className={`hover:bg-slate-50/50 ${selectedRows[row.id] ? 'bg-blue-50/30' : ''}`}>
                                                <td className="p-4 text-center"><input type="checkbox" checked={selectedRows[row.id] || false} onChange={() => toggleRow(row.id)} /></td>
                                                <td className="p-4 text-center">
                                                    {row.imageUrl ?
                                                        <button onClick={() => handleViewImage(row.imageUrl)} className="text-slate-400 hover:text-primary transition-colors"><Eye size={18} /></button> :
                                                        <span className="text-slate-300">-</span>
                                                    }
                                                </td>

                                                {columnsConfig.map(col => selectedColumns[col.key] && (
                                                    <td key={col.key} className="p-4">
                                                        {isEdit ? (
                                                            col.type === 'select' ? <select value={editFormData.cat} onChange={e => handleTableEditChange('cat', e.target.value)} className="border rounded p-1 bg-white w-full">{columnsConfig.find(c => c.key === 'cat').options.map(o => <option key={o} value={o}>{o}</option>)}</select> :
                                                                <input value={editFormData[col.key]} onChange={e => handleTableEditChange(col.key, e.target.value)} className="border rounded p-1 w-full" />
                                                        ) : (
                                                            ['tot', 'tax'].includes(col.key) ? <span className="font-mono font-medium">{row.currency || '₺'}{row[col.key]}</span> :
                                                                row[col.key]
                                                        )}
                                                    </td>
                                                ))}

                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    {isEdit ? (
                                                        <>
                                                            <button onClick={handleTableSaveClick} className="p-1.5 bg-emerald-100 text-emerald-600 rounded"><Check size={16} /></button>
                                                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-red-100 text-red-600 rounded"><X size={16} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleEditClick(row)} className="text-slate-400 hover:text-blue-600 p-1.5"><Edit size={16} /></button>
                                                            <button onClick={() => handleTableDelete(row.id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 size={16} /></button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredTransactions.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-slate-400">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    }
                </div>
            </section>
        </div>
    );
}
