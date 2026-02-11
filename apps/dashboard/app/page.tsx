import React from 'react';

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Markets Scanned</h3>
          <p className="text-3xl font-bold mt-2">-</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Opportunities Found</h3>
          <p className="text-3xl font-bold mt-2">-</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Profit (Theoretical)</h3>
          <p className="text-3xl font-bold mt-2 text-green-400">$0.00</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Live Arbitrage Opportunities</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          Connecting to database and scanner...
        </div>
      </div>
    </div>
  );
}
