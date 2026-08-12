# Admin Content Management — Tələblər

## Introduction

Bizim Riyaziyyat saytında bütün hard-coded (mock/demo) data silinəcək. Bundan sonra saytın **bütün məzmunu** yalnız admin paneldən idarə ediləcək. Admin hər şeyi sıfırdan daxil edə biləcək: videolar, sınaqlar, xəbərlər, müəllimlər, bildirişlər. Xal sistemi, premium idarəetməsi, popup-lar və zamanlar da düzgün işləyəcək.

**Texniki stack:** Vanilla HTML/CSS/JS · Upstash Redis + localStorage · `Storage.get/set` wrapper

### Glossary

| Termin | İzah |
|---|---|
| Storage | localStorage + Upstash Redis wrapper (`Storage.get/set`) |
| Mock data | Kod içinə yazılmış saxta istifadəçilər, videolar, testlər |
| CRUD | Create, Read, Update, Delete əməliyyatları |
| Premium | Ödənişli abunəlik statusu |
| Xal sistemi | İstifadəçinin fəaliyyətinə görə toplanan xallar (points) |
| Toast | Ekranın küncündə çıxan qısa bildiriş |
| Popup/Modal | Ekranın üzərindəki dialoq pəncərəsi |

---

## Requirements

### Requirement 1: Mock Data Təmizlənməsi

**User Story:** As an admin, I want no hardcoded/demo data in the site so that I can distinguish real content from fake content.

#### Acceptance Criteria

1. WHEN sayt yüklənir, `auth.js`-dəki `MOCK_USERS` massivi olmadığından `Storage.get('allUsers') || []` boş massiv qaytarır və heç bir saxta istifadəçi görünmür.
2. WHEN admin paneli açılır və `Storage.get('videos')` boş massiv qaytarırsa, THEN `loadVideos()` "Video yoxdur" mesajı göstərir, hardcoded videolar göstərmir.
3. WHEN admin paneli açılır və `Storage.get('tests')` boş massiv qaytarırsa, THEN `loadTests()` "Sınaq yoxdur" mesajı göstərir, hardcoded testlər göstərmir.
4. WHEN admin paneli açılır və `Storage.get('payments')` boş massiv qaytarırsa, THEN `loadPayments()` "Ödəniş yoxdur" mesajı göstərir, hardcoded ödənişlər göstərmir.
5. WHEN `index.html` yüklənir, bildirişlər paneli `Storage.get('globalNotifications') || []`-dan yüklənir və storage boş isə panel gizlənir.
6. IF `config.js`-də admin etimadnamələri varsa, THEN sayt açılanda həmin admin avtomatik `allUsers`-a seed edilir, başqa heç bir mock istifadəçi əlavə edilmir.

---

### Requirement 2: Admin Paneldən Video İdarəetməsi

**User Story:** As an admin, I want to add YouTube videos with title, category, and access level from the admin panel so that students can watch them.

#### Acceptance Criteria

1. WHEN admin "Yeni Video" düyməsinə basır, THEN aşağıdakı sahələri olan form açılır: Başlıq (məcburi), YouTube Link (məcburi), Kateqoriya (məcburi), Müddət, Açıqlama, Səviyyə (Pulsuz/Premium), Müəllim.
2. WHEN admin məcburi sahələri doldurmadan "Yadda Saxla" basır, THEN `showNotification('Zəhmət olmasa məcburi sahələri doldurun', 'error')` çağrılır, form saxlanılmır.
3. WHEN admin düzgün doldurulmuş formu saxlayır, THEN video `{id, title, youtubeId, category, duration, description, level, teacher, createdAt, views: 0}` strukturu ilə `Storage.set('videos', [...])` edilir və cədvəldə görünür.
4. WHEN admin YouTube URL daxil edir, THEN sistem `youtube.com/watch?v=ID` və `youtu.be/ID` formatlarından `youtubeId` avtomatik çıxarır.
5. IF admin etibarsız YouTube URL daxil edibsə, THEN `showNotification('Düzgün YouTube linki daxil edin', 'error')` göstərilir.
6. WHEN admin "Redaktə" basır, THEN mövcud video məlumatları forma populate edilir və "Yenilə" düyməsi saxlamağa aparır.
7. WHEN admin "Sil" basır, THEN `showConfirm('Bu videonu silmək istəyirsiniz?', ...)` açılır; təsdiqləndikdən sonra video `videos` massivindən silinir.
8. IF video `level === 'premium'` olarsa, THEN `videos.html`-də həmin video kartında kilit (🔒) ikonu görünür.

---

### Requirement 3: Admin Paneldən Sınaq İdarəetməsi

**User Story:** As an admin, I want to create multiple-choice quizzes from the admin panel so that students can take them.

#### Acceptance Criteria

1. WHEN admin "Yeni Sınaq" düyməsinə basır, THEN metadata formu açılır: Başlıq (məcburi), Kateqoriya, Müddət (dəqiqə, default: 30), Səviyyə (Pulsuz/Premium), Açıqlama.
2. WHEN admin "Sual Əlavə Et" basır, THEN sual formu açılır: Sual mətni (məcburi), A/B/C/D variantları (hamısı məcburi), Düzgün cavab seçimi (məcburi).
3. WHEN admin sınağı ən az 1 sual olmadan saxlamaq istəyir, THEN `showNotification('Ən az 1 sual əlavə edin', 'error')` göstərilir.
4. WHEN admin sınağı saxlayır, THEN `{id, title, category, duration, level, description, questions: [...], createdAt}` strukturu ilə `Storage.set('tests', [...])` edilir.
5. WHEN tələbə sınağı tamamlayır, THEN `{userId, testId, testTitle, score, total, percent, date, time, timestamp}` strukturu `Storage.get('testResults') || []`-a əlavə edilir.
6. IF sınaq `level === 'premium'` olarsa VƏ istifadəçinin `premium !== true` olarsa, THEN `showNotification('Bu sınaq yalnız premium üzvlər üçündür', 'warning')` göstərilir və sınaq başlamır.

---

### Requirement 4: Admin Paneldən Bildiriş Sistemi

**User Story:** As an admin, I want to send notifications to all users or specific groups so that they see important updates on the site.

#### Acceptance Criteria

1. WHEN admin paneldə "Bildirişlər" bölməsinə daxil olur, THEN aşağıdakı form görünür: Başlıq (məcburi), Mətn (məcburi), Növ (info/success/warning/error), Alıcı (all/premium/free).
2. WHEN admin "Göndər" basır, THEN `{id, title, text, type, target, createdAt, createdBy}` strukturu `Storage.set('globalNotifications', [...])` edilir.
3. WHEN istifadəçi hər hansı səhifəni açır, THEN `globalNotifications` yüklənir; `target === 'all'` isə hamıya, `target === 'premium'` isə yalnız premium istifadəçilərə, `target === 'free'` isə yalnız pulsuz istifadəçilərə göstərilir.
4. WHEN oxunmamış bildiriş mövcuddur, THEN navbar-da bildiriş ikonunun üzərində oxunmamış sayı badge kimi göstərilir.
5. WHEN istifadəçi bildirişə basır, THEN həmin bildirişin `id`-si `Storage.get('readNotifications_' + userId) || []`-a əlavə edilir və badge sayı azalır.
6. WHEN admin bildirişi silir, THEN `showConfirm` açılır; təsdiqləndikdən sonra həmin bildiriş `globalNotifications`-dan silinir.
7. IF `globalNotifications` boş massivdirsə, THEN bildirişlər paneli istifadəçiyə göstərilmir.

---

### Requirement 5: Xal Sistemi Düzgün İşləməsi

**User Story:** As a student, I want to see how many points I earn after each activity so that I feel motivated to continue learning.

#### Acceptance Criteria

1. WHEN tələbə video izləyir VƏ izləmə faizi ≥80%-ə çatır, THEN `awardVideoPoints(videoId, title, percent)` çağrılır, ekranda "+10 xal qazandınız!" toast göstərilir.
2. WHEN tələbə video izləyir VƏ izləmə faizi 40–79% arasındadır, THEN `awardVideoPoints()` çağrılır, "+5 xal qazandınız!" toast göstərilir.
3. WHEN tələbə sınağı tamamlayır, THEN `awardTestPoints(testTitle, score, total, testId)` çağrılır: 100%→+50xal, 80–99%→+30xal, 60–79%→+15xal, <60%→+5xal.
4. WHEN tələbə günün ilk girişini edir, THEN `awardDailyLoginPoints()` bir dəfə çağrılır, "+2 xal" toast göstərilir.
5. IF tələbə eyni `videoId` üçün artıq xal qazanıbsa, THEN `awardVideoPoints()` çağrılsa da xal verilmir, toast göstərilmir.
6. IF tələbə eyni `testId` üçün artıq xal qazanıbsa, THEN `awardTestPoints()` çağrılsa da xal verilmir.
7. WHEN xal qazanılır, THEN `points:updated` eventi atılır, `dashboard.html` "Son Fəaliyyət" lenti avtomatik yenilənir.
8. IF cari istifadəçinin `role === 'admin'` olarsa, THEN heç bir xal funksiyası işləmir (erkən return).

---

### Requirement 6: Premium İdarəetməsi

**User Story:** As an admin, I want to approve or reject premium requests with one click so that I can manage subscriptions efficiently.

#### Acceptance Criteria

1. WHEN istifadəçi premium müraciət göndərir, THEN `{id, userId, userName, userEmail, plan, months, price, requestedAt, status: 'pending'}` strukturu `Storage.get('premiumRequests') || []`-a əlavə edilir.
2. WHEN admin "Təsdiqlə" basır, THEN: müraciətin `status` → `'approved'`; `allUsers`-da həmin istifadəçinin `premium: true`, `premiumActivatedAt: now`, `premiumExpiresAt: now + months*30*gün` yazılır; `currentUser` yenilənir.
3. WHEN admin "Rədd Et" basır, THEN müraciətin `status` → `'rejected'`; `allUsers`-da həmin istifadəçinin `premiumRequestedAt: null`, `requestedPlan: null` silinir ki, yenidən müraciət edə bilsin.
4. WHEN `hasPremiumAccess()` çağrılır VƏ `user.premiumExpiresAt` keçib, THEN `autoDowngradePremium(userId)` çağrılır, `premium: false` edilir.
5. THE admin paneldəki premium badge (`premiumPendingBadge`) yalnız `status === 'pending'` sayını göstərir.
6. WHEN premium aktivləşir, THEN navbarda `balanceBadge` elementinin içi `<i class="fas fa-crown"></i> Premium` olur.

---

### Requirement 7: Popup/Modal Sistemi

**User Story:** As a user, I want all popups and dialogs to be in Azerbaijani and look polished so that I have a consistent experience.

#### Acceptance Criteria

1. THE kod bazasında `window.alert()`, `window.confirm()`, `window.prompt()` funksiyaları istifadə edilmir; əvəzinə `showNotification()`, `showConfirm()`, `showPrompt()` (notifications.js-dən) işlənir.
2. WHEN uğurlu əməliyyat tamamlanır, THEN `showNotification(mesaj, 'success', 4000)` çağrılır — yaşıl sərhədli, sağ üst küncdə toast.
3. WHEN xəta baş verir, THEN `showNotification(mesaj, 'error', 5000)` çağrılır — qırmızı sərhədli toast.
4. WHEN silmə əməliyyatı başlayır, THEN `showConfirm('...silmək istəyirsiniz?', onYes, onNo)` açılır.
5. THE bütün `showConfirm` / `showPrompt` dialoqlarındakı başlıq, düymə mətnləri Azərbaycan dilindədir.
6. WHEN modal/dialoq açıqdır VƏ istifadəçi ESC basır, THEN modal bağlanır.
7. WHEN istifadəçi modal arxa fonduna (overlay) basır, THEN modal bağlanır.

---

### Requirement 8: Timestamp Düzgünlüyü

**User Story:** As an admin, I want to see accurate creation and update times on every record so that I can track changes.

#### Acceptance Criteria

1. WHEN video, sınaq, xəbər, müəllim, istifadəçi yaradılır, THEN obyektdə `createdAt: new Date().toISOString()` sahəsi olur.
2. WHEN mövcud qeyd yenilənir, THEN obyektdə `updatedAt: new Date().toISOString()` sahəsi əlavə edilir/yenilənir.
3. THE admin paneli cədvəllərində tarix sütunu `new Date(item.createdAt).toLocaleDateString('az-AZ')` formatında (DD.MM.YYYY) göstərilir.
4. THE vaxt sütunu `new Date(item.createdAt).toLocaleTimeString('az-AZ', {hour:'2-digit', minute:'2-digit'})` formatında göstərilir.
5. IF qeydin `createdAt` sahəsi `undefined` və ya `null`-dursa, THEN "Naməlum" göstərilir, `new Date(null)` xətası verilmir.

---

### Requirement 9: Admin Hesabının Qorunması

**User Story:** As an admin, I want only authorized admin users to access the admin panel so that regular users cannot make unauthorized changes.

#### Acceptance Criteria

1. WHEN `admin.html` yüklənir, THEN `getCurrentUser()` çağrılır; `user === null` VƏ ya `user.role !== 'admin'` olarsa, dərhal `index.html`-ə yönləndirilir.
2. IF `Storage.get('allUsers')` boş massivdirsə, THEN `config.js`-dəki `ADMIN_EMAIL`/`ADMIN_PASSWORD` ilə bir admin seed edilir, massiv boş qalmır.
3. THE `config.js`-dəki admin parol dəyişəni `auth.js` və ya `admin.js`-ə hardcode edilmir.
4. WHEN admin "Çıxış" basır, THEN `Storage.remove('currentUser')` çağrılır, `clearDeviceSession(userId)` çağrılır, `index.html`-ə yönləndirilir.
