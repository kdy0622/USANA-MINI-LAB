
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
  SYSTEM_INSTRUCTION 
} from './constants';

// Fixed window.aistudio declaration to avoid modifier/type conflicts with global AIStudio type
declare global {
  interface Window {
    aistudio: any;
  }
}

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<GenerationRequest>({
    category: Category.VEGETABLE,
    dishName: '유사니멀즈',
    workerConcept: WorkerConcept.CHEF,
    aspectRatio: AspectRatio.ONE_ONE,
    resolution: Resolution.AUTO
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const exists = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(exists);
        } else {
          setHasApiKey(false);
        }
      } catch (err) {
        console.error("Error checking API key status:", err);
        setHasApiKey(false);
      }
    };
    
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Per instructions: assume success after triggering the dialog to mitigate race conditions
      setHasApiKey(true);
    } else {
      console.error("AI Studio bridge not available.");
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create new instance right before use to ensure latest API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Use gemini-3-pro-preview for complex reasoning/research with tools
      const promptResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Research USANA's official 2025 product guide. 
        Target Product Input: "${formData.dishName}".
        1. TRANSLATION: If "${formData.dishName}" is in Korean, translate it to its official English USANA name.
        2. INGREDIENTS: Identify ALL major raw ingredients for this product.
        3. BRANDING: The text in the image MUST be "USANA [OFFICIAL ENGLISH NAME]".
        4. SCENE: Create a busy miniature workshop prompt. 20+ tiny ${formData.workerConcept} workers harvesting giant versions of those raw ingredients and engraving the official English name onto the giant supplement.
        5. VISUALS: Extreme macro, 8K, vivid textures.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }]
        },
      });

      const refinedPrompt = promptResponse.text || `Detailed macro photography of USANA supplement with English branding, surrounded by giant fresh ingredients and 20+ tiny workers, 8K.`;

      // Create new instance for image generation
      const aiImage = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imageResponse = await aiImage.models.generateContent({
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

      let imageUrl = '';
      // Correct extraction: iterate parts to find inlineData
      const parts = imageResponse.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
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
      // Instruction: if "Requested entity was not found", reset key state
      if (err.message?.includes("Requested entity was not found")) {
        setError("API 키를 다시 선택해주세요.");
        setHasApiKey(false);
      } else {
        setError(err.message || "오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-flask-vial text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">USANA API 인증</h1>
          <p className="text-sm text-slate-500 mb-6">
            이 서비스를 이용하려면 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-600 underline">유료 GCP 프로젝트</a>와 연결된 API 키가 필요합니다.
          </p>
          <button onClick={handleSelectKey} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
            API 키 선택하기
          </button>
        </div>
      </div>
    );
  }

  if (hasApiKey === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin text-blue-600 text-4xl">
            <i className="fa-solid fa-circle-notch"></i>
          </div>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Initializing Lab...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-700 to-indigo-600 p-2 rounded-xl shadow-lg">
              <i className="fa-solid fa-vial-circle-check text-white text-xl"></i>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter">
              USANA <span className="text-blue-600">PRECISE-LAB</span>
            </h1>
          </div>
          <button onClick={() => handleSelectKey()} className="text-[10px] font-black text-slate-400 border border-slate-200 px-4 py-1.5 rounded-full hover:bg-slate-50">
            KEY CONFIG
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fa-solid fa-magnifying-glass text-blue-500"></i> PRODUCT ACCURACY
            </h3>
            
            <div className="space-y-8">
              <section>
                <label className="block text-sm font-bold text-slate-700 mb-4">1. 주요 원료 배경</label>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORY_DATA.map((cat) => (
                    <button key={cat.id} onClick={() => setFormData({ ...formData, category: cat.id })} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${formData.category === cat.id ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-slate-50 bg-slate-50 hover:bg-slate-100'}`}>
                      <i className={`fa-solid ${cat.icon} text-xl mb-2 ${formData.category === cat.id ? 'text-blue-600' : 'text-slate-400'}`}></i>
                      <span className="text-[10px] font-black uppercase tracking-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="block text-sm font-bold text-slate-700 mb-4">2. 유사나 제품명 (한글 가능)</label>
                <input type="text" placeholder="예: 유사니멀즈, 바이오메가, 헬스팩..." value={formData.dishName} onChange={(e) => setFormData({ ...formData, dishName: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none font-bold text-slate-800 transition-all shadow-inner" />
                <p className="mt-2 text-[10px] text-slate-400 font-medium pl-2">※ 한국어로 입력해도 이미지에는 영어 공식 명칭으로 표기됩니다.</p>
              </section>

              <section>
                <label className="block text-sm font-bold text-slate-700 mb-4">3. 전문가 크루 팀</label>
                <div className="space-y-2">
                  {WORKER_DATA.map((worker) => (
                    <button key={worker.id} onClick={() => setFormData({ ...formData, workerConcept: worker.id })} className={`w-full flex items-center p-3 rounded-2xl border-2 transition-all ${formData.workerConcept === worker.id ? 'border-blue-500 bg-blue-50' : 'border-slate-50 bg-slate-50 hover:bg-slate-100'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-sm transition-all ${formData.workerConcept === worker.id ? 'bg-blue-600 text-white scale-110' : 'bg-white text-slate-400'}`}>
                        <i className={`fa-solid ${worker.icon}`}></i>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-slate-800">{worker.label === 'Construction' ? '정밀 각인 공정팀' : worker.label === 'Chef' ? '원재료 마스터팀' : '집단 수확팀'}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{worker.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={isLoading || !formData.dishName.trim()} className={`w-full py-6 rounded-[2rem] font-black text-white shadow-2xl transition-all flex items-center justify-center gap-3 text-xl tracking-tighter active:scale-95 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-800 via-blue-600 to-indigo-600 hover:shadow-blue-300'}`}>
            {isLoading ? <><i className="fa-solid fa-microscope animate-spin"></i> PRECISE ANALYZING...</> : <><i className="fa-solid fa-wand-sparkles"></i> GENERATE PRECISE ART</>}
          </button>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[650px] flex flex-col relative">
            <div className="p-6 border-b border-slate-50 bg-white/50 backdrop-blur flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Precision Branding Visualization</span>
              {result && (
                <button onClick={() => { const link = document.createElement('a'); link.href = result.imageUrl; link.download = `usana-${formData.dishName}.png`; link.click(); }} className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black hover:bg-blue-700 transition-all shadow-lg">EXPORT</button>
              )}
            </div>

            <div className="flex-1 relative flex items-center justify-center bg-slate-50/50 p-6">
              {isLoading ? (
                <div className="space-y-8 text-center">
                  <div className="relative mx-auto w-24 h-24 text-blue-600 flex items-center justify-center">
                    <i className="fa-solid fa-fingerprint text-6xl animate-pulse"></i>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">Perfecting the Branding...</h3>
                    <p className="text-slate-400 text-xs mt-3 font-bold px-8">
                      공식 영어 제품명 각인과 천연 원재료들의 세밀한 배치를 공정하고 있습니다.
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 flex items-center justify-center p-2">
                    <img src={result.imageUrl} alt="Result" className="max-w-full max-h-[500px] object-contain rounded-3xl shadow-2xl border-[12px] border-white" />
                  </div>
                  <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-left">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">High-Fidelity Branding Prompt</span>
                    <p className="text-[11px] text-slate-300 font-medium italic leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-help">
                      {result.prompt}
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center p-10">
                  <i className="fa-solid fa-circle-exclamation text-5xl text-red-500 mb-6"></i>
                  <p className="font-black text-slate-800 text-lg uppercase">Engine Fault</p>
                  <p className="text-xs mt-3 font-bold text-slate-400">{error}</p>
                </div>
              ) : (
                <div className="text-center space-y-8 max-w-sm">
                  <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mx-auto border border-slate-100 transition-transform hover:scale-110 cursor-pointer">
                    <i className="fa-solid fa-stamp text-5xl text-blue-100"></i>
                  </div>
                  <h3 className="font-black text-slate-800 text-2xl tracking-tighter uppercase">USANA PRECISE-LAB</h3>
                  <p className="text-xs font-bold text-slate-400 px-6">
                    한국어로 입력해도 공식 영어 제품명으로 정확히 새겨넣습니다. 유사나의 과학적 정밀함과 미니어처 예술의 만남.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-center">
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">
          © 2025 USANA PRECISE-LAB Visual Engine | 1:25 Scale Branding Mode
        </p>
      </footer>
    </div>
  );
};

export default App;
