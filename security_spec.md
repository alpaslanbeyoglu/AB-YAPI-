# Firestore Security Specification (Payload-First TDD)

## 1. Veri Değişmezleri (Data Invariants)

1. **Kimlik ve Doğrulama Kapısı (Zero-Anonymous / Verified Email)**:
   - Anonim (`sign_in_provider == 'anonymous'`) veya e-postası doğrulanmamış (`email_verified != true`) hiçbir istemci herhangi bir koleksiyona okuma veya yazma yapamaz.
   - Yönetici (`isAdmin()`) yetkisi yalnızca sunucu tarafından imzalanmış Firebase ID Token Custom Claim (`admin: true` veya `role: 'admin'`) üzerinden doğrulanır; istemci e-posta dizesi veya `localStorage` asla yetki kaynağı değildir.
2. **Lisans İzolasyonu (`/licenses/{email}`)**:
   - Normal doğrulanmış kullanıcı yalnızca kendi doğrulanmış e-posta adresine eşit belgeyi tekil olarak (`get`) okuyabilir.
   - Hiçbir normal kullanıcı `/licenses` koleksiyonunu listeleyemez (`list`), oluşturamaz, güncelleyemez veya silemez.
   - `createdAt` ve `email` alanları güncelleme sırasında değiştirilemez (Immortal Fields).
3. **Kullanıcı Veri & T.C. Kimlik Numarası İzolasyonu (`/users/{userId}/...`)**:
   - `/users/{userId}/projects/{projectId}`, `/users/{userId}/companyProfiles/{profileId}` ve `/users/{userId}/settings/activeState` yollarına yalnızca `request.auth.uid == userId` olan doğrulanmış sahip erişebilir.
   - T.C. kimlik numaraları (`params.flats[].tc`, `results.flatResults[].tc`), vergi numarası ve IBAN içeren dokümanlara başka kullanıcılar (ve hatta başka yönetici hesapları) erişemez.
   - `buildingModelParams` alanı `ProjectSnapshot` ve `ActiveState` (`buildingModel`) içinde şema kontrollü olarak desteklenir.
4. **Belge Kimliği ve Hacim Koruması (Anti-ID-Poisoning & DoW)**:
   - Tüm `projectId` ve `profileId` yol değişkenleri `^[a-zA-Z0-9_\-]+$` desenine uymalı ve `<= 128` karakter olmalıdır.
   - Her string alanı katı `.size()` sınırına tabidir; `hasAll` ve `hasOnly` anahtar kontrolü dışındaki "hayalet alanlar" (shadow fields) reddedilir.
5. **Varsayılan Reddetme (Global Safety Net)**:
   - Tanımlı olmayan her yol (`/{document=**}`) varsayılan olarak tüm okuma ve yazmalara kapalıdır.

---

## 2. "Dirty Dozen" Saldırı Yükleri (Adversarial Payloads)

Her aşağıdaki senaryo `PERMISSION_DENIED` döndürmelidir:

1. **Anonim Oturumla Proje Okuma/Yazma**: `sign_in_provider: 'anonymous'` token ile `/users/anon1/projects/p1` yazma denemesi.
2. **Doğrulanmamış E-posta (Email Spoofing)**: `email: 'alpaslan.beyoglu@gmail.com'`, `email_verified: false` token ile `/licenses/alpaslan.beyoglu@gmail.com` veya `/licenses` okuma denemesi.
3. **Custom Claim Olmadan Yönetici E-postasıyla Lisans Listeleme**: `email: 'alpaslan.beyoglu@gmail.com'`, `email_verified: true` fakat `admin` claim YOKKEN `/licenses` `list` veya `create` denemesi.
4. **Kendi Kendine Lisans Uzatma (Privilege Escalation)**: Doğrulanmış normal kullanıcı (`user@firma.com`) kendi `/licenses/user@firma.com` belgesinde `expiresAt` veya `status` güncelleme denemesi.
5. **Başka Müşterinin Lisansını Okuma**: `user1@firma.com` kimliğiyle `/licenses/user2@firma.com` `get` denemesi.
6. **Çapraz Kullanıcı T.C. Kimlik / Proje Sızıntısı**: `uid_B` kimliğiyle `/users/uid_A/projects/p1` `get` veya `list` denemesi.
7. **Yönetici Hesabıyla Başka Kullanıcının Özel Projesini Okuma**: `admin: true` claim ile `/users/uid_A/projects/p1` `get` denemesi (PII izolasyonu).
8. **Shadow / Ghost Field Enjeksiyonu**: Geçerli sahip tarafından `/users/uid_A/projects/p1` belgesine tanımsız `isAdminOverride: true` alanı ekleme denemesi.
9. **Path Variable / ID Poisoning**: `/users/uid_A/projects/` içine 200 karakterlik veya özel karakterli ID + eşleşmeyen `data.id` ile yazma denemesi.
10. **Lisans Güncellemede Immortal Field (`createdAt` / `email`) Değiştirme**: Yönetici tarafından var olan `/licenses/musteri@firma.com` belgesinde `createdAt` alanını değiştirme denemesi.
11. **Yetkisiz Alt Koleksiyon / Ayar Belgesi Oluşturma**: Sahip tarafından `/users/uid_A/settings/arbitraryDoc` veya `/users/uid_A/backdoor/x` yazma denemesi.
12. **Dev Base64 / DoW Yükü Enjeksiyonu**: Şirket profilinde 800KB sınırını aşan `logoBase64` yazma denemesi.
