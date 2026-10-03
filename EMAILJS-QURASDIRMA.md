# EmailJS Quraşdırma Təlimatı

## EmailJS Quraşdırma

EmailJS şifrə bərpa linklərini və qeydiyyat email təsdiq kodlarını göndərmək üçün istifadə olunur.

## 🚀 Addımlar

### 1. EmailJS Hesabı Yaradın

1. [https://www.emailjs.com](https://www.emailjs.com) saytına daxil olun
2. "Sign Up" düyməsinə klikləyin
3. Pulsuz hesab yaradın (300 email/ay pulsuz)

### 2. Email Service Əlavə Edin

1. Dashboard-da "Email Services" bölməsinə keçin
2. "Add New Service" düyməsinə klikləyin
3. Gmail, Outlook və ya digər email provayderini seçin
4. Email hesabınızı qoşun və təsdiqləyin
5. **Service ID**-ni kopyalayın (məsələn: `service_abc123`)

### 3. Şifrə bərpa template-i yaradın

EmailJS Dashboard-da **Email Templates → Create New Template** seçin. "To Email" sahəsini `{{to_email}}` edin.

**Subject:** `{{site_name}} — Şifrəni yenilə`

**Email məzmunu:** `{{reset_url}}` linkini daxil edin və linkin 15 dəqiqə ərzində bitdiyini, bir dəfə istifadə oluna bildiyini yazın.

Template ID-ni kopyalayın.

### 4. Qeydiyyat təsdiq kodu template-i yaradın

EmailJS Dashboard-da ayrıca template yaradın. "To Email" sahəsini `{{to_email}}` edin.

**Subject:** `{{site_name}} — Email təsdiq kodu`

**Email məzmunu:** `{{user_name}}` və `{{verification_code}}` dəyişənlərini yerləşdirin. `{{expires_minutes}}` dəqiqədən sonra kodun bitdiyini qeyd edin. Template ID-ni kopyalayın.

### 5. Public Key əldə edin

EmailJS **Account → API Keys** bölməsindən Public Key-i götürün. Private key lazım deyil.

### 6. Vercel-də konfiqurasiya edin

Layihədə **Settings → Environment Variables** açın və Production üçün bu dəyərləri əlavə edin:

- `EMAILJS_SERVICE_ID` — EmailJS service ID
- `EMAILJS_RESET_TEMPLATE_ID` — yuxarıda yaratdığınız template ID
- `EMAILJS_VERIFY_TEMPLATE_ID` — qeydiyyat təsdiq kodu template ID
- `EMAILJS_PUBLIC_KEY` — EmailJS Public Key
- `APP_URL` — `https://bizimriyaziyyat.vercel.app`

Sonra Production deployment-i redeploy edin. Bu dəyərlər frontend koduna və Git-ə yazılmamalıdır.

### 7. Yoxlama

Giriş səhifəsində **Şifrəmi unutdum?** seçin, qeydiyyatlı email ünvanını daxil edin və məktubdakı linki açın. Yeni şifrə yaratdıqdan sonra həmin şifrə ilə giriş edin.

Qeydiyyat səhifəsində məlumatları daxil edin. Emailə göndərilən 6 rəqəmli kodu təsdiqləyənədək hesab yaradılmayacaq. Kod 10 dəqiqə etibarlıdır, beş yanlış cəhddən sonra ləğv olunur və yeni kod istəkləri arasında 60 saniyə gözləmə tətbiq edilir.

EmailJS dəyişənləri konfiqurasiya edilməyibsə API `503` qaytaracaq. EmailJS maili rədd edərsə `502` görünəcək; EmailJS Dashboard-dakı Logs bölməsini yoxlayın.

## 💰 Qiymətlər

- **Free Plan**: 300 email/ay (kiçik layihələr üçün kifayətdir)
- **Personal Plan**: $7/ay - 1000 email/ay
- **Professional Plan**: $15/ay - 10000 email/ay

## Təhlükəsizlik

- Bərpa tokeninin özü Redis-də saxlanmır; yalnız SHA-256 hash-i saxlanır.
- Link 15 dəqiqədən sonra bitir və uğurlu istifadədən sonra silinir.
- Eyni email üçün sorğular arasında rate limit tətbiq olunur.
- Qeydiyyat kodu duz (salt) ilə hash olunaraq Redis-də saxlanır; uğurlu təsdiqdən sonra birdəfəlik silinir.
- Qeydiyyat üçün saxlanılan müvəqqəti məlumatlarda şifrənin yalnız bcrypt hash-i olur; hesab email təsdiqindən əvvəl yaradılmır.
- Şifrə yalnız bcrypt hash-i kimi saxlanır; email-ə göndərilmir.

## 📚 Əlavə Resurslar

- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [EmailJS Templates Guide](https://www.emailjs.com/docs/user-guide/creating-email-template/)
- [EmailJS Troubleshooting](https://www.emailjs.com/docs/faq/)

## 🎯 Alternativlər

Əgər EmailJS istifadə etmək istəmirsinizsə:

1. **SendGrid** - Daha güclü, 100 email/gün pulsuz
2. **Mailgun** - 5000 email/ay pulsuz
3. **AWS SES** - Çox ucuz, amma konfiqurasiya çətindir
4. **Backend API** - Node.js + Nodemailer (ən yaxşı həll)

---

**Qeyd:** EmailJS xidməti və hər iki template konfiqurasiya edilməyincə şifrə bərpa və qeydiyyat email-ləri göndərilməyəcək.
