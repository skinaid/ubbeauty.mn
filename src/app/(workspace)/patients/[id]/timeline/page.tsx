import React from 'react';

export default function PatientBeautyTimelinePage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-full min-h-screen bg-bg-subtle">
      {/* Sticky Left Pane (Patient Bio) 30% */}
      <aside className="w-[30%] border-r border-[#0000000a] bg-bg-subtle p-8 flex flex-col gap-8 min-w-[300px]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#E8D3CE] text-[#8A4F42] flex items-center justify-center text-xl font-serif">
            EL
          </div>
          <div>
            <h1 className="text-2xl font-serif">Elara Laurent</h1>
            <p className="text-sm text-ui-secondary">Patient ID: {params.id}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-ui-muted mb-2">Contact</h3>
            <p className="text-sm">+1 212 555-1234</p>
            <p className="text-sm">elara.l@email.com</p>
          </div>

          <div>
             <h3 className="text-xs font-bold uppercase tracking-widest text-ui-muted mb-2">Vitals</h3>
             <p className="text-sm">DOB: Jan 14, 1988</p>
          </div>

          <div className="p-4 bg-[#F9F3F2] border border-[#E8D3CE] rounded-[8px]">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#A36B5E] mb-1 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-[#A36B5E]"></span>
               Allergies
             </h3>
             <p className="text-sm text-[#8A4F42]">Lidocaine sensitivities</p>
          </div>

          <div className="pt-6 border-t border-[#00000006]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ui-muted mb-2">Lifetime Value</h3>
            <p className="text-3xl font-serif text-text-primary">$28,500</p>
          </div>
        </div>
      </aside>

      {/* Right scrolling pane (Timeline) 70% */}
      <main className="w-[70%] p-10 bg-white">
        <header className="mb-10 flex justify-between items-center">
            <h2 className="text-3xl font-serif">Beauty Timeline</h2>
            <button className="ui-button ui-button--primary">
                + New Session
            </button>
        </header>

        <div className="relative border-l border-[#00000010] ml-4 pl-8 space-y-12">
            
            {/* Timeline Event 1 */}
            <div className="relative">
                <span className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-bg-muted border border-border-strong flex items-center justify-center text-xs font-bold z-10">1</span>
                
                <div className="mb-4">
                    <h3 className="font-semibold text-lg">Oct 12, 2023 — <span className="font-normal italic text-ui-secondary">Anti-Aging Injectables</span></h3>
                    <p className="text-sm text-ui-muted">Dr. Aris Thorne</p>
                </div>

                <div className="flex gap-8 mb-6">
                    <div className="flex-1 space-y-2">
                        <h4 className="text-sm font-semibold">Clinical Notes</h4>
                        <p className="text-sm leading-relaxed">
                            Patient seeks brow lift and line reduction. Treated Frown Lines (Glabellar) & Forehead Lines. Injection sites well-received.
                        </p>
                        <div className="flex gap-2 pt-2">
                            <span className="ui-badge ui-badge--neutral">Botox 40 units</span>
                            <span className="ui-badge ui-badge--neutral">Dermal Filler</span>
                        </div>
                    </div>
                </div>
            </div>

             {/* Timeline Event 2 */}
             <div className="relative">
                <span className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-bg-muted border border-border-strong flex items-center justify-center text-xs font-bold z-10">2</span>
                
                <div className="mb-4">
                    <h3 className="font-semibold text-lg">Jun 25, 2023 — <span className="font-normal italic text-ui-secondary">Laser Skin Resurfacing</span></h3>
                    <p className="text-sm text-ui-muted">Dr. Maeve Chen</p>
                </div>

                <div className="flex gap-8 mb-6">
                    <div className="flex-1 space-y-2">
                        <h4 className="text-sm font-semibold">Clinical Notes</h4>
                        <p className="text-sm leading-relaxed">
                            Full-face treatment targeting sun damage and fine lines. Applied topical anesthetic. Areas of pigmentation addressed.
                        </p>
                    </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}
