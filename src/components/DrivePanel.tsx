import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  FileText,
  FileSpreadsheet,
  Download,
  Trash2,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  LogOut,
  UploadCloud,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../services/auth';
import {
  listDriveProjects,
  saveProjectJsonToDrive,
  saveReportDocumentToDrive,
  loadProjectFromDrive,
  deleteDriveFile,
} from '../services/drive';
import { DriveProjectFile, ProjectParams, CalculationResult, SavedProjectData } from '../types';
import { generateOfferHtml, generateContractHtml } from '../utils/reportExport';

interface DrivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  hasToken: boolean;
  params: ProjectParams;
  results: CalculationResult;
  onLoadProject: (savedData: SavedProjectData) => void;
  onRequestDeleteConfirm: (file: DriveProjectFile) => void;
  onAuthSuccess: (user: User, token: string) => void;
}

export const DrivePanel: React.FC<DrivePanelProps> = ({
  isOpen,
  onClose,
  user,
  hasToken,
  params,
  results,
  onLoadProject,
  onRequestDeleteConfirm,
  onAuthSuccess,
}) => {
  const [driveFiles, setDriveFiles] = useState<DriveProjectFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customProjectName, setCustomProjectName] = useState('');

  // Fetch files when panel opens and user has token
  useEffect(() => {
    if (isOpen && hasToken) {
      loadFiles();
    }
  }, [isOpen, hasToken]);

  const loadFiles = async () => {
    setIsLoadingFiles(true);
    setActionMessage(null);
    try {
      const files = await listDriveProjects();
      setDriveFiles(files);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Drive dosyaları alınamadı.' });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setActionMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        setActionMessage({ type: 'success', text: 'Google Drive başarıyla bağlandı.' });
        loadFiles();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Giriş işlemi tamamlanamadı.' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setDriveFiles([]);
    setActionMessage({ type: 'success', text: 'Google oturumu kapatıldı.' });
  };

  const handleSaveJson = async () => {
    setIsSaving(true);
    setActionMessage(null);
    try {
      const payload: SavedProjectData = {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        projectAddress: params.projectAddress,
        params,
        results,
      };
      const res = await saveProjectJsonToDrive(payload, customProjectName.trim() || undefined);
      setActionMessage({
        type: 'success',
        text: `"${res.name}" projesi Google Drive'a başarıyla kaydedildi!`,
      });
      setCustomProjectName('');
      loadFiles();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Kayıt başarısız.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOfferReport = async () => {
    setIsSaving(true);
    setActionMessage(null);
    try {
      const html = generateOfferHtml(params, results);
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const fileName = `AB_YAPI_Teklif_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `AB YAPI Müşteri Teklifi - ${params.projectAddress}`
      );
      setActionMessage({
        type: 'success',
        text: `Teklif belgesi Google Drive'a kaydedildi: ${res.name}`,
      });
      loadFiles();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Teklif belgesi kaydedilemedi.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContractReport = async () => {
    setIsSaving(true);
    setActionMessage(null);
    try {
      const html = generateContractHtml(params, results);
      const safeAddr = params.projectAddress.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]/g, '_').slice(0, 25);
      const fileName = `AB_YAPI_Sozlesme_${safeAddr}_${new Date().toISOString().slice(0, 10)}.html`;
      const res = await saveReportDocumentToDrive(
        fileName,
        html,
        `AB YAPI Resmi İnşaat Sözleşmesi - ${params.projectAddress}`
      );
      setActionMessage({
        type: 'success',
        text: `Sözleşme belgesi Google Drive'a kaydedildi: ${res.name}`,
      });
      loadFiles();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Sözleşme kaydedilemedi.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFile = async (file: DriveProjectFile) => {
    setIsLoadingFiles(true);
    setActionMessage(null);
    try {
      const data = await loadProjectFromDrive(file.id);
      if (data && data.params) {
        onLoadProject(data);
        setActionMessage({
          type: 'success',
          text: `"${file.name}" projesi yüklendi ve hesaplama güncellendi!`,
        });
      } else {
        throw new Error('Dosya geçerli bir AB YAPI proje formatında değil.');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Proje yüklenemedi.' });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="drive-panel-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        id="drive-panel-modal"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">
                Google Drive Entegrasyon Merkezi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                AB YAPI Projelerini, Teklif ve Sözleşmelerini Drive Bulutunda Yönetin
              </p>
            </div>
          </div>
          <button
            id="drive-panel-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notification banner if any */}
          {actionMessage && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 border ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-300 border-red-500/30'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Auth State Card */}
          {!hasToken || !user ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-3">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                Google Drive Hesabınızı Bağlayın
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                Hesapladığınız inşaat projelerini, hak sahipleri ödeme takvimlerini ve resmi sözleşme belgelerini Google Drive'ınızda güvenle yedekleyin.
              </p>

              {/* Official Google Sign-in Button */}
              <div className="flex justify-center">
                <button
                  id="google-signin-btn"
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isSigningIn ? 'Bağlanıyor...' : 'Google ile Giriş Yap'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profil'}
                    className="w-10 h-10 rounded-2xl border border-emerald-300 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">
                      {user.displayName || 'Google Kullanıcısı'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Drive Bağlı
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              </div>
              <button
                id="drive-logout-btn"
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-red-600 font-medium px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          )}

          {/* Action Cards when authenticated */}
          {hasToken && (
            <>
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Aktif Projeyi Google Drive'a Kaydet
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tüm metrajlar, kat malikleri, hakediş oranları ve birim fiyatlar "AB YAPI Projeleri" klasörüne kaydedilir.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Dosya adı (isteğe bağlı, boş bırakılırsa otomatik adlandırılır)"
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    id="save-current-json-btn"
                    type="button"
                    onClick={handleSaveJson}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 shrink-0 active:scale-95"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isSaving ? 'Kaydediliyor...' : "Projeyi Drive'a Kaydet"}</span>
                  </button>
                </div>

                {/* Quick Export Documents */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                  <button
                    id="save-offer-doc-btn"
                    type="button"
                    onClick={handleSaveOfferReport}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition-all active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Teklif Belgesini Drive'a Aktar</span>
                  </button>
                  <button
                    id="save-contract-doc-btn"
                    type="button"
                    onClick={handleSaveContractReport}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition-all active:scale-95"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
                    <span>Sözleşme Belgesini Drive'a Aktar</span>
                  </button>
                </div>
              </div>

              {/* Saved Files List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Drive'daki AB YAPI Dosyalarınız ({driveFiles.length})
                    </h3>
                  </div>
                  <button
                    id="refresh-drive-files-btn"
                    type="button"
                    onClick={loadFiles}
                    disabled={isLoadingFiles}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    <span>Yenile</span>
                  </button>
                </div>

                {isLoadingFiles ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Google Drive dosyaları listeleniyor...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-8 text-center rounded-3xl border border-dashed border-slate-300 text-xs text-slate-500">
                    <p>Henüz Google Drive'da kayıtlı bir AB YAPI dosyası bulunamadı.</p>
                    <p className="mt-1 text-slate-400">
                      Yukarıdaki "Projeyi Drive'a Kaydet" butonunu kullanarak ilk yedeğinizi oluşturun.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {driveFiles.map((file) => {
                      const isJson = file.name.endsWith('.json') || file.mimeType === 'application/json';
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs"
                        >
                          <div className="flex items-center gap-3 overflow-hidden mr-2">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                              {isJson ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-slate-900 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('tr-TR') : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isJson && (
                              <button
                                type="button"
                                onClick={() => handleLoadFile(file)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium rounded-lg flex items-center gap-1 transition-all active:scale-95"
                                title="Projeyi Hesaplayıcıya Yükle"
                              >
                                <Download className="w-3 h-3" />
                                <span className="hidden sm:inline">Yükle</span>
                              </button>
                            )}

                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Google Drive'da Aç"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => onRequestDeleteConfirm(file)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Google Drive'dan Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
