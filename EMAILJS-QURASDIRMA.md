# EmailJS Quraşdırma Təlimatı

## 📧 Real Email Göndərmə Sistemi

Bu təlimat sizə EmailJS vasitəsilə real email göndərmə sistemini quraşdırmağa kömək edəcək.

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

### 3. Email Template Yaradın

#### Verification Email Template

1. "Email Templates" bölməsinə keçin
2. "Create New Template" düyməsinə klikləyin
3. Template adı: `verification_email`
4. **ÖNƏMLİ:** "To Email" sahəsində `{{to_email}}` və ya `{{user_email}}` yazın
5. Aşağıdakı məzmunu əlavə edin:

**To Email (Alıcı):**
```
{{to_email}}
```

**From Name:**
```
Bizim Riyaziyyat
```

**Subject:**
```
{{site_name}} - Email Doğrulama Kodu
```

**Content:**
```html
Salam {{to_name}},

{{site_name}} platformasında qeydiyyatınızı tamamlamaq üçün aşağıdakı doğrulama kodundan istifadə edin:

🔑 Doğrulama Kodu: {{verification_code}}

Bu kod 10 dəqiqə ərzində etibarlıdır.

Əgər bu qeydiyyatı siz etməmisinizsə, bu emaili nəzərə almayın.

Hörmətlə,
{{site_name}} Komandası

---
{{site_url}}
```

**⚠️ ÇOX ÖNƏMLİ:** 
- Template-də "Settings" tab-ına keçin
- "To Email" sahəsində `{{to_email}}` yazın (mötərizələrlə birlikdə)
- Bu olmadan email göndərilməyəcək!

6. **Template ID**-ni kopyalayın (məsələn: `template_xyz789`)

#### Welcome Email Template (İstəyə bağlı)

1. Yeni template yaradın: `welcome_template`
2. Subject: `{{site_name}}-a Xoş Gəldiniz!`
3. Content:
```html
Salam {{to_name}},

{{site_name}} ailəsinə xoş gəldiniz! 🎉

Hesabınız uğurla yaradıldı və artıq platformamızdan istifadə edə bilərsiniz.

Dashboard: {{dashboard_url}}

Platformamızda:
✅ Video dərslər
✅ İnteraktiv testlər
✅ Peşəkar müəllimlər
✅ Şəxsi statistika

və daha çox imkanlar sizi gözləyir!

Uğurlar,
{{site_name}} Komandası

---
{{site_url}}
```

### 4. Public Key Əldə Edin

1. "Account" bölməsinə keçin
2. "API Keys" tab-ına keçin
3. **Public Key**-i kopyalayın (məsələn: `user_abc123xyz`)

### 5. Konfiqurasiya Edin

`js/email-service.js` faylını açın və aşağıdakı məlumatları daxil edin:

```javascript
const EMAILJS_CONFIG = {
    serviceId: 'service_abc123',      // Sizin Service ID
    templateId: 'template_xyz789',    // Sizin Template ID
    publicKey: 'user_abc123xyz'       // Sizin Public Key
};
```

### 6. Test Edin

1. Saytınızı açın
2. Qeydiyyat səhifəsinə keçin
3. Real email ünvanınızla qeydiyyatdan keçin
4. Email qutunuzu yoxlayın - doğrulama kodu gəlməlidir

## ✅ Uğurlu Quraşdırma

Əgər hər şey düzgün quraşdırılıbsa:
- ✅ Real email göndəriləcək
- ✅ "Demo rejimi" mesajı görünməyəcək
- ✅ İstifadəçilər real doğrulama kodu alacaq

## ⚠️ Problemlər

### Email gəlmir?

1. **Spam qovluğunu yoxlayın**
2. **EmailJS Dashboard-da "Logs" bölməsinə baxın**
3. **Service ID, Template ID və Public Key-in düzgün olduğunu yoxlayın**
4. **Gmail istifadə edirsinizsə, "Less secure app access" aktiv olmalıdır**

### "Demo rejimi" hələ də görünür?

1. `js/email-service.js` faylında konfiqurasiyanı yoxlayın
2. Browser cache-ni təmizləyin (Ctrl+Shift+R)
3. Console-da xəta mesajlarını yoxlayın (F12)

## 💰 Qiymətlər

- **Free Plan**: 300 email/ay (kiçik layihələr üçün kifayətdir)
- **Personal Plan**: $7/ay - 1000 email/ay
- **Professional Plan**: $15/ay - 10000 email/ay

## 🔒 Təhlükəsizlik

- ✅ Public Key frontend-də istifadə oluna bilər
- ✅ Private Key heç vaxt frontend-də istifadə etməyin
- ✅ EmailJS spam və abuse-dan qoruyur
- ✅ Rate limiting avtomatik tətbiq olunur

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

**Qeyd:** Demo rejimi EmailJS konfiqurasiya olunmadıqda avtomatik işləyir. Real email göndərmək üçün yuxarıdakı addımları tamamlayın.
