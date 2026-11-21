import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uygulama Hatası (ErrorBoundary):', error, errorInfo);
    this.setState({ errorInfo });

    // If it's a chunk load failure, auto-reload once if not attempted recently
    const isChunkError =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('ab_yapi_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('ab_yapi_chunk_reload', now.toString());
        window.location.reload();
      }
    }
  }

  private handleRetry = () => {
    try {
      this.props.onReset?.();
    } catch (e) {
      console.warn('ErrorBoundary reset uyarısı:', e);
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleResetCache = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      localStorage.removeItem('ab_yapi_last_params');
      localStorage.removeItem('ab_yapi_tabs');
    } catch (e) {
      console.warn('Önbellek temizleme uyarısı:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div className="min-h-[60vh] w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/70 border border-slate-200/90 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block">
                  AB YAPI • Sistem Koruması
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                  {this.props.fallbackTitle || 'Beklenmeyen Bir Hata Oluştu'}
                </h2>
              </div>
            </div>

            <div className="p-6 sm:p-7 text-center">
              <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
                {isChunkError
                  ? 'Yeni bir sürüm yayınlanmış olabilir veya bağlantı kesintisi yaşandı. Yeniden deneyebilir ya da sayfayı yenileyebilirsiniz.'
                  : 'İlgili ekran işlenirken beklenmeyen bir teknik durum oluştu. Çalışma verilerinizi kaybetmeden yeniden deneyebilir veya sayfayı yenileyebilirsiniz.'}
              </p>

              {this.state.error && (
                <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left overflow-x-auto text-[11px] font-mono text-slate-700 max-h-28">
                  {this.state.error.message || this.state.error.toString()}
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Yeniden Dene
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 active:scale-98 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                    Sayfayı Yenile
                  </button>

                  <button
                    type="button"
                    onClick={this.handleResetCache}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 active:scale-98 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                    Önbelleği Temizle ve Sıfırla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
