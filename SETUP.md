# دليل تشغيل منصة همّة (Himma Platform)

المشروع مبني على قالب **Vuexy Next.js Admin Template** (Next.js 15 + React 18 + MUI).

## المتطلبات

| المتطلب | الإصدار |
|---|---|
| Node.js | 18 أو أحدث (مجرَّب على 22) |
| npm | يأتي مع Node.js |
| git | أي إصدار حديث |

## التثبيت والتشغيل

```bash
git clone -b claude/project-thread-n6g8io https://github.com/eslamalbaik/Himma-Platform.git
cd Himma-Platform
cp .env.example .env        # على Windows: copy .env.example .env
npm ci
npm run dev
```

انتظر حتى تظهر كلمة `Ready`، ثم افتح <http://localhost:3000>. اترك نافذة الطرفية مفتوحة طوال فترة العمل.

> رابط `localhost` يعمل فقط على الجهاز الذي يعمل عليه `npm run dev`.

## ملف البيئة `.env`

| المتغير | الوصف |
|---|---|
| `NEXT_PUBLIC_JWT_SECRET` | مفتاح توقيع رمز الدخول |
| `NEXT_PUBLIC_JWT_REFRESH_TOKEN_SECRET` | مفتاح رمز التحديث |
| `NEXT_PUBLIC_JWT_EXPIRATION` | مدة صلاحية الرمز (مثل `5m`) |

- ملف `.env` لا يُرفع إلى GitHub (موجود في `.gitignore`). ضع فيه مفاتيحك الخاصة.
- إذا لم يوجد الملف، يستخدم تسجيل الدخول التجريبي قيماً احتياطية ويعمل رغم ذلك.

## بيانات الدخول التجريبية

| الدور | البريد | كلمة المرور |
|---|---|---|
| Admin | `admin@vuexy.com` | `admin` |
| Client | `client@vuexy.com` | `client` |

تسجيل الدخول حالياً وهمي (`src/@fake-db/auth/jwt.js`) وغير مرتبط بقاعدة بيانات أو API حقيقي.

## حل المشاكل

### `ERR_CONNECTION_REFUSED` عند فتح localhost
الخادم لا يعمل. شغّل `npm run dev` وانتظر ظهور `Ready`.

### "Email or Password is invalid" مع البيانات الصحيحة
1. أوقف الخادم بـ `Ctrl+C`.
2. `git pull` لجلب آخر نسخة.
3. احذف مجلد الكاش `.next`:
   - Mac / Linux: `rm -rf .next`
   - Windows: `rmdir /s /q .next`
4. `npm run dev` ثم افتح <http://localhost:3000/login>.
5. إذا بقي الخطأ: اضغط `F12` ← تبويب **Console** وابحث عن السطر الأحمر الذي يبدأ بـ `Login failed`، فهو يعرض السبب الحقيقي.

## الأوامر المتاحة

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل بيئة التطوير |
| `npm run build` | بناء نسخة الإنتاج (انظر المشاكل المعروفة) |
| `npm run start` | تشغيل نسخة الإنتاج بعد البناء |
| `npm run lint` | فحص الكود |
| `npm run format` | تنسيق الكود |

## مشاكل معروفة

- **`npm run build` يفشل** في خطوة الفحص (lint) برسالة `Requires Babel "^7.22.0" ... but was loaded with "7.21.5"`. المشكلة موجودة في القالب الأصلي وتحتاج إصلاحاً قبل النشر على Netlify أو Vercel. بيئة التطوير (`npm run dev`) لا تتأثر.

## الترخيص

Vuexy قالب تجاري يُباع على ThemeForest. تأكد من امتلاك رخصة صالحة قبل استخدامه في مشروع حقيقي.
