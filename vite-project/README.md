# FUTURE STEP

FUTURE STEP o‘quv markazi uchun o‘quvchi, o‘qituvchi va administrator kabinetlari.

## Talablar

- Node.js 22.13 yoki undan yangi versiya (`node:sqlite` ishlatiladi).
- npm.

## Lokal ishga tushirish

Loyiha papkasida bitta terminalda ishga tushiring:

```powershell
npm run dev
```

Bu buyruq API serveri va Vite’ni birga ishga tushiradi. API serverining standart
porti `3001`; band bo‘lsa, keyingi bo‘sh port avtomatik tanlanadi. Muayyan boshlang‘ich
port kerak bo‘lsa, `PORT` muhit o‘zgaruvchisini belgilang.
Brauzerda Vite ko‘rsatgan manzilni oching. Birinchi marta kirganda
administratorning ismi, logini va kamida 12 belgili parolini yarating. Keyingi
foydalanuvchilarni administrator kabinetdagi **Hisoblar** bo‘limidan qo‘shadi.

O‘quvchi va o‘qituvchi loginlari ism-familiyadan avtomatik yaratiladi. Har bir
yangi hisob uchun vaqtinchalik parol faqat yaratilgan zahoti ko‘rsatiladi.
Hisob egasiga parolni xavfsiz yetkazing.

Administrator chap menyusidagi **Sozlamalar** bo‘limidan o‘quvchi,
o‘qituvchi va admin sozlamalariga o‘tiladi. O‘quvchi yoki o‘qituvchi
ro‘yxatida ism, login yoki telefon raqami bo‘yicha qidirish, ma’lumotlarini
tahrirlash va ular uchun yangi login hamda parol yaratish mumkin. Yangi kirish
ma’lumotlari faqat bir marta ko‘rsatiladi; hisob egasiga xavfsiz yetkazing.

Kabinetning chap menyusida markaz nomi ostidagi **Tungi rejim / Kunduzgi
rejim** tugmasi orqali ko‘rinishni almashtirish mumkin. Tanlov shu brauzerda
saqlanadi.

Administrator kabinetidagi **Markaz sozlamalari** orqali ommaga ko‘rinadigan
nom, shior, telefon, manzil, Telegram/Instagram, tavsif va kurslarni tahrirlash
mumkin. **Admin sozlamalari** bo‘limida administrator ismi, login va paroli
yangilanadi; buning uchun joriy parolni qayta kiritish talab etiladi.

Administratorning **To‘lovlar** bo‘limida o‘quvchi uchun to‘lov summasi,
sana, oylik to‘lov miqdori va keyingi to‘lov sanasini qayd etish mumkin.
O‘quvchi kabinetida joriy oy uchun to‘langan summa, to‘lovlar tarixi,
qolgan summa va muddat ko‘rsatiladi; oylik to‘lov to‘liq bo‘lmaguncha eslatma
chiqadi.

Administratorning chap menyusidagi **Darslar** bo‘limini bosganda uning
yonida alohida menyu ochiladi. Undan **O‘qituvchilar**, **Darslar** yoki
**Fanlar**ni tanlash mumkin; tanlangan bo‘lim markaziy qismda ko‘rinadi.
**Fanlar** bo‘limidagi `＋` belgisi bilan fan qo‘shiladi; fanlar dars
jadvalidan alohida saqlanib, keyin darsga biriktirilishi mumkin.
Mavjud fan tanlanganda o‘sha fan bo‘yicha ustoz va vaqtga ajratilgan dars
guruhlari chiqadi. Administrator guruhdan o‘quvchini mavjud hisob orqali
qo‘shishi yoki shu yerning o‘zida yangi o‘quvchi hisobi yaratib, guruhga
biriktirishi mumkin; yangi hisobning login-paroli bir marta ko‘rsatiladi.
Ushbu guruhga qo‘shish oynasi dars jadvali va o‘qituvchi darslari sahifalarida
ham bir xil ishlaydi.
**O‘qituvchilar** bo‘limidagi `＋` belgisi orqali yangi o‘qituvchi hisobi
yaratiladi va vaqtinchalik login-paroli shu oynada ko‘rsatiladi. Hafta kuni,
dars vaqti, fan va
o‘qituvchini belgilab haftalik jadval tuziladi. Darsga o‘quvchini administrator
yoki unga biriktirilgan o‘qituvchi qo‘shadi. O‘qituvchi kabinetidagi
**Darslarim** bo‘limida faqat o‘z darslari va ularga yozilgan o‘quvchilar
ko‘rinadi. O‘quvchi kabinetida davomatni o‘zi belgilamaydi; davomatni
o‘qituvchi yoki administrator qayd etadi. O‘quvchiga biriktirilgan dars
tugagach, shu dars uchun ixtiyoriy izoh qoldirish mumkin. Izohlar dars sanasi
bo‘yicha saqlanadi. O‘qituvchi dars boshlangach, barcha o‘quvchilarni kelgan
yoki kelmagan deb bir marta belgilab yuboradi; yuborilgach faqat administrator
o‘zgartira oladi. Administrator dars va sana bo‘yicha davomatni ism, login
yoki telefon bilan qidirib, istalgan holatni tuzatishi mumkin.
Admin umumiy ko‘rinishida o‘quvchi yoki o‘qituvchi kartasini bosib, tegishli
hisoblar ro‘yxatini shu sahifada ko‘rishi mumkin. Pastdagi qizil guruh
ogohlantirishlari bugun boshlangan darslarda kelmagan yoki davomat belgilanmagan
o‘quvchilari bor guruhlarni ko‘rsatadi; guruhni ochib, o‘quvchi, aloqa ma’lumoti
va qaysi darsda holat qayd etilmaganini ko‘rish mumkin.
Umumiy ko‘rinishning yuqori qismidagi **Kelmaganlar** kartasi bugun kelmagan
yoki kelishi qayd etilmagan o‘quvchilar sonini birinchi navbatda ko‘rsatadi;
kartani bosganda ularning ro‘yxati shu sahifada ochiladi.

O‘quvchi hisobini yaratish yoki tahrirlashda dars jadvali hafta kuni va vaqt
tanlagichlari orqali kiritiladi; bir nechta dars kunini qo‘shish mumkin.
Avvaldan saqlangan erkin matndagi jadval yozuvlari o‘chib ketmasligi uchun
tahrirlash oynasida saqlanadi va yangi tanlangan jadval bilan birga yoziladi.

## Render’da joylashtirish

Render hisobida **New + → Blueprint** ni tanlab GitHub repozitoriyani ulang;
Blueprint file path sifatida `ish/tajriba/vite-project/render.yaml` ni kiriting.
Ushbu konfiguratsiya monorepo ichidagi loyiha papkasini root qilib, Render
Blueprint orqali Node web service va doimiy PostgreSQL bazasini yaratadi.
Blueprint `starter` web service va
`basic-256mb` PostgreSQL rejasini tanlaydi; bu pullik xizmatlarni yaratishdan
oldin Render’ning amaldagi narxlarini tekshiring.

Render GitHub’dan build qilib `npm start` ishga tushiradi. HTTPS tekshiruvida
Render’ning `X-Forwarded-Proto` headeridan foydalanadi.
`FUTURE_STEP_RENDER_PROXY=true` faqat Render uchun; boshqa hostingda
ishlatmang.

Deploy tugagach, Render service domenini ochib, ilk administrator hisobini
yarating. Forma Render → Environment bo‘limidagi `FUTURE_STEP_SETUP_KEY`
qiymatini so‘raydi. Admin yaratilgandan keyin bu qiymatni Environment’dan
o‘chirib, redeploy qiling. Maxfiy qiymatni chat, Git yoki ommaviy joyda
ulashmang.

Lokal SQLite ma’lumotlarini Render PostgreSQL’ga bir marta ko‘chirish uchun
avval web service’ni vaqtincha to‘xtating, so‘ng lokal SQLite fayli mavjud
loyiha papkasidan migratsiya skriptini ishga tushiring:

```powershell
$env:DATABASE_URL = "Render PostgreSQL external connection string"
npm run migrate:postgres
Remove-Item Env:DATABASE_URL
```

`DATABASE_URL` parolni o‘z ichiga olishi mumkin; uni terminal tarixi,
screenshot yoki chatda qoldirmang. Maqsad PostgreSQL’da foydalanuvchi,
sessiya, davomat yoki login urinishlari bo‘lsa, migratsiya to‘xtaydi va mavjud
ma’lumotlar ustiga yozmaydi. Foydalanuvchilar, parol xeshlari, davomat,
to‘lov rejalari, to‘lovlar, darslar, darsga yozilishlar, dars izohlari,
darsga oid kelgan/kelmagan qaydlari va markaz sozlamalari saqlanadi.
Xavfsizlik sabab sessiya tokenlari ko‘chmaydi,
foydalanuvchilar qayta kiradi. Avval PostgreSQL backup oling; migratsiya
To‘lov rejasi va to‘lovlar tarixi ham mavjud bo‘lsa ko‘chiriladi; migratsiyadan
oldingi SQLite bazalarida ular bo‘lmasligi mumkin. Migratsiya tugagach web
service’ni qayta ishga tushiring. `DATABASE_POOL_MAX` qiymatini
barcha web instance’lar bo‘yicha jamlab, database ulanish limitidan past
saqlang.

Blueprint domen sotib olmaydi va Google indeksatsiyasini kafolatlamaydi.
Render’ning `onrender.com` domenidan foydalanib boshlash mumkin; o‘z domeningizni
ulash, Search Console’da ro‘yxatdan o‘tish hamda sitemap/robots sozlash kerak.
Sayt `PUBLIC_SITE_URL` qiymatidan `robots.txt` va `sitemap.xml` yaratadi. Render
domeni boshqacha bo‘lsa, bu environment qiymatini haqiqiy HTTPS manzilga
o‘zgartiring. O‘z domeningizni ulaganda `index.html` ichidagi dastlabki
canonical va Open Graph URL’larini ham shu domenga moslab, qayta deploy qiling.

Indekslanishni tezlatish uchun deploy va domen/HTTPS’ni tekshirgach, Google
Search Console’da domen egaligini tasdiqlang, `https://<sayt-domeni>/sitemap.xml`
manzilini **Sitemaps** bo‘limida yuboring va **URL Inspection → Request
indexing** ni bosing. Markaz sozlamalarida aniq nom, manzil, telefon, kurslar
va qisqa tavsifni to‘ldiring. Google qidiruvda qachon chiqishini yoki doim
birinchi o‘rinda turishini kafolatlamaydi.

## Production xavfsizligi va yuklama

Lokal ishlab chiqishda SQLite, production’da `DATABASE_URL` orqali PostgreSQL
ishlatiladi. `DATABASE_URL` belgilanmagan production server xavfsiz tarzda
ishga tushmaydi. Render’dan boshqa hostingda `FUTURE_STEP_HTTPS_KEY_FILE` va
`FUTURE_STEP_HTTPS_CERT_FILE` orqali TLS sertifikati yoki
`FUTURE_STEP_TRUSTED_PROXY_SECRET` bilan himoyalangan HTTPS reverse proxy
talab qilinadi. Proxy tashqi mijoz yuborgan sarlavhalarni almashtirib,
upstream so‘rovlariga `X-Future-Step-Proxy-Secret` va
`X-Forwarded-Proto: https` qo‘shishi kerak. Backend portini internetga ochmang;
backup va database ulanishini hostingda himoyalang.

Parollar bazada PBKDF2-SHA256 xesh ko‘rinishida saqlanadi; sessiya cookie
`HttpOnly`, production’da `Secure`, `SameSite=Strict` xususiyatlariga ega.
Login urinishlari PostgreSQL’da saqlanadi, shu sabab rate limit bir nechta web
instance o‘rtasida umumiy.

Render sozlamasida `UV_THREADPOOL_SIZE=8` o‘rnatilgan. `starter`/`basic-256mb`
boshlang‘ich deployment uchun, minglab bir vaqtdagi foydalanuvchiga kafolat
emas. Yuklamani oshirishdan oldin haqiqiy hostingda yuklama testi, backup’dan
tiklash sinovi, monitoring, instance va database imkoniyatlarini tekshiring.
#   m a r k a z  
 