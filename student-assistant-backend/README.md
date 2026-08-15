# Student Assistant Backend

Bu backend, `student-assistant-frontend` projesi için yazilmistir. Express.js kullanir, veriler JSON dosyalarinda tutulur (odev oldugu icin DB kullanmadim).

## Kurulum

```bash
npm install
```

## Calistirma

```bash
npm start
```

Veya gelistirme modunda (otomatik yeniden baslatma icin):

```bash
npm run dev
```

Sunucu `http://localhost:3001` adresinde calisir.

## .env Dosyasi (opsiyonel)

Chatbot icin gercek AI cevaplari istiyorsan:

```bash
cp .env.example .env
```

Sonra `.env` dosyasini ac ve `ANTHROPIC_API_KEY` degerini gir. (https://console.anthropic.com/'dan alabilirsin.)

API key olmadan da chatbot calisir, ama anahtar kelimeye gore basit cevaplar doner.

## Test Kullanicisi

| Email | Sifre |
|-------|-------|
| test@test.com | 123456 |
| ahmet@test.com | 123456 |

## Endpoint'ler

### Auth
- `POST /api/auth/login` - Giris yap
- `POST /api/auth/logout` - Cikis yap
- `GET  /api/auth/me` - Aktif kullanicinin bilgisi

### Courses
- `GET  /api/courses` - Tum dersler (?status=active&search=db filtresiyle)
- `GET  /api/courses/summary` - Ozet (toplam kredi, ortalama vb.)
- `GET  /api/courses/:id` - Tek ders

### Forms
- `GET  /api/forms` - Tum formlar (?status=open filtresiyle)
- `GET  /api/forms/:id` - Tek form
- `POST /api/forms/:id/submit` - Form gonder
- `GET  /api/forms/submissions/all` - Tum basvurularim

### Schedule
- `GET  /api/schedule` - Haftalik program
- `GET  /api/schedule/today` - Bugunun dersleri

### Transcript
- `GET  /api/transcript` - Tum donemler
- `GET  /api/transcript/summary` - GPA, toplam kredi vs.
- `GET  /api/transcript/:id` - Tek donem

### Attendance
- `GET  /api/attendance` - Devamsizlik verileri
- `GET  /api/attendance/summary` - Genel ozet

### Chat
- `POST /api/chat` - Chatbot mesaji
  - Body: `{ messages: [...], system: "..." }`

## Dosya Yapisi

```
.
├── server.js            # Ana sunucu
├── db.js                # JSON okuma/yazma helper'i
├── package.json
├── .env.example
├── data/                # Mock veriler
│   ├── users.json
│   ├── courses.json
│   ├── forms.json
│   ├── transcript.json
│   ├── attendance.json
│   └── submissions.json
└── routes/              # API endpoint'leri
    ├── auth.js
    ├── courses.js
    ├── forms.js
    ├── schedule.js
    ├── transcript.js
    ├── attendance.js
    └── chat.js
```

## Notlar

- Token'lar hafizada tutuluyor, sunucu yeniden baslayinca silinir. Gercek projede JWT veya Redis kullanilmali.
- Sifreler plaintext, hash yok. Bu sadece odev olduguna gore boyle birakildi (gercek projede bcrypt kullanilmali).
- Veriler tek kullanici uzerinden tutuldugu icin form basvurusu yapinca herkes icin status degisiyor. Bu yine odev olmasi sebebiyle boyle kaldi.
