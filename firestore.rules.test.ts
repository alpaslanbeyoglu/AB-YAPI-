/**
 * Firestore Security Rules Emulator Test Suite (Vitest + @firebase/rules-unit-testing)
 *
 * Local execution on a workstation with Java 21+ JRE installed:
 *   npm run test:rules
 * or:
 *   firebase emulators:exec --only firestore --project demo-ab-yapi-rules "npx vitest run firestore.rules.test.ts"
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const VALID_PROJECT = (id: string) => ({
  id,
  version: '1.0.0',
  savedAt: '2026-11-21T10:00:00.000Z',
  updatedAt: '2026-11-21T10:00:00.000Z',
  projectAddress: 'Şişli Merkez Mah. No:12',
  params: {
    projectAddress: 'Şişli Merkez Mah. No:12',
    flats: [{ id: 1, name: 'Malik 1', tc: '12345678901', area: 100 }],
  },
  results: { totalArea: 1000, grandTotal: 25000000 },
  buildingModelParams: { floorCount: 5, facadeWidth: 14 },
  construction: null,
});

const VALID_PROFILE = (overrides: Record<string, unknown> = {}) => ({
  companyName: 'AB YAPI',
  legalName: 'AB YAPI MÜTEAHHİTLİK TİC. LTD. ŞTİ.',
  taxNumber: '0010523491',
  iban: 'TR420001000212345678905001',
  updatedAt: '2026-11-21T10:00:00.000Z',
  ...overrides,
});

const VALID_ACTIVE_STATE = (overrides: Record<string, unknown> = {}) => ({
  params: { projectAddress: 'Şişli Merkez Mah. No:12' },
  buildingModel: { floorCount: 5 },
  uiState: { activeTab: 'kurulum' },
  updatedAt: '2026-11-21T10:00:00.000Z',
  ...overrides,
});

const VALID_LICENSE = (email: string, overrides: Record<string, unknown> = {}) => ({
  email,
  status: 'active',
  expiresAt: '2027-12-31T23:59:59.000Z',
  createdAt: '2026-11-21T09:00:00.000Z',
  name: 'Test Müşteri',
  company: 'Test İnşaat',
  ...overrides,
});

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    const [host, portStr] = emulatorHost ? emulatorHost.split(':') : ['127.0.0.1', '8080'];

    testEnv = await initializeTestEnvironment({
      projectId: 'demo-ab-yapi-rules',
      firestore: {
        rules,
        host,
        port: Number(portStr) || 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'licenses', 'user_a@firma.com'), VALID_LICENSE('user_a@firma.com'));
      await setDoc(doc(db, 'licenses', 'user_b@firma.com'), VALID_LICENSE('user_b@firma.com'));
      await setDoc(
        doc(db, 'users', 'uid_a', 'projects', 'sisli_12345678'),
        VALID_PROJECT('sisli_12345678')
      );
      await setDoc(
        doc(db, 'users', 'uid_a', 'companyProfiles', 'ab_yapi_12345678'),
        VALID_PROFILE()
      );
      await setDoc(
        doc(db, 'users', 'uid_a', 'settings', 'activeState'),
        VALID_ACTIVE_STATE()
      );
    });
  });

  it('1. Giriş yapmamış, anonim ve e-postası doğrulanmamış kullanıcılar hiçbir özel veriye erişemez', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const anonDb = testEnv
      .authenticatedContext('anon_1', { firebase: { sign_in_provider: 'anonymous' } })
      .firestore();
    const unverifiedDb = testEnv
      .authenticatedContext('spoof_1', {
        email: 'alpaslan.beyoglu@gmail.com',
        email_verified: false,
        firebase: { sign_in_provider: 'password' },
      })
      .firestore();

    await assertFails(getDoc(doc(unauthDb, 'licenses/user_a@firma.com')));
    await assertFails(getDoc(doc(unauthDb, 'users/uid_a/projects/sisli_12345678')));
    await assertFails(getDoc(doc(unauthDb, 'users/uid_a/companyProfiles/ab_yapi_12345678')));
    await assertFails(getDoc(doc(unauthDb, 'users/uid_a/settings/activeState')));
    await assertFails(setDoc(doc(unauthDb, 'users/uid_a/projects/p_x'), VALID_PROJECT('p_x')));
    await assertFails(getDoc(doc(unauthDb, 'test/connection')));

    await assertFails(setDoc(doc(anonDb, 'users/anon_1/projects/p1'), VALID_PROJECT('p1')));
    await assertFails(getDoc(doc(anonDb, 'licenses/user_a@firma.com')));

    await assertFails(getDoc(doc(unverifiedDb, 'licenses/alpaslan.beyoglu@gmail.com')));
    await assertFails(getDocs(collection(unverifiedDb, 'licenses')));
  });

  it('2. Normal kullanıcı kendi projelerini, profilini, aktif durumunu ve kendi lisansını okuyup yazabilir', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertSucceeds(getDoc(doc(userADb, 'licenses/user_a@firma.com')));
    await assertSucceeds(getDoc(doc(userADb, 'users/uid_a/projects/sisli_12345678')));
    await assertSucceeds(getDocs(collection(userADb, 'users/uid_a/projects')));
    await assertSucceeds(
      setDoc(doc(userADb, 'users/uid_a/projects/cigli_99999999'), VALID_PROJECT('cigli_99999999'))
    );
    await assertSucceeds(
      updateDoc(doc(userADb, 'users/uid_a/projects/sisli_12345678'), {
        updatedAt: '2026-11-21T12:00:00.000Z',
      })
    );
    await assertSucceeds(deleteDoc(doc(userADb, 'users/uid_a/projects/cigli_99999999')));
    await assertSucceeds(getDoc(doc(userADb, 'users/uid_a/companyProfiles/ab_yapi_12345678')));
    await assertSucceeds(
      setDoc(doc(userADb, 'users/uid_a/companyProfiles/prof_valid'), VALID_PROFILE())
    );
    await assertSucceeds(getDoc(doc(userADb, 'users/uid_a/settings/activeState')));
    await assertSucceeds(
      setDoc(doc(userADb, 'users/uid_a/settings/activeState'), VALID_ACTIVE_STATE())
    );
  });

  it('3. Başka kullanıcının projeleri (T.C. kimlik ve finansal veriler dahil) okunamaz ve değiştirilemez', async () => {
    const userBDb = testEnv
      .authenticatedContext('uid_b', {
        email: 'user_b@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    const adminDb = testEnv
      .authenticatedContext('admin_uid', {
        email: 'alpaslan.beyoglu@gmail.com',
        email_verified: true,
        admin: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(getDoc(doc(userBDb, 'users/uid_a/projects/sisli_12345678')));
    await assertFails(getDocs(collection(userBDb, 'users/uid_a/projects')));
    await assertFails(
      setDoc(doc(userBDb, 'users/uid_a/projects/sisli_12345678'), VALID_PROJECT('sisli_12345678'))
    );
    await assertFails(
      updateDoc(doc(userBDb, 'users/uid_a/projects/sisli_12345678'), {
        projectAddress: 'Ele Geçirildi',
      })
    );
    await assertFails(deleteDoc(doc(userBDb, 'users/uid_a/projects/sisli_12345678')));

    await assertFails(getDoc(doc(userBDb, 'users/uid_a/companyProfiles/ab_yapi_12345678')));
    await assertFails(getDocs(collection(userBDb, 'users/uid_a/companyProfiles')));
    await assertFails(getDoc(doc(userBDb, 'users/uid_a/settings/activeState')));

    // Even admin cannot read another user's T.C. kimlik or company financial PII
    await assertFails(getDoc(doc(adminDb, 'users/uid_a/projects/sisli_12345678')));
    await assertFails(getDoc(doc(adminDb, 'users/uid_a/companyProfiles/ab_yapi_12345678')));
  });

  it('4. Normal kullanıcı lisans listesini okuyamaz, başka lisansı göremez ve lisans oluşturamaz/silemez', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(getDocs(collection(userADb, 'licenses')));
    await assertFails(getDoc(doc(userADb, 'licenses/user_b@firma.com')));
    await assertFails(
      setDoc(doc(userADb, 'licenses/yeni@firma.com'), VALID_LICENSE('yeni@firma.com'))
    );
    await assertFails(
      updateDoc(doc(userADb, 'licenses/user_a@firma.com'), {
        expiresAt: '2099-01-01T00:00:00.000Z',
      })
    );
    await assertFails(deleteDoc(doc(userADb, 'licenses/user_b@firma.com')));
  });

  it('5. Admin Custom Claim sahibi kullanıcı lisans CRUD işlemlerini yapabilir', async () => {
    const adminDb = testEnv
      .authenticatedContext('admin_uid', {
        email: 'alpaslan.beyoglu@gmail.com',
        email_verified: true,
        admin: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    const roleAdminDb = testEnv
      .authenticatedContext('role_admin_uid', {
        email: 'alpaslan.beyoglu@gmail.com',
        email_verified: true,
        role: 'admin',
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertSucceeds(getDocs(collection(adminDb, 'licenses')));
    await assertSucceeds(
      setDoc(
        doc(adminDb, 'licenses/new_customer@firma.com'),
        VALID_LICENSE('new_customer@firma.com')
      )
    );
    await assertSucceeds(
      setDoc(
        doc(roleAdminDb, 'licenses/user_a@firma.com'),
        VALID_LICENSE('user_a@firma.com', { status: 'suspended' })
      )
    );
    await assertSucceeds(deleteDoc(doc(adminDb, 'licenses/new_customer@firma.com')));
  });

  it('6. Admin olmayan kullanıcı (yönetici e-postası dahil) kendisine admin yetkisi veremez', async () => {
    const noClaimAdminEmailDb = testEnv
      .authenticatedContext('no_claim_1', {
        email: 'alpaslan.beyoglu@gmail.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(getDocs(collection(noClaimAdminEmailDb, 'licenses')));
    await assertFails(
      setDoc(
        doc(noClaimAdminEmailDb, 'licenses/backdoor@firma.com'),
        VALID_LICENSE('backdoor@firma.com')
      )
    );
    await assertFails(setDoc(doc(userADb, 'users/uid_a'), { admin: true, role: 'admin' }));
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/p_esc'), {
        ...VALID_PROJECT('p_esc'),
        admin: true,
        role: 'admin',
      })
    );
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/settings/activeState'), {
        ...VALID_ACTIVE_STATE(),
        isAdmin: true,
      })
    );
  });

  it('7. Geçersiz belge alanları ve aşırı büyük belgeler (800.000+ karakter logo/kaşe) reddedilir', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    const adminDb = testEnv
      .authenticatedContext('admin_uid', {
        email: 'alpaslan.beyoglu@gmail.com',
        email_verified: true,
        admin: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    // Ghost field & mismatched ID in project
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/p_ghost'), {
        ...VALID_PROJECT('p_ghost'),
        isAdminOverride: true,
      })
    );
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/p_a'), VALID_PROJECT('p_other'))
    );
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/p_long'), {
        ...VALID_PROJECT('p_long'),
        projectAddress: 'A'.repeat(301),
      })
    );

    // Empty legalName & oversized (>800,000 chars) logoBase64 / stampBase64 rejected; <=800,000 succeeds
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/companyProfiles/prof_empty'), VALID_PROFILE({ legalName: '' }))
    );
    await assertFails(
      setDoc(
        doc(userADb, 'users/uid_a/companyProfiles/prof_big_logo'),
        VALID_PROFILE({ logoBase64: 'x'.repeat(800001) })
      )
    );
    await assertFails(
      setDoc(
        doc(userADb, 'users/uid_a/companyProfiles/prof_big_stamp'),
        VALID_PROFILE({ stampBase64: 'x'.repeat(800001) })
      )
    );
    await assertSucceeds(
      setDoc(
        doc(userADb, 'users/uid_a/companyProfiles/prof_ok_logo'),
        VALID_PROFILE({ logoBase64: 'x'.repeat(799999) })
      )
    );

    // Arbitrary settings doc & list blocked
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/settings/backdoor'), VALID_ACTIVE_STATE())
    );
    await assertFails(getDocs(collection(userADb, 'users/uid_a/settings')));

    // License validation: immutable createdAt, invalid status, uppercase email ID rejected
    await assertFails(
      setDoc(
        doc(adminDb, 'licenses/user_a@firma.com'),
        VALID_LICENSE('user_a@firma.com', { createdAt: '2030-01-01T00:00:00.000Z' })
      )
    );
    await assertFails(
      setDoc(
        doc(adminDb, 'licenses/bad_status@firma.com'),
        VALID_LICENSE('bad_status@firma.com', { status: 'unlimited' })
      )
    );
    await assertFails(
      setDoc(
        doc(adminDb, 'licenses/Upper@Firma.com'),
        VALID_LICENSE('Upper@Firma.com')
      )
    );
  });

  it('8. logoBase64 ve stampBase64 tekil olarak 800.000 karakterin altında olsa bile toplam belge boyutu 1 MiB sınırını aştığında INVALID_ARGUMENT ile reddedilir', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await expect(
      setDoc(
        doc(userADb, 'users/uid_a/companyProfiles/prof_combined_over_1mib'),
        VALID_PROFILE({
          logoBase64: 'x'.repeat(600000),
          stampBase64: 'x'.repeat(600000),
        })
      )
    ).rejects.toMatchObject({
      code: expect.stringMatching(/^invalid[-_]argument$/i),
      message: expect.stringMatching(/maximum|size|bytes|1,?048,?576|1\s*mib|exceeds|too\s*large/i),
    });
  });

  it('9. Normal kullanıcı kendi companyProfiles belgesini güncelleyebilir ve silebilir', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertSucceeds(
      updateDoc(doc(userADb, 'users/uid_a/companyProfiles/ab_yapi_12345678'), {
        slogan: 'Güvenli Kentsel Dönüşüm',
        updatedAt: '2026-11-21T13:00:00.000Z',
      })
    );
    await assertSucceeds(
      deleteDoc(doc(userADb, 'users/uid_a/companyProfiles/ab_yapi_12345678'))
    );
  });

  it('10. Başka kullanıcının companyProfiles ve settings/activeState belgelerine yazma ve silme girişimleri reddedilir', async () => {
    const userBDb = testEnv
      .authenticatedContext('uid_b', {
        email: 'user_b@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    const adminDb = testEnv
      .authenticatedContext('admin_uid', {
        email: 'alpaslan.beyoglu@gmail.com',
        email_verified: true,
        admin: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(
      setDoc(doc(userBDb, 'users/uid_a/companyProfiles/ab_yapi_12345678'), VALID_PROFILE())
    );
    await assertFails(
      setDoc(doc(userBDb, 'users/uid_a/companyProfiles/prof_hijack'), VALID_PROFILE())
    );
    await assertFails(
      updateDoc(doc(userBDb, 'users/uid_a/companyProfiles/ab_yapi_12345678'), {
        companyName: 'Ele Geçirildi',
      })
    );
    await assertFails(
      deleteDoc(doc(userBDb, 'users/uid_a/companyProfiles/ab_yapi_12345678'))
    );

    await assertFails(
      setDoc(doc(userBDb, 'users/uid_a/settings/activeState'), VALID_ACTIVE_STATE())
    );
    await assertFails(
      updateDoc(doc(userBDb, 'users/uid_a/settings/activeState'), {
        updatedAt: '2026-11-21T14:00:00.000Z',
      })
    );
    await assertFails(deleteDoc(doc(userBDb, 'users/uid_a/settings/activeState')));

    await assertFails(
      updateDoc(doc(adminDb, 'users/uid_a/companyProfiles/ab_yapi_12345678'), {
        companyName: 'Admin Müdahalesi',
      })
    );
    await assertFails(deleteDoc(doc(adminDb, 'users/uid_a/settings/activeState')));
  });

  it('11. email_verified: false olan kullanıcı kendi UID altındaki projeye dahi yazamaz', async () => {
    const unverifiedOwnerDb = testEnv
      .authenticatedContext('unverified_uid', {
        email: 'unverified@firma.com',
        email_verified: false,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(unverifiedOwnerDb, 'users/unverified_uid/projects/proj_unverified'),
        VALID_PROJECT('proj_unverified')
      )
    );
    await assertFails(
      setDoc(
        doc(unverifiedOwnerDb, 'users/unverified_uid/companyProfiles/prof_unverified'),
        VALID_PROFILE()
      )
    );
    await assertFails(
      setDoc(
        doc(unverifiedOwnerDb, 'users/unverified_uid/settings/activeState'),
        VALID_ACTIVE_STATE()
      )
    );
    await assertFails(
      getDoc(doc(unverifiedOwnerDb, 'users/unverified_uid/projects/proj_unverified'))
    );
  });

  it('12. companyName boş olduğunda belge yazma ve güncelleme reddedilir', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(
      setDoc(
        doc(userADb, 'users/uid_a/companyProfiles/prof_empty_company'),
        VALID_PROFILE({ companyName: '' })
      )
    );
    await assertFails(
      updateDoc(doc(userADb, 'users/uid_a/companyProfiles/ab_yapi_12345678'), {
        companyName: '',
      })
    );
  });

  it('13. Proje belgesinin id alanını değiştirmeye yönelik güncelleme reddedilir', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(
      updateDoc(doc(userADb, 'users/uid_a/projects/sisli_12345678'), {
        id: 'degistirilmis_id_999',
      })
    );
    await assertFails(
      setDoc(
        doc(userADb, 'users/uid_a/projects/sisli_12345678'),
        VALID_PROJECT('degistirilmis_id_999')
      )
    );
  });

  it("14. role: 'user' claim sahip kullanıcının admin yetkisi olmadığı doğrulanır", async () => {
    const roleUserDb = testEnv
      .authenticatedContext('role_user_uid', {
        email: 'user_role@firma.com',
        email_verified: true,
        role: 'user',
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(getDocs(collection(roleUserDb, 'licenses')));
    await assertFails(getDoc(doc(roleUserDb, 'licenses/user_a@firma.com')));
    await assertFails(
      setDoc(doc(roleUserDb, 'licenses/yeni_role@firma.com'), VALID_LICENSE('yeni_role@firma.com'))
    );
    await assertFails(
      setDoc(
        doc(roleUserDb, 'licenses/user_a@firma.com'),
        VALID_LICENSE('user_a@firma.com', { status: 'suspended' })
      )
    );
    await assertFails(deleteDoc(doc(roleUserDb, 'licenses/user_a@firma.com')));
  });

  it('15. Geçersiz Türkçe veya özel karakter içeren proje belge kimlikleri reddedilir', async () => {
    const userADb = testEnv
      .authenticatedContext('uid_a', {
        email: 'user_a@firma.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();

    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/şişli_proje_1'), VALID_PROJECT('şişli_proje_1'))
    );
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/çiğli_ığdır_2'), VALID_PROJECT('çiğli_ığdır_2'))
    );
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/sisli proje 1'), VALID_PROJECT('sisli proje 1'))
    );
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/sisli.proje!1'), VALID_PROJECT('sisli.proje!1'))
    );
    await assertFails(
      setDoc(doc(userADb, 'users/uid_a/projects/sisli@proje'), VALID_PROJECT('sisli@proje'))
    );
    const overMaxId = 'a'.repeat(129);
    await assertFails(
      setDoc(doc(userADb, `users/uid_a/projects/${overMaxId}`), VALID_PROJECT(overMaxId))
    );
  });
});
