import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
              {this.props.fallbackTitle || 'Sayfa Yüklenirken Bir Sorun Oluştu'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              {isChunkError
                ? 'Yeni bir güncelleme yapılmış olabilir veya bağlantı kesintisi yaşandı. Sayfayı yenileyerek devam edebilirsiniz.'
                : 'Uygulama çalışırken beklenmeyen bir durum meydana geldi. Aşağıdaki butonlarla sayfayı yenileyebilir veya önbelleği sıfırlayabilirsiniz.'}
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-100 rounded-xl text-left overflow-x-auto text-[11px] font-mono text-slate-700 max-h-24">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 active:scale-98 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Sayfayı Yenile
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 active:scale-98 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                Önbelleği Temizle ve Sıfırla
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
