import React from 'react';

interface HeaderProps {
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  onOpenAbout: () => void;
  onOpenFeedback: () => void;
  onOpenTerms: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeMenu, 
  setActiveMenu, 
  onOpenAbout, 
  onOpenFeedback,
  onOpenTerms 
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-10 bg-[#1e1e1e] border-b border-black z-50 flex items-center justify-between px-4 select-none shadow-md">
      <div className="flex items-center gap-4">
          {/* Icon & Title */}
          <div className="flex items-center gap-3 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6">
                <rect width="32" height="32" rx="10" fill="#A8C7FA"/>
                <path d="M20 10V6h-7v12.5c0 1.93-1.57 3.5-3.5 3.5S6 20.43 6 18.5 7.57 15 9.5 15c.47 0 .91.1 1.32.26V10h9z" fill="#062E6F" transform="translate(2, 2)"/>
                <path d="M26 4l-1.5 3L21.5 8.5 24.5 10 26 13l1.5-3 3-1.5-3-1.5z" fill="#062E6F"/>
              </svg>
              <span className="text-sm font-bold tracking-tight text-white/90">Resonote</span>
          </div>
          
          {/* Desktop Menu Items */}
          <div className="hidden md:flex items-center gap-1">
               {['File', 'View'].map(item => (
                   <button key={item} className="px-3 py-1 rounded hover:bg-white/10 text-[12px] text-md-sys-secondary hover:text-white transition-colors cursor-default">
                      {item}
                   </button>
               ))}
               
               {/* Help Menu Dropdown */}
               <div className="relative">
                  <button 
                      onClick={() => setActiveMenu(activeMenu === 'Help' ? null : 'Help')}
                      className={`px-3 py-1 rounded transition-colors cursor-default text-[12px] ${
                          activeMenu === 'Help' 
                          ? 'bg-white/10 text-white' 
                          : 'text-md-sys-secondary hover:bg-white/10 hover:text-white'
                      }`}
                  >
                      Help
                  </button>

                  {activeMenu === 'Help' && (
                      <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                          <div className="absolute top-full left-0 mt-2 w-56 bg-[#2B2B2B] rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col py-2 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5">
                              <button 
                                  onClick={() => { onOpenAbout(); setActiveMenu(null); }}
                                  className="text-left px-4 py-2.5 text-[13px] text-[#E3E3E3] hover:bg-[#3d3d3d] transition-colors flex items-center gap-3"
                              >
                                  <span className="material-symbols-rounded text-[18px] text-md-sys-primary">info</span>
                                  About Resonote
                              </button>
                              <button 
                                  onClick={() => { onOpenFeedback(); setActiveMenu(null); }}
                                  className="text-left px-4 py-2.5 text-[13px] text-[#E3E3E3] hover:bg-[#3d3d3d] transition-colors flex items-center gap-3"
                              >
                                   <span className="material-symbols-rounded text-[18px] text-md-sys-primary">feedback</span>
                                   Give Feedback
                              </button>
                              <div className="h-px bg-white/10 my-1 mx-2"></div>
                              <button 
                                  onClick={() => { onOpenTerms(); setActiveMenu(null); }}
                                  className="text-left px-4 py-2.5 text-[13px] text-[#E3E3E3] hover:bg-[#3d3d3d] transition-colors flex items-center gap-3"
                              >
                                   <span className="material-symbols-rounded text-[18px] text-md-sys-primary">gavel</span>
                                   Terms of Service
                              </button>
                          </div>
                      </>
                  )}
               </div>
          </div>
      </div>

      {/* Right Side Status & Traffic Lights */}
      <div className="flex items-center gap-4">
           {/* Traffic Lights */}
           <div className="flex gap-2 pl-2">
               <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-black/20 shadow-sm hover:brightness-110 cursor-pointer"></div>
               <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/20 shadow-sm hover:brightness-110 cursor-pointer"></div>
               <div className="w-3 h-3 rounded-full bg-[#28c840] border border-black/20 shadow-sm hover:brightness-110 cursor-pointer"></div>
           </div>
      </div>
    </div>
  );
};