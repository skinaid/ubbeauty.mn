# Supabase Project Alignment

Clinic module-ийн migration, demo seed, reporting preset, reminder queue feature-үүд зөв ажиллахын тулд app ашиглаж байгаа Supabase project ба CLI link хийсэн project ижил байх ёстой.

## Яагаад энэ хэрэгтэй вэ

- App runtime нь `.env.local` дээрх `NEXT_PUBLIC_SUPABASE_URL` project руу холбогдоно.
- `supabase db push` нь CLI link хийсэн project руу migration apply хийнэ.
- Хэрэв эдгээр project ref хоёр зөрвөл migration нэг project дээр, app data өөр project дээр үлдэнэ.

## Одоогийн оношлогоо

- App project ref болон CLI linked project ref хоёрыг dashboard-ийн `Environment diagnostics` card дээр шалгана.
- Хэрэв хоёр ref зөрвөл:
  - dashboard дээр warning alert гарна
  - demo seed action intentionally disabled болно
  - `/reports`, reminder queue, POS smoke test дутуу эсвэл хоосон харагдаж болно

## Зөв болгох алхам

1. App ашиглаж байгаа project-д эрхтэй Supabase account-аар CLI-д нэвтэр.
2. Репо root дээрээс зөв project руу relink хий:

```bash
npx supabase link --project-ref <your-app-project-ref>
```

3. Дараа нь clinic migration-уудаа зөв project руу push хий:

```bash
npx supabase db push --include-all --yes
```

4. App server restart хий.
5. Dashboard дээр `Demo clinic data үүсгэх` товч идэвхжсэн эсэхийг шалга.
6. Дараах урсгалыг smoke test хий:
   - `/dashboard`
   - `/schedule`
   - `/checkout`
   - `/reports`

## Хурдан баталгаажуулах арга

Dashboard дээр:

- warning alert арилсан байх
- `Demo clinic data үүсгэх` товч идэвхтэй байх
- seed хийсний дараа өнөөдрийн metrics, queue, report shortcuts хоосон биш болох

## Хэрэв link хийхдээ access error гарвал

- CLI-д нэвтэрсэн хэрэглэгч app ашиглаж байгаа project дээр owner/admin эрхтэй эсэхийг шалга.
- Өмнөх account-аас logout хийж дахин login хийнэ:

```bash
npx supabase logout
npx supabase login
```

- Дараа нь relink/push алхмуудыг дахин ажиллуул.
