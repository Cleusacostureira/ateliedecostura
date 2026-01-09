import React from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function DebugResetPage() {
  const reset = () => {
    try {
      localStorage.removeItem('orders');
      localStorage.removeItem('cashFlowDetails');
      localStorage.removeItem('deletedOrders');
      window.dispatchEvent(new CustomEvent('refetchOrdersFromServer'));
      window.dispatchEvent(new CustomEvent('ordersUpdated'));
      window.dispatchEvent(new CustomEvent('financeUpdated'));
      alert('Local storage cleared. Recarregue a página de Ordens.');
    } catch (e) { alert('Falha ao limpar localStorage: ' + String(e)); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="p-4 lg:pl-72">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-2">Reset Local Orders</h1>
          <p className="text-sm text-gray-600 mb-4">This will remove local `orders`, `cashFlowDetails` and `deletedOrders` so the app will reload data from the server. Use when local data is stale.</p>
          <div className="flex gap-3">
            <button onClick={reset} className="bg-red-600 text-white px-4 py-2 rounded">Clear Local Data</button>
            <a href="/ordens" className="bg-gray-200 px-4 py-2 rounded">Go to Ordens</a>
          </div>
        </div>
      </div>
    </div>
  );
}
