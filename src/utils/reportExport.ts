import { ProjectParams, CalculationResult } from '../types';

export function generateOfferHtml(params: ProjectParams, res: CalculationResult): string {
  const supportText =
    params.transformationStatus === 'currentSupport'
      ? '2025/2026 Mevcut Model (875 Bin TL Hibe + 875 Bin TL Kredi)'
      : params.transformationStatus === 'futureSupport2027'
      ? '2027 Projeksiyon Modeli (3 Milyon TL Kredi / 180 Ay Vade)'
      : 'Desteksiz / Öz Kaynaklı Yapım';

  const flatRows = res.flatResults
    .map(
      (f) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Daire ${f.id}</td>
        <td style="padding:8px;border:1px solid #ddd;">${f.name} <br><small style="color:#666;">TC: ${f.tc}</small></td>
        <td style="padding:8px;border:1px solid #ddd;">${f.area} m²</td>
        <td style="padding:8px;border:1px solid #ddd;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;">-${f.downPayment.toLocaleString('tr-TR')} TL</td>
        <td style="padding:8px;border:1px solid #ddd;">${f.usedCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
      </tr>`
    )
    .join('');

  const stageRows = res.flatResults
    .map(
      (f) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Daire ${f.id} (${f.name})</td>
        <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[0].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[1].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[2].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.stagePayments[3].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;">${f.stagePayments[4].toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>AB YAPI - Teklif ve Ödeme Planı</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #333; max-width: 1000px; margin: 0 auto; }
    h2, h3, h4 { color: #1f7a7a; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
    th { background: #37474f; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; }
    .box { background: #f8f9fa; border-left: 4px solid #1f7a7a; padding: 15px; margin-bottom: 20px; font-size: 13px; }
  </style>
</head>
<body>
  <div style="text-align:center;border-bottom:2px solid #1f7a7a;padding-bottom:15px;margin-bottom:20px;">
    <h2 style="margin:0;color:#37474f;">AB YAPI İNŞAAT TEKLİF VE ÖDEME PLANLAMA METNİ</h2>
    <p style="margin:5px 0 0 0;font-size:12px;color:#556068;">Güvene Yükselen Yapılar - Resmi Müşteri Bilgilendirme Formu</p>
  </div>
  <div class="box">
    <h4>📍 Yapı & Proje Genel Bilgileri</h4>
    <p><strong>Yapı Adresi:</strong> ${params.projectAddress}</p>
    <p><strong>Bina Oturumu:</strong> ${res.baseArea} m² | <strong>Toplam İnşaat Alanı:</strong> ${res.totalArea} m² | <strong>Daire Sayısı:</strong> ${res.flatCount} Adet</p>
    <p><strong>Birim İmalat Fiyatı:</strong> ${res.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m² (${res.grossUsdPerSqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD/m²)</p>
    ${
      params.durationOption !== 'hide'
        ? `<p><strong>Tahmini Proje ve Teslim Süresi:</strong> ${res.finalMonths} Ay</p>`
        : ''
    }
    <p><strong>Kentsel Dönüşüm Destek Modeli:</strong> ${supportText}</p>
  </div>
  <h3>1. Hak Sahipleri Ödeme ve Borçlandırma Özeti</h3>
  <table>
    <thead>
      <tr>
        <th>Daire No</th><th>Hak Sahibi</th><th>Alan</th><th>Toplam Borç</th><th>Ödenen Peşinat</th><th>Dönüşüm Desteği</th><th>Kalan Borç</th>
      </tr>
    </thead>
    <tbody>${flatRows}</tbody>
  </table>
  <h3>2. Fiziki İlerleme Hakediş Takvimi (TL)</h3>
  <table>
    <thead>
      <tr>
        <th>Daire No / Hak Sahibi</th>
        <th>1. Aşama (%${params.stage1Pay})</th>
        <th>2. Aşama (%${params.stage2Pay})</th>
        <th>3. Aşama (%${params.stage3Pay})</th>
        <th>4. Aşama (%${params.stage4Pay} + Destek)</th>
        <th>5. Aşama (%${params.stage5Pay})</th>
        <th>Toplam Borç</th>
      </tr>
    </thead>
    <tbody>${stageRows}</tbody>
  </table>
  <div style="background:#fff8e6;border:1px solid #ffeeba;border-radius:6px;padding:12px;margin-top:20px;font-size:12px;color:#856404;line-height:1.5;">
    <strong>📌 Önemli Bilgilendirme ve Teslim Koşulları:</strong>
    <p style="margin:4px 0 0 0;">Yukarıda belirtilen proje süresine ruhsat alma ve iskân süreçleri dahildir. Firmamız kontrolü dışındaki gecikmeler proje süresine eklenir.</p>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px;">
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:40px;">MÜŞTERİ / KAT MALİKİ İMZA</p>
      <p>.... / .... / 2026</p>
    </div>
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:40px;">AB YAPI MÜTEAHHİTLİK İMZA / KAŞE</p>
      <p>.... / .... / 2026</p>
    </div>
  </div>
</body>
</html>`;
}

export function generateContractHtml(params: ProjectParams, res: CalculationResult): string {
  const contractTitle =
    params.projectModel === 'contractorShare'
      ? 'ARSA PAYI KARŞILIĞI İNŞAAT VE GAYRİMENKUL SATIŞ VAADİ SÖZLEŞMESİ'
      : params.transformationStatus !== 'none'
      ? '6306 SAYILI KANUN KAPSAMINDA KENTSEL DÖNÜŞÜM BİNA YAPIM SÖZLEŞMESİ'
      : 'ÖZ KAYNAKLI BİNA YAPIM VE TAAHHÜT SÖZLEŞMESİ';

  const flatRows = res.flatResults
    .map(
      (f) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Daire ${f.id}</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.name}</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.tc}</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.area} m²</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.grossPay.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
      <td style="padding:8px;border:1px solid #ddd;">${f.downPayment.toLocaleString('tr-TR')} TL</td>
      <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${f.netRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${contractTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #111; max-width: 1000px; margin: 0 auto; line-height: 1.7; font-size: 13px; }
    h2 { color: #37474f; text-align: center; font-size: 18px; margin-bottom: 5px; }
    h3 { color: #1f7a7a; border-bottom: 2px solid #1f7a7a; padding-bottom: 4px; margin-top: 25px; font-size: 14px; text-transform: uppercase; }
    h4 { color: #37474f; margin-top: 15px; margin-bottom: 5px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #37474f; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; }
  </style>
</head>
<body>
  <div style="text-align:center;border-bottom:2px solid #1f7a7a;padding-bottom:12px;margin-bottom:20px;">
    <h2>${contractTitle}</h2>
    <p style="margin:0;font-size:11px;color:#556068;">Düzenleme Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Belge No: AB-YAPI-2026/SÖZ-01</p>
  </div>
  <h3>BÖLÜM I: TARAFLAR VE PROJE TANIMI</h3>
  <h4>MADDE 1: TARAFLAR</h4>
  <p><strong>1. YÜKLENİCİ:</strong> AB YAPI MÜTEAHHİTLİK LİMİTED ŞİRKETİ (Fatih Kocamustafapaşa Mah. İstanbul)<br>
  <strong>2. İŞ SAHİBİ / KAT MALİKLERİ:</strong> Ek-1 Hak Sahipleri Listesinde isim ve TC kimlikleri bulunan taşınmaz malikleri.</p>
  <h4>MADDE 2: SÖZLEŞME KONUSU VE GAYRİMENKUL</h4>
  <p>Tapuda <strong>${params.projectAddress}</strong> adresinde kayıtlı taşınmazın yıkılarak yerine taban oturumu <strong>${res.baseArea} m²</strong>, toplam brüt inşaat alanı <strong>${res.totalArea} m²</strong> olan ve toplam <strong>${res.flatCount} adet bağımsız bölümden</strong> oluşan yeni binanın yapılmasıdır.</p>
  <h3>BÖLÜM II: MALİ HÜKÜMLER VE HAKEDİŞLER</h3>
  <h4>MADDE 3: PROJE İMALAT BEDELİ</h4>
  <p>Birim imalat fiyatı <strong>${res.grossCostPerSqM.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/m²</strong>, toplam bedel <strong>${res.grandTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong> olarak belirlenmiştir.</p>
  <h4>MADDE 4: DİNAMİK FİZİKİ İLERLEME HAKEDİŞ ORANLARI</h4>
  <ul>
    <li>1. Hakediş (%${params.stage1Pay}): Sözleşme imzası ve ruhsat projelerinin hazırlanması.</li>
    <li>2. Hakediş (%${params.stage2Pay}): Hafriyat ve radye temel / subasman seviyesi betonarme vizesi.</li>
    <li>3. Hakediş (%${params.stage3Pay}): Kaba inşaat ve tuğla duvarların tamamlanması.</li>
    <li>4. Hakediş (%${params.stage4Pay}): İnce inşaat, tesisatlar ve cephe mantolama (Varsa kentsel dönüşüm kredi/hibe aktarımı bu aşamada gerçekleşir).</li>
    <li>5. Hakediş (%${params.stage5Pay}): İskân belgesinin alınması ve anahtar teslimi.</li>
  </ul>
  <h3>BÖLÜM III: SÜRE VE İŞ GÜVENLİĞİ</h3>
  <p>Proje ve inşaat süresi <strong>${res.finalMonths} Ay</strong> olarak kararlaştırılmıştır. Mücbir sebepler ve kurum onay gecikmeleri süreye ilave edilir.</p>
  <h3>BÖLÜM IV: GARANTİ SÜRELERİ (TBK m. 478)</h3>
  <ul>
    <li>Ağır Kusur ve Gizli Ayıplar (Taşıyıcı Sistem): 20 Yıl Garanti.</li>
    <li>Açık Ayıplar ve İmalat Kusurları: 5 Yıl Garanti.</li>
    <li>Mekanik & Elektrik Donanım, Cihazlar: 2 Yıl Garanti.</li>
  </ul>
  <h3>BÖLÜM V: EK-1 HAK SAHİPLERİ VE BAĞIMSIZ BÖLÜM DAĞILIMI</h3>
  <table>
    <thead>
      <tr><th>Daire No</th><th>Hak Sahibi</th><th>T.C. No</th><th>Alan</th><th>Toplam Bedel</th><th>Peşinat</th><th>Kalan Borç</th></tr>
    </thead>
    <tbody>${flatRows}</tbody>
  </table>
  <div style="display:flex;justify-content:space-between;margin-top:50px;font-size:13px;">
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:50px;">ARSA SAHİPLERİ / KAT MALİKLERİ</p>
      <p>.... / .... / 2026</p>
    </div>
    <div style="text-align:center;">
      <p style="font-weight:bold;margin-bottom:50px;">YÜKLENİCİ (AB YAPI MÜTEAHHİTLİK)</p>
      <p>.... / .... / 2026</p>
    </div>
  </div>
</body>
</html>`;
}
