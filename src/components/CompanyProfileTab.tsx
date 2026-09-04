import React, { useState, useRef } from 'react';
import { Building, Upload, Trash2, Save, AlertCircle } from 'lucide-react';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { AppTheme } from '../types';

interface CompanyProfileTabProps {
  theme?: AppTheme;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({ theme = 'light' }) => {
  const { profile, updateProfile, setLogo, removeLogo } = useCompanyProfile();
  const [formData, setFormData] = useState(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    updateProfile(formData);
    alert('Firma bilgileri güncellendi.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
        setFormData((prev) => ({ ...prev, logoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Building className="w-8 h-8 text-indigo-600" />
        <h2 className="text-2xl font-bold text-slate-900">Firma Profili</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50">
              {formData.logoBase64 ? (
                <img src={formData.logoBase64} alt="Firma Logosu" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-slate-400 text-xs text-center p-2">Logo Yok</span>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
              >
                <Upload className="w-4 h-4" /> Yükle
              </button>
              {formData.logoBase64 && (
                <button
                  onClick={removeLogo}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition"
                >
                  <Trash2 className="w-4 h-4" /> Kaldır
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Firma Adı</label>
            <input
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Slogan</label>
            <input
              name="slogan"
              value={formData.slogan}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Telefon</label>
          <input name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">E-posta</label>
          <input name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Firma Adresi</label>
        <textarea
          name="address"
          value={formData.address || ''}
          onChange={handleInputChange}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Firma adresi..."
        />
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
      >
        <Save className="w-4 h-4" /> Kaydet
      </button>
    </div>
  );
};
