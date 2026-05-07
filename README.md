# 🌟 Habit Tracker

تطبيق ويب لمتابعة العادات اليومية — مبني بـ Flask + SQLite + HTML/CSS/JS.

## المتطلبات

- Python 3.8+
- pip

## التشغيل

```bash
# 1. ثبّت الـ dependencies
pip install -r requirements.txt

# 2. شغّل السيرفر
python app.py
```

ثم افتح المتصفح على: **http://localhost:5000**

## هيكل المشروع

```
habit_tracker/
├── app.py                  ← Flask backend + SQLite API
├── habits.db               ← قاعدة البيانات (بتتعمل تلقائياً)
├── requirements.txt
├── templates/
│   └── index.html          ← صفحة الـ HTML الرئيسية
└── static/
    ├── css/style.css       ← كل التصميم
    └── js/app.js           ← كل منطق الـ frontend
```

## الـ Features

- **عادات يومية** — إضافة، تعديل، حذف
- **Streak Heatmap** — زي GitHub
- **XP System وLevel Up**
- **AI Coach** — تحليل الأداء ونصايح
- **Mood Tracker** — تسجيل المزاج اليومي
- **Badges** — جوائز على الإنجازات
- **قاعدة بيانات SQLite** — كل البيانات محفوظة

## الـ API Endpoints

| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| GET    | /api/habits | كل العادات مع حالتها |
| POST   | /api/habits | إضافة عادة جديدة |
| DELETE | /api/habits/:id | حذف عادة |
| POST   | /api/complete/:id | تبديل إكمال العادة |
| GET    | /api/stats | الإحصائيات العامة |
| GET    | /api/heatmap | بيانات الـ heatmap |
| GET    | /api/weekly | أداء الأسبوع |
| POST   | /api/mood | حفظ مزاج اليوم |
| GET    | /api/mood/today | مزاج اليوم |
