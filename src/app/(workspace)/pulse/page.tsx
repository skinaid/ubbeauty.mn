import React from 'react';

export default function PulseCommandCenter() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Pulse</h1>
        <p className="text-ui-secondary">Today's Command Center</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Today's Flow</h2>
          {/* Timeline Placeholder */}
          <div className="ui-card ui-card--padded flex flex-col gap-4 min-h-[600px]">
            <div className="text-sm text-ui-muted text-center py-10">
              Timeline view architecture initializing...
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
            <div className="ui-card ui-card--padded">
              <p className="text-sm text-ui-muted">All online bookings confirmed.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Action Hub</h2>
            <div className="ui-card ui-card--padded">
              <p className="text-sm text-ui-muted">Awaiting physical arrivals.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
