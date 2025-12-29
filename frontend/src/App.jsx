import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ScanLine, Bell } from 'lucide-react';
import DashboardScreen from './components/DashboardScreen';
import ScannerScreen from './components/ScannerScreen';

const API_URL = "http://localhost:8000";

function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- DATA FETCHING ---
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/receipts`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();

      const formatted = data.map(item => ({
        id: item.id,
        merch: item.merchant,
        date: item.date,
        tot: item.total,
        tax: item.tax,
        cat: item.category || 'Unknown',
        taxRate: item.tax_rate || '%20',
        status: item.status || 'Pending',
        imageUrl: item.image_url ? `${API_URL}${item.image_url}` : null,
        currency: item.currency || '₺',
        net: (parseFloat(item.total) - parseFloat(item.tax)).toFixed(2)
      }));
      setTransactions(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 text-primary">
              <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Spendify</h2>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'scanner' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <ScanLine size={16} />
              Scan Receipt
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {/* Notification and Profile removed */}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' ? (
          <DashboardScreen
            transactions={transactions}
            onNavigateToScan={() => setActiveTab('scanner')}
          />
        ) : (
          <ScannerScreen
            transactions={transactions}
            isLoading={isLoading}
            onRefresh={fetchTransactions}
          />
        )}
      </main>
    </div>
  );
}

export default App;
