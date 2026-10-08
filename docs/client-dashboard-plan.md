# خطة لوحة العميل (الجهة) — Himma Client Dashboard

> الحالة: **المرحلة 1 منفّذة** (الدخول، التوجيه، الرئيسية، ملف الجهة، حسابي، حسابات الجهة من لوحة المالك). المراحل 2–5 لم تبدأ.

## السياق
لوحة المالك اكتملت (ما عدا الذكاء الاصطناعي). العملاء (جمعيات، مدارس، مؤسسات، جهات حكومية) موجودون في النظام ومعهم
بياناتهم مربوطة بـ `tenant_id` (اشتراكات، فواتير، مقالات مؤسسية، فعاليات، قناة يوتيوب)، لكن **لا يستطيعون الدخول**:
`AuthController::login` يرفض أي حساب ليس دوراً من أدوار المنصة (`dashboard_not_available`)، والمتصفح لا يعرف إلا
أدوار المنصة (`src/configs/acl.js`)، وموافقة طلب الانضمام تُنشئ الجهة **بدون حساب**.

**قرارات المالك (من الأسئلة):**
1. يدخل اللوحة **مسؤولو الجهة فقط** في المرحلة الأولى (الأعضاء والكتّاب لاحقاً).
2. الجهة **تنشر مباشرة في مساحتها** (محتوى مؤسسي/حكومي خاص بها)، دون مراجعة فريق همّة.
3. **دفع إلكتروني من اللوحة** عبر Ziina الموجود، وتحميل الفاتورة PDF.
4. **لوحة واحدة لكل الأنواع**؛ أقسام الجهات الحكومية (AI-G) تُضاف مع مرحلة الذكاء الاصطناعي.

**النتيجة المقصودة:** مسؤول الجهة يدخل بحسابه إلى `/client`، يرى اشتراكه وفواتيره ويدفعها، يدير محتوى جهته
وفعالياتها ويبث من قناته، ويراسل فريق همّة — مع عزل تام بين الجهات وتدقيق كل عملية.

---

## المعمارية (تنطبق على كل المراحل)

### الخادم
- **مسار مستقل:** كل واجهات العميل تحت `/api/client/*` في `backend/routes/api.php`، بحراسة
  `auth.api` + `not_maintenance` + middleware جديد `client` (+ `same_origin` على الكتابة).
- **middleware `EnsureClientUser`** (`app/Http/Middleware/`): المستخدم له `tenant_id`، وجهته ليست `suspended`/`cancelled`
  (→ 403 `tenant_inactive`)، ويضع `$request->tenant()` (macro أو attribute). جهة موقوفة **بسبب الدفع**
  (`billing_suspended_at`) تبقى قادرة على الدخول لصفحتي الفوترة والملف فقط → `ability`-like middleware `client.full` يرفض
  الباقي بـ 403 `tenant_billing_suspended`.
- **العزل:** كل controller عميل في `app/Http/Controllers/Client/` ويستعلم دائماً عبر `$tenant->articles()`, `$tenant->events()`…
  وربط النماذج بالمسار عبر `scopeBindings`/فحص صريح: سجل جهة أخرى → **404** (لا 403، حتى لا يُكشف وجوده).
  مكوّن مشترك `app/Http/Controllers/Client/ClientController.php` (يرث `Controller`) فيه `tenant()` و`ownedOr404()`.
- **إعادة الاستخدام:** نفس `FormRequest`s والقواعد قدر الإمكان (`ArticleFormRequest`, `EventFormRequest`,
  `YoutubeLink`, `ReasonFormRequest`)، ونفس `toPublicArray()` للنماذج، و`BillingService::startCheckout()`،
  و`InvoicePdf`، و`Audit::log()` (يسجّل `tenant_id` تلقائياً من الفاعل)، ومحادثات `Conversation` الحالية.
- **تسجيل الدخول:** `AuthController::login` يقبل حسابات الجهات (لها `tenant_id` ودورها مفتاح من `role_templates`)،
  ويرفض الجهة الملغاة/الموقوفة إدارياً بـ `tenant_inactive`. `GET /auth/me` يضيف `kind: 'platform' | 'client'` و`tenant`
  (الاسم بلغتين، النوع، الحالة، `billingSuspended`). الحماية من التخمين وتعطيل الجلسات (`token_version`) كما هي.
- **صلاحيات المنصة لا تتغير:** `Ability::can` يبقى لأدوار المنصة؛ حساب الجهة لا يمر أبداً من `ability:` لأن دوره ليس
  دور منصة (يُرفض تلقائياً من `/api/admin/*`). اختبار صريح لذلك.

### المتصفح
- **صفحات `/client/*`** في نفس تطبيق Next (`src/pages/client/`)، وعناصر واجهة في `src/views/client/`.
- **القائمة حسب نوع الحساب:** `src/navigation/vertical/index.js` يصدّر `adminNavigation` و`clientNavigation`، ويختار
  `navigation()` حسب `user.kind` (من `useAuth`). `getHomeRoute(role)` → `/client` لحساب الجهة.
- **CASL:** `src/configs/acl.js` يبني لحساب الجهة قواعد `manage` على موضوعات العميل (`client_home`, `client_billing`,
  `client_content`, `client_events`, `client_messages`, `client_profile`)؛ صفحات `/client` تعلن `acl` بموضوعها، وصفحات
  `/admin` لا يملكها العميل → `AclGuard` يمنعها. الجهة الموقوفة بالدفع تُبنى لها قواعد الفوترة والملف فقط.
- **ثنائية اللغة:** كل النصوص في `public/locales/{ar,en}.json` تحت `client.*` و`nav.client.*`، وأخطاء جديدة تحت `errors.*`.
- **إعادة استخدام واجهات الإدارة** حيث تصلح: `DataTable`, `useApiList`, `StatusChip`, `formatMoney`, `ArticleFormDialog`
  (مع `mode='client'` يخفي التصنيف/الجهة)، `EventFormDialog`, `useEventActions`, `Inbox` من الرسائل.

---

## المراحل (كل مرحلة تُرفع وحدها مع اختباراتها)

### المرحلة 1 — الأساس: الدخول والتوجيه والملف وحسابات الجهات من جهة المنصة
**جهة المنصة (لوحة المالك):**
- صفحة العميل `/admin/tenants` → حوار/تبويب **«حسابات الجهة»**: إنشاء حساب مسؤول (الاسم بلغتين، البريد، كلمة مرور
  أولية، الدور من قوالب الأدوار، افتراضياً حسب نوع الجهة)، تعطيل/تفعيل، إعادة تعيين كلمة المرور (ترفع `token_version`).
  واجهات: `GET/POST /api/admin/tenants/{tenant}/users`, `PUT .../users/{cuid}` بصلاحية `tenants`. تدقيق `tenant_user.*`.
- `TenantRequestController::approve` يبقى كما هو (لا حساب تلقائي)، مع زر «إنشاء حساب للمسؤول» يملأ البيانات من الطلب.

**جهة العميل:**
- تسجيل الدخول + `auth/me` + التوجيه إلى `/client`، وتخطيط/قائمة العميل.
- **الرئيسية `/client`**: ترحيب، حالة الاشتراك (الباقة، تاريخ الانتهاء، الأيام المتبقية)، فواتير مستحقة، فعاليات قادمة،
  إحصاء مختصر للمحتوى. API: `GET /api/client/overview`.
- **ملف الجهة `/client/profile`**: عرض الاسم والنوع والحالة (للقراءة)، وتعديل: بريد الفوترة، قناة يوتيوب
  (`YoutubeSettings::isChannelUrl`)، رقم التواصل (عمود جديد `tenants.contact_phone`). `GET/PUT /api/client/profile`.
- **حسابي**: تغيير كلمة المرور واللغة (`PUT /api/client/account/password` يرفع `token_version`).

### المرحلة 2 — الفوترة والدفع
- `/client/billing`: الاشتراك الحالي والسابق، الفواتير (الحالة، المستحق، الاستحقاق)، المدفوعات.
- **تحميل PDF**: `GET /api/client/invoices/{id}/pdf` يعيد استخدام `InvoicePdf`.
- **الدفع**: `POST /api/client/invoices/{id}/checkout` → `BillingService::startCheckout()` → تحويل إلى Ziina →
  العودة إلى `/billing/payment-result` الحالية (مع زر «العودة إلى لوحتي» إن كان المستخدم مسجلاً كعميل).
- الجهة الموقوفة بالدفع ترى تنبيهاً واضحاً وتصل لهذه الصفحة فقط حتى تدفع (فك الإيقاف يتم آلياً كما الآن في `settleInvoice`).

### المرحلة 3 — محتوى الجهة (نشر مباشر في مساحتها)
- `/client/content`: مقالات الجهة فقط؛ إنشاء/تعديل/حذف المسودة/نشر/سحب.
- **القاعدة:** مقال الجهة دائماً `tenant_id` = الجهة، والتصنيف `institutional` (أو `government` للجهات الحكومية) — يُفرض
  في الخادم، لا يختاره العميل. **النشر مباشر** (`draft → published`) دون مراجعة همّة، استثناءً محصوراً بمساحة الجهة؛
  ويبقى: حفظ النسخ (`saveVersion`)، التدقيق، فحص الامتثال الاختياري، وحق فريق همّة في **سحب** أي محتوى (GOV-02)
  من لوحة المحتوى الحالية (يظهر فيها مع اسم الجهة).
- يُسجَّل في `REQUIREMENTS.md`/`CLAUDE.md` أن هذا استثناء من PUB-01 بقرار المالك، محصور بالمحتوى المؤسسي الداخلي،
  ولا يظهر في المجلة العامة (إرسال مقال للمجلة العامة عبر مراجعة همّة يمكن إضافته لاحقاً).
- واجهات: `/api/client/articles` (index/show/store/update/destroy/publish/withdraw). إعادة استخدام `ArticleFormDialog`
  بوضع العميل، و`Article::saveVersion`, `PublishingRules` لا تنطبق (لا مراجعة).

### المرحلة 4 — فعاليات الجهة والبث من قناتها
- `/client/events`: فعاليات الجهة فقط (`tenant_id` مفروض)، إنشاء/جدولة/إلغاء، بدء البث وإنهاؤه، المسجلون وحضورهم.
- الرؤية: `institutional` افتراضياً؛ `public` مسموح (قرار النشر المباشر) مع وسم «فعالية جهة» — يُراجع لاحقاً إن رغب المالك.
- البث من **قناة الجهة** (`tenants.youtube_channel_url`)؛ تُطبَّق إعدادات يوتيوب العامة (روابط يوتيوب فقط، التسجيل
  الإلزامي، التضمين المحسّن) عبر نفس `EventFormRequest` و`EndBroadcastFormRequest`.
- واجهات: `/api/client/events` + أفعال الحالة، مع إعادة استخدام منطق `EventController` (نقل المنطق المشترك إلى
  `app/Events/EventWorkflow.php` أو trait بدل نسخه).

### المرحلة 5 — التواصل والتنبيهات وسجل النشاط
- `/client/messages`: نفس نظام الرسائل الحالي (محادثات ثنائية، إبلاغ، حظر) — العميل يراسل فريق همّة؛ قائمة الأشخاص
  للعميل تقتصر على **فريق المنصة وحسابات جهته** (لا يرى حسابات الجهات الأخرى).
- **الجرس**: `BillingNotifier` يضيف إشعارات قاعدة البيانات لحسابات الجهة أيضاً (إلى جانب البريد)؛
  `GET /api/client/notifications` (نفس `MyNotificationController` بمسار عميل).
- **سجل نشاط الجهة** `/client/activity`: صفوف `audit_logs` حيث `tenant_id` = الجهة (قراءة فقط، دون IP).

### خارج هذه الخطة (مراحل لاحقة)
- أعضاء الجهة والكتّاب وتطبيق مصفوفة قوالب الأدوار فعلياً (ROL-03) — يبنى على أساس المرحلة 1.
- ربط قناة يوتيوب بـ Google (OAuth) وعدد المشاهدين — يحتاج حساب Google Cloud لهمّة.
- لوحة الجهات الحكومية بالذكاء الاصطناعي (AI-G-01..06) — مع مرحلة الذكاء الاصطناعي.
- الموقع العام الذي يعرض مساحة كل جهة.

---

## الملفات الأساسية
- الخادم: `backend/app/Http/Controllers/Api/AuthController.php`, `backend/app/Http/Middleware/EnsureClientUser.php` (جديد),
  `backend/bootstrap/app.php` (تسجيل alias)، `backend/app/Http/Controllers/Client/*` (جديد)، `backend/routes/api.php`،
  `backend/app/Http/Controllers/Api/TenantUserController.php` (جديد، حسابات الجهات من لوحة المالك)،
  migration لـ `tenants.contact_phone`، `backend/app/Billing/BillingNotifier.php` (المرحلة 5).
- المتصفح: `src/context/AuthContext.js`, `src/configs/acl.js`, `src/layouts/components/acl/getHomeRoute.js`,
  `src/navigation/vertical/index.js`, `src/pages/client/**` (جديد)، `src/views/client/**` (جديد)،
  `src/views/admin/TenantFormDialog.js` + حوار حسابات الجهة، `src/views/admin/content/ArticleFormDialog.js` (وضع العميل)،
  `src/pages/billing/payment-result/index.js`، `public/locales/{ar,en}.json`.
- البذور: `StaffSeeder` يضيف كلمة مرور معروفة لحسابات العملاء الحالية (`admin@albirr.test`…) لتجربة اللوحة محلياً.
- `CLAUDE.md`: قسم «لوحة العميل» (المسار، `client` middleware، العزل 404، استثناء النشر المباشر).

## التحقق (لكل مرحلة)
1. **اختبارات Feature** في `backend/tests/Feature/Client/`: 401 بلا دخول؛ 403 لحساب منصة على `/api/client/*`
   ولحساب جهة على `/api/admin/*`؛ **عزل الجهات: سجل جهة أخرى → 404** لكل مورد؛ 422 بالرموز؛ النجاح؛ صف التدقيق؛
   جهة موقوفة إدارياً لا تدخل؛ جهة موقوفة بالدفع تصل للفوترة فقط. `php artisan test` كاملاً أخضر.
2. **المتصفح** (Playwright كما في الجلسات السابقة): الدخول بـ `admin@albirr.test` بالعربية والإنجليزية؛ التوجيه إلى
   `/client`؛ محاولة فتح `/admin` تُمنع؛ تنفيذ مسار كل مرحلة (دفع فاتورة حتى صفحة Ziina، نشر مقال، بدء بث وإنهاؤه).
3. لقطات شاهدة لكل صفحة جديدة بالاتجاهين قبل الرفع، و`prettier`/`pint` على الملفات المعدّلة.
