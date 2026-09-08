import React, { useState, useEffect } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw, AlertCircle, CheckCircle2, Lightbulb, FileText, TrendingUp, ShieldAlert, Cpu } from 'lucide-react';
import { ProjectParams, CalculationResult } from '../types';

interface AiAssistantTabProps {
  params: ProjectParams;
  results: CalculationResult;
  onChangeParams: (updated: ProjectParams) => void;
  isLight?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiAssistantTab: React.FC<AiAssistantTabProps> = ({
  params,
  results,
  onChangeParams,
  isLight = true,
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Merhaba! Ben AB Yapı Kentsel Dönüşüm ve İmar Mevzuatı Yapay Zeka Uzmanıyım. Projenizin finansal fizibilitesini analiz edebilir, müteahhit-hak sahibi paylaşım oranlarını değerlendirebilir ve imar sorularınızı yanıtlayabilirim.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Generate analysis on load or manually
  const fetchAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params, results }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Analiz oluşturulurken sunucu hatası alındı.');
      }
      setAnalysis(data.analysis);
    } catch (err: any) {
      setAnalysisError(err.message || 'Yapay zeka analizine ulaşılamadı. Lütfen GEMINI_API_KEY anahtarınızı kontrol edin.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMsg;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMsg('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          projectContext: {
            landArea: params.landArea,
            floorCount: params.floorCount,
            flatCount: results.flatCount || params.flatCount,
            grandTotal: results.grandTotal,
            contractorShareRate: params.contractorShareRate,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Yapay zeka yanıtı alınamadı.');
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Bağlantı hatası: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompts = [
    'Müteahhit paylaşım oranımız adil mi?',
    'Maliyeti düşürmek için hangi parametreleri değiştirmeliyim?',
    'Çatı dubleksi eklemek fizibiliteyi nasıl etkiler?',
    'Kentsel dönüşüm kira yardımı ve vergi muafiyetleri nelerdir?',
    'Çıkma / Konsol haklarımız imar açısından uygun mu?',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Üst Karşılama Kartı */}
      <div className="p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              AB Yapı Gemini AI Asistanı
            </div>
            <h2 className="text-2xl font-black tracking-tight">Kentsel Dönüşüm & İmar Akıllı Yapay Zeka Uzmanı</h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Mevcut projenizin tüm hesaplama verilerini yapay zeka ile fizibilite ve finansal açıdan analiz edin,
              müteahhit risklerini değerlendirin veya imar mevzuatı sorularınızı anında sorun.
            </p>
          </div>
          <button
            onClick={fetchAnalysis}
            disabled={analyzing}
            className="shrink-0 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            <Cpu className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Proje Analiz Ediliyor...' : 'Otomatik AI Raporu Üret'}
          </button>
        </div>
      </div>

      {/* Proje Özet Şerit Kartı */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Arsa / Kat Sayısı</div>
          <div className="text-base font-black text-slate-900 mt-1">{params.landArea || 0} m² / {params.floorCount || 0} Kat</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Toplam Daire</div>
          <div className="text-base font-black text-slate-900 mt-1">{results.flatCount || params.flatCount || 0} Bağımsız Bölüm</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Paylaşım Oranı</div>
          <div className="text-base font-black text-emerald-600 mt-1">%{params.contractorShareRate || 50} Müteahhit</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Toplam Tahmini Maliyet</div>
          <div className="text-base font-black text-blue-600 mt-1">{(results.grandTotal || 0).toLocaleString('tr-TR')} TL</div>
        </div>
      </div>

      {/* Ana Bölüm: AI Analiz Raporu & Sohbet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol Taraf: AI Fizibilite Rapor Alanı (7 Kolon) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Yapay Zeka Fizibilite & Strateji Raporu</h3>
              </div>
              {analysis && (
                <button
                  onClick={fetchAnalysis}
                  disabled={analyzing}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                  Yenile
                </button>
              )}
            </div>

            {analyzing && (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-bold text-slate-700">Projeniz Gemini AI tarafından analiz ediliyor...</p>
                <p className="text-xs text-slate-400">Arsa metrajları, imar kısıtları ve finansal maliyetler değerlendiriliyor.</p>
              </div>
            )}

            {analysisError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Analiz Oluşturulamadı
                </div>
                <p>{analysisError}</p>
              </div>
            )}

            {!analyzing && !analysis && !analysisError && (
              <div className="py-12 text-center space-y-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-base">Henüz AI Analiz Raporu Oluşturulmadı</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Yukarıdaki "Otomatik AI Raporu Üret" butonuna tıklayarak projenizin karlılık, risk ve mimari optimizasyon raporunu saniyeler içinde edinin.
                  </p>
                </div>
                <button
                  onClick={fetchAnalysis}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Şimdi Analiz Et
                </button>
              </div>
            )}

            {analysis && !analyzing && (
              <div className="prose prose-slate prose-sm max-w-none space-y-3 text-slate-700 leading-relaxed font-sans whitespace-pre-line bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                {analysis}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Taraf: AI İnteraktif Sohbet Modülü (5 Kolon) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col h-[620px]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bot className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">AI İmar & Dönüşüm Asistanı</h3>
              <p className="text-[11px] text-slate-400">Canlı Proje Bağlamı ile Anlık Cevaplar</p>
            </div>
          </div>

          {/* Hızlı Soru Çipleri */}
          <div className="pt-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp)}
                className="shrink-0 text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap"
              >
                💡 {qp}
              </button>
            ))}
          </div>

          {/* Sohbet Mesaj Listesi */}
          <div className="flex-1 overflow-y-auto space-y-3 p-2 my-2 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3 rounded-2xl space-y-1 ${
                    m.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  <span
                    className={`block text-[9px] text-right ${
                      m.role === 'user' ? 'text-emerald-200' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <Bot className="w-4 h-4 animate-bounce text-teal-600" />
                <span>AI düşünüyor ve yanıt yazıyor...</span>
              </div>
            )}
          </div>

          {/* Girdi Alanı */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="İmar mevzuatı veya proje hakkında soru sorun..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={chatLoading || !inputMsg.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
