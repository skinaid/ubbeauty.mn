import React from 'react';

export default function RetailCheckoutPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Checkout POS</h1>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
        {/* Left: Active Cart / Search (7 columns) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="ui-card ui-card--padded flex-1 flex items-center justify-center">
            <p className="text-ui-muted text-sm">No active cart selected. Tap an arrived patient to fetch their treatment payload.</p>
          </div>
        </div>

        {/* Right: Payment Till (5 columns) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="ui-card ui-card--padded flex-1 flex flex-col justify-between bg-white border-subtle">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
              <div className="border border-dashed border-gray-200 p-4 rounded text-center text-sm text-gray-400">
                Cart is empty
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Due</span>
                <span>$0.00</span>
              </div>
              <button disabled className="ui-button ui-button--primary ui-button--lg ui-button--full w-full">
                Process Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
