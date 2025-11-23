
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Loader } from '@react-three/drei';
import * as THREE from 'three';
import { ZenScene } from './components/ZenScene';
import { Season, TimeOfDay, HaikuData } from './types';

// --- Section Component for Scroll Overlay ---
const Section = ({ children, opacity = 1, align = 'left' }: any) => {
  return (
    <div className={`h-screen w-screen flex flex-col justify-center p-10 md:p-24 ${align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start text-left'}`} style={{ opacity }}>
      <div className="max-w-2xl">
        {children}
      </div>
    </div>
  );
};

const App = () => {
  const [season, setSeason] = useState<Season>(Season.Spring);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(TimeOfDay.Day);
  const [activeHaiku, setActiveHaiku] = useState<HaikuData | null>(null);

  const closeHaiku = () => setActiveHaiku(null);

  return (
    <>
    <div className="h-screen w-screen bg-[#0a0a0a] font-zen text-washi selection:bg-rust selection:text-white">
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
        <Suspense fallback={null}>
          {/* Increased to 6 pages for extended content */}
          <ScrollControls pages={6} damping={0.3}>
            {/* 3D Content */}
            <ZenScene season={season} timeOfDay={timeOfDay} onInteract={setActiveHaiku} />
            
            {/* HTML Content Scroll Overlay */}
            <Scroll html style={{ width: '100%', height: '100%' }}>
              
              {/* Page 1: Intro */}
              <Section align="center">
                <h1 className="text-7xl md:text-[10rem] font-bold mb-6 tracking-tighter opacity-90 mix-blend-difference">善 ZEN</h1>
                <p className="text-xl md:text-3xl font-cinzel tracking-[0.6em] uppercase opacity-70">The Digital Sanctuary</p>
                <div className="mt-16 animate-pulse text-xs uppercase tracking-widest opacity-40 border-b border-white/20 pb-2">Scroll to Begin Journey</div>
              </Section>

              {/* Page 2: Water (Mizu) */}
              <Section align="left">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-6xl opacity-20 font-bold">01</span>
                  <h2 className="text-5xl md:text-7xl font-serif text-stone-200">Flow <span className="text-2xl opacity-50 block md:inline md:ml-4">(Nagare)</span></h2>
                </div>
                <p className="text-xl md:text-2xl leading-relaxed opacity-80 bg-black/30 p-8 backdrop-blur-sm border-l-2 border-white/20 shadow-2xl max-w-xl">
                  Like thoughts in meditation, the water flows endlessly. 
                  It reflects the world without judgment.
                  <br/><span className="text-base mt-4 block opacity-60 font-cinzel">Observe the ripples.</span>
                </p>
              </Section>

              {/* Page 3: Stone (Ishi) */}
              <Section align="right">
                <div className="flex flex-row-reverse items-center gap-4 mb-6">
                   <span className="text-6xl opacity-20 font-bold">02</span>
                   <h2 className="text-5xl md:text-7xl font-serif text-stone-200">Stillness <span className="text-2xl opacity-50 block md:inline md:mr-4">(Seijaku)</span></h2>
                </div>
                <p className="text-xl md:text-2xl leading-relaxed opacity-80 bg-black/30 p-8 backdrop-blur-sm border-r-2 border-white/20 shadow-2xl max-w-xl">
                  The rock endures the wind and rain. 
                  It anchors the spirit in the present moment.
                  <br/><span className="text-base mt-4 block text-rust italic">Click the stones to reveal haiku.</span>
                </p>
              </Section>

              {/* Page 4: Tea (Wa) - NEW SECTION */}
              <Section align="left">
                 <div className="flex items-center gap-4 mb-6">
                  <span className="text-6xl opacity-20 font-bold">03</span>
                  <h2 className="text-5xl md:text-7xl font-serif text-stone-200">Harmony <span className="text-2xl opacity-50 block md:inline md:ml-4">(Wa)</span></h2>
                </div>
                <p className="text-xl md:text-2xl leading-relaxed opacity-80 bg-black/30 p-8 backdrop-blur-sm border-l-2 border-rust/50 shadow-2xl max-w-xl">
                  The ceremony of tea is the worship of the beautiful among the sordid facts of everyday existence.
                  <br/><span className="text-base mt-4 block opacity-60 font-cinzel">Simplicity. Purity. Tranquility.</span>
                </p>
              </Section>

               {/* Page 5: Moss (Sabi) - NEW SECTION */}
               <Section align="right">
                 <div className="flex flex-row-reverse items-center gap-4 mb-6">
                   <span className="text-6xl opacity-20 font-bold">04</span>
                   <h2 className="text-5xl md:text-7xl font-serif text-stone-200">Age <span className="text-2xl opacity-50 block md:inline md:mr-4">(Sabi)</span></h2>
                </div>
                <p className="text-xl md:text-2xl leading-relaxed opacity-80 bg-black/30 p-8 backdrop-blur-sm border-r-2 border-moss/50 shadow-2xl max-w-xl">
                  Beauty that comes with age. The moss growing on the rock shows us that time is not an enemy, but an artist.
                </p>
              </Section>

              {/* Page 6: Void (Mu) */}
              <Section align="center">
                <h2 className="text-6xl md:text-9xl mb-8 font-bold tracking-widest text-white mix-blend-overlay">無 MU</h2>
                <p className="text-2xl font-cinzel opacity-80 max-w-lg mx-auto mb-12 border-b border-white/10 pb-8">
                  The Gate opens to the infinite.<br/>
                  Empty your cup so that it may be filled.
                </p>
                
                {/* Controls */}
                <div className="inline-flex flex-col md:flex-row gap-12 p-10 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 pointer-events-auto shadow-2xl">
                   <div className="flex flex-col gap-4">
                      <span className="text-xs uppercase tracking-[0.2em] opacity-50 border-b border-white/10 pb-1">Season</span>
                      <div className="grid grid-cols-2 gap-3">
                         {(Object.keys(Season) as Array<keyof typeof Season>).map((s) => (
                           <button 
                              key={s} 
                              onClick={() => setSeason(Season[s])} 
                              className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-300 ${season === Season[s] ? 'bg-washi text-sumi font-bold' : 'hover:bg-white/10 text-washi/70'}`}
                            >
                              {s}
                            </button>
                         ))}
                      </div>
                   </div>
                   
                   <div className="w-px bg-white/10 hidden md:block"></div>

                   <div className="flex flex-col gap-4">
                      <span className="text-xs uppercase tracking-[0.2em] opacity-50 border-b border-white/10 pb-1">Time</span>
                      <div className="flex gap-4 items-center h-full">
                         <button onClick={() => setTimeOfDay(TimeOfDay.Day)} className={`w-10 h-10 rounded-full border-2 transition-all ${timeOfDay === TimeOfDay.Day ? 'bg-yellow-100 border-yellow-200 scale-110 shadow-[0_0_15px_rgba(255,255,200,0.5)]' : 'bg-transparent border-white/20 hover:border-white/50'}`} title="Day"></button>
                         <button onClick={() => setTimeOfDay(TimeOfDay.Sunset)} className={`w-10 h-10 rounded-full border-2 transition-all ${timeOfDay === TimeOfDay.Sunset ? 'bg-orange-400 border-orange-300 scale-110 shadow-[0_0_15px_rgba(255,165,0,0.5)]' : 'bg-transparent border-white/20 hover:border-white/50'}`} title="Sunset"></button>
                         <button onClick={() => setTimeOfDay(TimeOfDay.Night)} className={`w-10 h-10 rounded-full border-2 transition-all ${timeOfDay === TimeOfDay.Night ? 'bg-indigo-900 border-indigo-400 scale-110 shadow-[0_0_15px_rgba(100,100,255,0.5)]' : 'bg-transparent border-white/20 hover:border-white/50'}`} title="Night"></button>
                      </div>
                   </div>
                </div>
              </Section>

            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>

      {/* Loading Screen */}
      <Loader 
        containerStyles={{ background: '#111' }}
        innerStyles={{ background: '#111', width: '100%' }}
        barStyles={{ background: '#F5F5DC', height: '1px' }}
        dataStyles={{ fontFamily: 'Zen Old Mincho', fontSize: '12px', color: '#F5F5DC', textTransform: 'uppercase', letterSpacing: '0.2em' }}
      />

      {/* Interactive Haiku Modal */}
      {activeHaiku && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl transition-all duration-700 cursor-pointer p-4" onClick={closeHaiku}>
          <div className="bg-[#eaddcf] text-[#2c2c2c] p-12 md:p-20 max-w-xl w-full shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
             <div className="absolute top-[-20px] right-[-20px] opacity-[0.07] font-zen text-[12rem] select-none pointer-events-none leading-none">心</div>
             <div className="border-l-4 border-[#B7282E] pl-8 py-2">
                <p className="text-3xl md:text-4xl font-zen mb-4 leading-relaxed">{activeHaiku.line1}</p>
                <p className="text-3xl md:text-4xl font-zen mb-4 pl-8 leading-relaxed">{activeHaiku.line2}</p>
                <p className="text-3xl md:text-4xl font-zen mb-10 leading-relaxed">{activeHaiku.line3}</p>
             </div>
             <div className="flex items-center gap-4 mt-8">
                <div className="h-[1px] flex-1 bg-gray-400"></div>
                <p className="text-sm font-cinzel tracking-[0.3em] text-[#B7282E] uppercase">{activeHaiku.author || "Unknown"}</p>
             </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default App;
