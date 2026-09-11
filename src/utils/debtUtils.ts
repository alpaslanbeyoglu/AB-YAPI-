/**
 * Borç Hesaplama Yardımcı Fonksiyonları
 * 
 * Temel Formül: 
 * Borç = (Brüt Alan * Birim Fiyat) - (Peşinat + Kredi + Hibe)
 */

interface DebtCalculationParams {
  area: number;
  unitPrice: number;
  downPayment: number;
  grant: number;
  credit: number;
  isContractorShare?: boolean;
  extraCosts?: number; // Eşit dağıtılan ek maliyetler (örn: proje bedeli payı)
}

interface DebtCalculationResult {
  grossPay: number;       // Brüt İmalat Bedeli
  totalDeductions: number; // Toplam İndirimler (Peşinat + Hibe + Kredi)
  netRemainingDebt: number; // Kalan Net Borç
}

/**
 * Bağımsız bölüm için net borç hesaplaması yapar.
 */
export const calculateNetDebt = (params: DebtCalculationParams): DebtCalculationResult & { 
  usedGrant: number; 
  usedCredit: number; 
  usedDownPayment: number;
} => {
  const { 
    area, 
    unitPrice, 
    downPayment, 
    grant, 
    credit, 
    isContractorShare = false,
    extraCosts = 0 
  } = params;

  // 1. İmalat Bedeli (Brüt Alan * Birim Fiyat + Ek Maliyetler)
  const grossPay = Math.round(area * unitPrice + extraCosts);

  // Müteahhit dairesi ise borç oluşmaz
  if (isContractorShare) {
    return {
      grossPay,
      totalDeductions: 0,
      netRemainingDebt: 0,
      usedGrant: 0,
      usedCredit: 0,
      usedDownPayment: 0
    };
  }

  // SIRALI DÜŞÜM MANTIĞI:
  // 1. Peşinat
  const usedDownPayment = Math.min(grossPay, downPayment);
  const remainingAfterDown = Math.max(0, grossPay - usedDownPayment);

  // 2. Hibe
  const usedGrant = Math.min(remainingAfterDown, grant);
  const remainingAfterGrant = Math.max(0, remainingAfterDown - usedGrant);

  // 3. Kredi
  const usedCredit = Math.min(remainingAfterGrant, credit);
  const netRemainingDebt = Math.max(0, remainingAfterGrant - usedCredit);

  return {
    grossPay,
    totalDeductions: usedDownPayment + usedGrant + usedCredit,
    netRemainingDebt,
    usedGrant,
    usedCredit,
    usedDownPayment
  };
};
