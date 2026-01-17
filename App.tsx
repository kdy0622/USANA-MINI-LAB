
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Category, 
  WorkerConcept, 
  AspectRatio, 
  Resolution, 
  GenerationRequest, 
  GeneratedResult 
} from './types';
import { 
  CATEGORY_DATA, 
  WORKER_DATA, 
  ASPECT_RATIOS, 
  RESOLUTIONS, 
  SYSTEM_INSTRUCTION 
} from './constants';

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Fixed: Correctly extending the global Window interface to avoid conflict with other declarations
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<GenerationRequest>({
    category: Category.VEGETABLE,
    dishName: '바이오메가',
    workerConcept: WorkerConcept.CHEF,
    aspectRatio: AspectRatio.ONE_ONE,
    resolution: Resolution.AUTO
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkKey = async () => {
      // Use window.aistudio safely
      const exists = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(exists);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    // After key selection, assume success due to potential race condition
    setHasApiKey(true);
  };

  const withRetry = async <T,>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const isOverloaded = err.message?.includes("503") || err.message?.includes("overloaded") || err.status === 503;
        
        if (isOverloaded && attempt < maxRetries) {
          setRetryCount(attempt + 1);
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    
    try {
      // Corrected: Always create new GoogleGenAI instance before use with { apiKey: ... }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const promptResponse = await withRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: `Search for the 2025 USANA Product Guide and usana.com to find the EXACT shape, color, and coating of "USANA ${formData.dishName}". Identify if it is an oblong tablet with speckles, a translucent amber softgel, or a colored coated tablet. Also identify the unique raw ingredients (e.g. sardines/anchovies/lemon for BiOmega, reishi/shiitake for Proglucamune). 
          Then create a hyper-realistic miniature workshop prompt where this giant supplement is the central landscape. 
          Context: Category=${formData.category}, Workers=${formData.workerConcept}, Ratio=${formData.aspectRatio}.`,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }]
          },
        });
      });

      // Corrected: response.text is a property, not a method
      const refinedPrompt = promptResponse.text || `Macro photography of USANA ${formData.dishName} as a giant central object, miniature workshop setting, 8K.`;

      const imageResponse = await withRetry(async () => {
        // Corrected: Create new instance for image generation call
        const aiImage = new GoogleGenAI({ apiKey: process.env.API_KEY });
        return await aiImage.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: {
            parts: [{ text: refinedPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: formData.aspectRatio,
              imageSize: formData.resolution === Resolution.AUTO ? "1K" : (formData.resolution as any)
            }
          }
        });
      });

      let imageUrl = '';
      // Corrected: Safely iterate through candidates[0].content.parts to find inlineData
      const firstCandidate = imageResponse.candidates?.[0];
      if (firstCandidate?.content?.parts) {
        for (const part of firstCandidate.content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageUrl) throw new Error("이미지가 생성되지 않았습니다.");

      setResult({ imageUrl, prompt: refinedPrompt });
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API 키 문제가 발생했습니다. 키를 다시 선택해주세요.");
        setHasApiKey(false);
      } else if (err.message?.includes("503") || err.message?.includes("overloaded")) {
        setError("서버 부하가 심합니다. 잠시 후 다시 시도해 주세요.");
      } else {
        setError(err.message || "오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
      setRetryCount(0);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-key text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">API 키 인증</h1>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            USANA 미니어처 워크숍은 고성능 이미지 생성과 실시간 제품 데이터 검색을 위해 유료 API 키를 사용합니다.
            <br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-500 underline text-[10px]">결제 설정 안내</a>
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            API 키 선택하기
          </button>
        </div>
      </div>
    );
  }

  if (hasApiKey === null) return null;

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-700 to-blue-500 p-2 rounded-xl shadow-lg shadow-blue-100">
              <i className="fa-solid fa-microscope text-white text-xl"></i>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter">
              USANA <span className="text-blue-600">MINI-LAB</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSelectKey()} 
              className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-all uppercase tracking-widest border border-slate-200 px-4 py-1.5 rounded-full hover:border-blue-200"
            >
              KEY CONFIG
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-blue-500"></i> Generation Setup
            </h3>
            
            <div className="space-y-8">
              <section>
                <label className="block text-sm font-bold text-slate-700 mb-4">1. 성분 카테고리</label>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORY_DATA.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        formData.category === cat.id ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-slate-50 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <i className={`fa-solid ${cat.icon} text-xl mb-2 ${formData.category === cat.id ? 'text-blue-600' : 'text-slate-400'}`}></i>
                      <span className="text-[10px] font-black uppercase tracking-tight">{cat.label === 'Vegetable' ? '식물성' : cat.label === 'Seafood' ? '오일류' : '단백질'}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="block text-sm font-bold text-slate-700 mb-4">2. 유사나 제품명</label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="바이오메가, 헬스팩, 코퀴논 등..."
                    value={formData.dishName}
                    onChange={(e) => setFormData({ ...formData, dishName: e.target.value })}
                    className="w-full pl-5 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-800 transition-all shadow-inner"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:text-blue-600 transition-colors">
                    <i className="fa-solid fa-magnifying-glass-chart text-xl"></i>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-400 font-medium pl-2">※ 공식 안내서를 바탕으로 제형과 성분을 자동 분석합니다.</p>
              </section>

              <section>
                <label className="block text-sm font-bold text-slate-700 mb-4">3. 전문가 팀 컨셉</label>
                <div className="space-y-2">
                  {WORKER_DATA.map((worker) => (
                    <button
                      key={worker.id}
                      onClick={() => setFormData({ ...formData, workerConcept: worker.id })}
                      className={`w-full flex items-center p-3 rounded-2xl border-2 transition-all ${
                        formData.workerConcept === worker.id ? 'border-blue-500 bg-blue-50' : 'border-slate-50 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-sm transition-all ${
                        formData.workerConcept === worker.id ? 'bg-blue-600 text-white scale-110' : 'bg-white text-slate-400'
                      }`}>
                        <i className={`fa-solid ${worker.icon}`}></i>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-slate-800">{worker.label === 'Construction' ? '정밀 공정팀' : worker.label === 'Chef' ? '마스터 셰프팀' : '원료 수확팀'}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{worker.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <section>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Ratio</label>
                  <select value={formData.aspectRatio} onChange={(e) => setFormData({ ...formData, aspectRatio: e.target.value as AspectRatio })} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none hover:bg-slate-100 transition-colors">
                    {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </section>
                <section>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Quality</label>
                  <select value={formData.resolution} onChange={(e) => setFormData({ ...formData, resolution: e.target.value as Resolution })} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none hover:bg-slate-100 transition-colors">
                    {RESOLUTIONS.map(r => <option key={r} value={r}>{r === 'Auto' ? 'Smart' : r}</option>)}
                  </select>
                </section>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !formData.dishName.trim()}
            className={`w-full py-6 rounded-[2rem] font-black text-white shadow-2xl transition-all flex items-center justify-center gap-3 text-xl tracking-tighter active:scale-95 ${
              isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-800 via-blue-600 to-indigo-600 hover:shadow-blue-300'
            }`}
          >
            {isLoading ? (
              <><i className="fa-solid fa-gear animate-spin"></i> {retryCount > 0 ? `RETRYING...` : 'RESEARCHING...'}</>
            ) : (
              <><i className="fa-solid fa-wand-magic-sparkles"></i> CREATE MINIATURE</>
            )}
          </button>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[650px] flex flex-col relative">
            <div className="p-6 border-b border-slate-50 bg-white/50 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 bg-red-400 rounded-full"></span>
                  <span className="w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
                  <span className="w-2.5 h-2.5 bg-green-400 rounded-full"></span>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">USANA Visual Engine</span>
              </div>
              {result && (
                <button 
                  onClick={() => { const link = document.createElement('a'); link.href = result.imageUrl; link.download = `usana-lab-${formData.dishName}.png`; link.click(); }} 
                  className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  EXPORT
                </button>
              )}
            </div>

            <div className="flex-1 relative flex items-center justify-center bg-slate-50/50 p-6 text-center">
              {isLoading ? (
                <div className="space-y-8 max-w-sm">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 border-8 border-blue-100 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                    <i className="fa-solid fa-magnifying-glass absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-blue-600"></i>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">Data Analyzing...</h3>
                    <p className="text-slate-400 text-xs mt-3 font-bold leading-relaxed px-4">
                      유사나 홈페이지 및 전제품 안내서(2025)를 통해 <span className="text-blue-600">"${formData.dishName}"</span>의 정확한 제형(Speckles, Coating, Translucency)을 분석 중입니다.
                    </p>
                  </div>
                  {retryCount > 0 && <div className="text-amber-500 text-[11px] font-black animate-pulse">CONNECTION BUSY - RETRYING {retryCount}/3</div>}
                </div>
              ) : result ? (
                <div className="w-full h-full flex flex-col p-2">
                  <div className="flex-1 flex items-center justify-center">
                    <img 
                      src={result.imageUrl} 
                      alt="USANA Miniature" 
                      className="max-w-full max-h-[500px] object-contain rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-[12px] border-white" 
                    />
                  </div>
                  <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-left shadow-2xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Analyzed Visualization Prompt</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium italic leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-help scrollbar-hide overflow-y-auto">
                      {result.prompt}
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="p-10 bg-white shadow-xl rounded-[2.5rem] border border-red-50 max-w-sm">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fa-solid fa-bolt-lightning text-3xl"></i>
                  </div>
                  <p className="font-black text-slate-800 text-lg">SYSTEM ERROR</p>
                  <p className="text-xs mt-3 font-bold text-slate-400 leading-relaxed">{error}</p>
                  <button onClick={handleGenerate} className="mt-8 px-8 py-3 bg-red-500 text-white rounded-full text-xs font-black shadow-lg shadow-red-200 hover:bg-red-600 transition-all">RETRY ENGINE</button>
                </div>
              ) : (
                <div className="max-w-sm space-y-8">
                  <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mx-auto border border-slate-100 rotate-12 transition-transform hover:rotate-0 cursor-pointer">
                    <i className="fa-solid fa-cube text-5xl text-blue-100"></i>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-2xl tracking-tighter">USANA MINI-LAB AI</h3>
                    <p className="text-xs mt-4 font-bold text-slate-400 leading-relaxed px-6">
                      유사나 제품의 실제 알약 모양, 색상, 성분을 고해상도 미니어처 아트로 구현합니다. 제품명을 입력하고 창작을 시작하세요.
                    </p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-[10px]"><i className="fa-solid fa-search"></i></div>
                      <span className="text-[8px] font-black text-slate-300">SEARCH</span>
                    </div>
                    <div className="w-8 h-[1px] bg-slate-100 self-center mt-[-20px]"></div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-[10px]"><i className="fa-solid fa-brain"></i></div>
                      <span className="text-[8px] font-black text-slate-300">ANALYZE</span>
                    </div>
                    <div className="w-8 h-[1px] bg-slate-100 self-center mt-[-20px]"></div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-400 text-[10px] shadow-sm"><i className="fa-solid fa-image"></i></div>
                      <span className="text-[8px] font-black text-blue-400">CREATE</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-center">
        <div className="inline-block p-1 bg-white border border-slate-200 rounded-full px-6 py-2 shadow-sm">
           <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">
            © 2025 USANA Health Sciences Visual Lab | Built with Gemini 3 Pro
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
