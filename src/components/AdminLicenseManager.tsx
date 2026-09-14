import React, { useState, useEffect } from 'react';
import { useFirebaseSync, LicenseInfo } from '../context/FirebaseSyncContext';
import { 
  ShieldCheck, 
  UserPlus, 
  Calendar, 
  Trash2, 
  UserCheck, 
  UserMinus, 
  Search, 
  Plus, 
  X, 
  Clock, 
  Building2, 
  AlertCircle 
} from 'lucide-react';

export const AdminLicenseManager: React.FC = () => {
  const { 
    getAllLicenses, 
    createOrUpdateLicense, 
    deleteLicense, 
    isAdmin 
  } = useFirebaseSync();

  const [licenses, setLicenses] = useState<LicenseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create / Edit Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [expiresAt, setExpiresAt] = useState('');

  // Fetch licenses on mount
  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const data = await getAllLicenses();
      // Sort licenses: newer created ones first
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLicenses(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Lisanslar yüklenirken bir hata oluştu. Firebase kurallarınızı veya bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLicenses();
    }
  }, [isAdmin]);

  // Set default expiration date (e.g., 1 year from now) in form
  const handleOpenAddModal = () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    // Format to yyyy-MM-dd
    const formattedDate = oneYearFromNow.toISOString().split('T')[0];
    
    setEmail('');
    setName('');
    setCompany('');
    setStatus('active');
    setExpiresAt(formattedDate);
    setShowAddModal(true);
  };

  const handleSaveLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !expiresAt) return;

    try {
      const isoExpiresAt = new Date(expiresAt).toISOString();
      const newLicense: LicenseInfo = {
        email: email.toLowerCase().trim(),
        name: name.trim() || undefined,
        company: company.trim() || undefined,
        status,
        expiresAt: isoExpiresAt,
        createdAt: new Date().toISOString()
      };

      await createOrUpdateLicense(newLicense);
      setShowAddModal(false);
      await fetchLicenses();
    } catch (err) {
      console.error(err);
      alert('Lisans kaydedilirken bir hata oluştu.');
    }
  };

  const handleToggleStatus = async (license: LicenseInfo) => {
    try {
      const updated: LicenseInfo = {
        ...license,
        status: license.status === 'active' ? 'suspended' : 'active'
      };
      await createOrUpdateLicense(updated);
      await fetchLicenses();
    } catch (err) {
      console.error(err);
      alert('Durum güncellenirken bir hata oluştu.');
    }
  };

  const handleDeleteLicense = async (emailToDelete: string) => {
    if (!window.confirm(`${emailToDelete} e-postalı lisansı tamamen silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await deleteLicense(emailToDelete);
      await fetchLicenses();
    } catch (err) {
      console.error(err);
      alert('Lisans silinirken bir hata oluştu.');
    }
  };

  // Filter licenses based on search query
  const filteredLicenses = licenses.filter(lic => {
    const query = searchQuery.toLowerCase();
    return (
      lic.email.toLowerCase().includes(query) ||
      (lic.name && lic.name.toLowerCase().includes(query)) ||
      (lic.company && lic.company.toLowerCase().includes(query))
    );
  });

  if (!isAdmin) {
    return (
      <div className="p-6 text-center max-w-lg mx-auto bg-red-50 border border-red-100 rounded-2xl my-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Yönetici Girişi Gerekli</h3>
        <p className="text-sm text-slate-600">
          Bu yönetim paneline yalnızca yetkili yönetici hesabı giriş yapabilir.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Müşteri Lisans & Erişim Paneli</h2>
          </div>
          <p className="text-sm text-slate-500">
            Platformu sattığınız müşterilere süre kısıtlı lisanslar tanımlayın ve yetkilerini yönetin.
          </p>
        </div>
        
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Yeni Lisans Tanımla
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="E-posta, isim veya firma adı ile lisans ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
        />
      </div>

      {/* Licenses Table / List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium">Lisans listesi güncelleniyor...</p>
        </div>
      ) : filteredLicenses.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Herhangi bir lisans bulunamadı</p>
          <p className="text-xs text-slate-400 mt-1">Aramayı değiştirebilir veya yeni bir lisans tanımlayabilirsiniz.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <div className="inline-block min-w-full align-middle px-6">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-left bg-slate-50/50 rounded-lg">
                  <th className="py-3 px-4">Kullanıcı Bilgileri</th>
                  <th className="py-3 px-4">Firma</th>
                  <th className="py-3 px-4">Bitiş Tarihi</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLicenses.map((lic) => {
                  const isExpired = new Date(lic.expiresAt) < new Date();
                  const isSuspended = lic.status === 'suspended';
                  
                  return (
                    <tr key={lic.email} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{lic.name || 'İsimsiz Kullanıcı'}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">{lic.email}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-300" />
                          <span>{lic.company || '-'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={`flex items-center gap-1.5 font-medium ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(lic.expiresAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          {isExpired && <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">Süresi Doldu</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(lic)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            isSuspended 
                              ? 'bg-rose-50 border-rose-100 text-rose-600' 
                              : isExpired 
                              ? 'bg-amber-50 border-amber-100 text-amber-600'
                              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}
                          title="Durumu tersine çevirmek için tıklayın"
                        >
                          {isSuspended ? (
                            <>
                              <UserMinus className="h-3 w-3" />
                              <span>Pasif / Askıda</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3" />
                              <span>Aktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEmail(lic.email);
                              setName(lic.name || '');
                              setCompany(lic.company || '');
                              setStatus(lic.status);
                              setExpiresAt(new Date(lic.expiresAt).toISOString().split('T')[0]);
                              setShowAddModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                            title="Lisansı Düzenle"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLicense(lic.email)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Lisansı Tamamen Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit License Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs z-50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Lisans Ekle / Düzenle</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLicense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Müşteri E-Posta Adresi *</label>
                <input
                  type="email"
                  required
                  placeholder="ornek@firma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Müşteri Adı Soyadı</label>
                <input
                  type="text"
                  placeholder="Ahmet Yılmaz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Firma Adı</label>
                <input
                  type="text"
                  placeholder="Yılmaz İnşaat Ltd. Şti."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Lisans Durumu</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all text-slate-800"
                  >
                    <option value="active">Aktif</option>
                    <option value="suspended">Pasif / Askıda</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Lisans Bitiş Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  Lisansı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
