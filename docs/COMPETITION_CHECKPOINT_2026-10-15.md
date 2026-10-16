# Route Story — конкурсная приёмка 15 октября 2026

Дедлайн владельца: **16 октября 2026**; точное время подачи не указано. Конкурсная заявка не отправлялась.

**Главный результат:** реальная цепочка «синтетический маршрут → стиль → replay → интерактивный storyboard → настоящие MP4» воспроизведена в существующем приложении на Windows/Edge CI. Код приложения остался на точном HEAD PR #31 `d1b75ca2e5997bf2647b86983f653fa5f8c535f8`. PR #31 открыт как draft и не слит. Изолированный [PR #32](https://github.com/Matawaka/route-story/pull/32) содержит сценарии, запись и отчёт; production src, зависимости и лимиты не менялись.

## Скачать и посмотреть

- **[Пакет медиа — 12 935 469 байт, около 13 МБ](https://github.com/Matawaka/route-story/actions/runs/38791344649/artifacts/12000553386)**: три основных настоящих full-page PNG (replay, editor 16:9, editor 9:16), дополнительный mobile viewport, непрерывный GIF редактора **18,24 с**, два настоящих MP4 **20 с / 24 FPS / 480 кадров** — 640×360 и 360×640, локальный проект и JSON-доказательства.
- **[Полная запись интерфейса и исходные доказательства — около 72 МБ](https://github.com/Matawaka/route-story/actions/runs/38791344649/artifacts/11999864361)**: Playwright WebM и транскодированный MP4, **333,04 с**, включая медленное кодирование на CI. GIF — один непрерывный фрагмент этой записи. Нарисованных или сгенерированных кадров нет.
- [Проверка публичного сайта и три MP4, включая 720p](https://github.com/Matawaka/route-story/actions/runs/38791344649/artifacts/12001015068).
- [Full HD: настоящие MP4 и кадры, около 87 МБ](https://github.com/Matawaka/route-story/actions/runs/38791344649/artifacts/12000308254), [маленький отчёт](https://github.com/Matawaka/route-story/actions/runs/38791344649/artifacts/12001315330).
- [4K: четыре проверенных MP4 и кадры, около 204 МБ](https://github.com/Matawaka/route-story/actions/runs/38791344649/artifacts/12000164831), [четыре независимых отчёта декодирования](https://github.com/Matawaka/route-story/actions/runs/38791344649/artifacts/12001656406). **Это частичная приёмка: отмена/повтор не пройдены.**

Скачивание Actions требует входа в GitHub. Артефакты сохраняются **до 29 октября 2026**; для конкурсной формы следует скачать и приложить сам ZIP/медиа. Постоянная копия бинарных медиа в Git не создана. ZIP скачан и проверен: SHA-256 `81b868ed0ddba36c0044243319ff7e34a443145101ecdeddf9987cb5706266ac`.

Синтетический исходник: [Furka GPX на точном SHA](https://github.com/Matawaka/route-story/blob/d1b75ca2e5997bf2647b86983f653fa5f8c535f8/public/regions/furka/furka-synthetic.gpx). Проект `synthetic-furka.rstory.json` не содержит GPX: в версии PR #31 выберите встроенный Furka, затем откройте проект. Источники карты и © swisstopo сохранены в видео/интерфейсе.

## Что доступно

| Объём | Подтверждённое состояние |
| --- | --- |
| [Публичный сайт](https://matawaka.github.io/route-story/) | MVP1.6, sourceCommit `4dd38163ec2c898db14d35fc516129b9fd4be456`. Свежая HTTPS-приёмка: 45 файлов/хешей, 8 509 623 байта, синтетическая Furka, replay/seek, отмена и реальные H.264 360p/720p в обоих форматах, отсутствие внешних запросов/ошибок, preview при неподдерживаемом кодеке. Новый deployment не выполнялся. |
| Только PR #31 | Storyboard, проверенные ракурсы по формату, время сцен, акцент участка, Undo/Redo, локальные проекты и повторная географическая валидация. Редактор **не опубликован** на публичном сайте. |
| Незавершённое / не проверенное | Музыка; физические Mac/Android/iOS/Safari; MP4 Full HD/4K после пользовательского монтажа; 4K60/native save picker; все длительности и комбинации. Подробная 3D-карта ограничена проверенным покрытием, обзорная 2D-карта не означает всемирное подробное фото. |

Короткий готовый текст: [COMPETITION_SUBMISSION_RU.txt](COMPETITION_SUBMISSION_RU.txt).

## Технические результаты

| Проверка | Результат и точная ссылка |
| --- | --- |
| Оригинальный HEAD/CI PR #31 | HEAD повторно подтверждён неизменным. [Run 38586972334](https://github.com/Matawaka/route-story/actions/runs/38586972334) SUCCESS: 319 unit, TypeScript/build, 72 browser PASS / 39 skip. Checkout CI — служебный merge `4d3171872153c49a6f444603f2866618ea2c2ec9`. |
| Свежий полный регресс evidence-кода | [Run 38791344637](https://github.com/Matawaka/route-story/actions/runs/38791344637) SUCCESS: clean npm ci, audit 0, 319 unit / 28 files, TypeScript/build, 72 browser PASS / 40 intentional skips. Проверенный head тестов `8a824cede9d4b65a30790719db92693cf3033d3c`; production-код совпадает с PR #31. |
| Реальный редактор и запись | [Job 116616394436](https://github.com/Matawaka/route-story/actions/runs/38791344649/job/116616394436) SUCCESS: существующие два storyboard-теста + новая конкурсная цепочка, **3 PASS**. Undo/Redo, изменение времени, безопасный ракурс, save/reopen .rstory.json, точный тот же кадр после reload/seek, 16:9/9:16 и viewport 390×844. Это desktop Edge, не физический телефон. |
| Детерминированность/защита | Существующий тест проверяет точные preview/encoder/reverse pixels, отказ поддельному ready-объекту, один прежний GPU, неизменный GPX, отмену/восстановление и auto reset. Проект ограничен 128 КиБ, 24 сцены, 40 Undo, без координат/URL/исходного GPX. Полная прежняя проверка камеры/350 м/LOS/no-data не ослаблялась. |
| Full HD | [Job 116616394149](https://github.com/Matawaka/route-story/actions/runs/38791344649/job/116616394149) SUCCESS. 10 с, terrain/director A/B в 1920×1080 и 1080×1920: H.264, 240 кадров каждый, все timestamps, точные одинакового размера preview/preencode pixels, одинаковые source identities, нет encoding-time запросов, cancel/retry PASS; retry также декодирован. **Это автоматические камеры, не монтаж Full HD.** |
| 4K | Четыре 10-секундных MP4 3840×2160 / 2160×3840, H.264/240 кадров, независимо декодированы. В [раннем агрегате](https://github.com/Matawaka/route-story/actions/runs/38789679716/artifacts/12000875006) также точные preview/preencode pixels, A/B source identity, нулевые occluded/uncovered, director safe-area 0. Но #cancel click превысил 30 с; последующие jobs отменены по бюджету 20 минут. **Полная 4K cancel/retry-приёмка не пройдена; причина требует отдельной диагностики. Таймауты/ассерты не ослаблялись.** |
| Независимое локальное декодирование | Дополнительно скачаны и декодированы системными FFmpeg/ffprobe 8: 16 исходных CI MP4 + 3 публичных + 2 смонтированных = **21 файл / 4608 кадров**. Размеры, H.264, FPS, длительность, все PTS/duration и меняющиеся frame hashes проверены. Для ffprobe8 использовано duration_time вместо старого pkt_duration_time. Приложение локально повторно не запускалось. |

В сравнительном старом `terrain` 16:9 — 9 из 241 поз вне эталонной caption-safe области; у `director` — 0. В прочитанном A/B-отчёте director clearance минимум 615,91 м (landscape) / 688,69 м (portrait), occluded/uncovered 0. Это не утверждение о новой continuous native-2m LOS-проверке. SwiftShader/виртуальная Windows и sampled process memory не доказывают физическую мобильную поддержку, VRAM, точные пики памяти или отсутствие утечек.

Машинные данные: [COMPETITION_EVIDENCE_2026-10-15.json](COMPETITION_EVIDENCE_2026-10-15.json).

## Воспроизведение

На evidence-ветке в Windows PowerShell, без изменения ExecutionPolicy:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
$env:UNIFIED_UX_ACCEPTANCE='1'
$env:STORYBOARD_ACCEPTANCE='1'
$env:COMPETITION_DEMO='1'
npm.cmd ci
npm.cmd run test
npm.cmd run build
npx.cmd playwright install ffmpeg
npx.cmd playwright test tests/e2e/storyboard.spec.ts tests/e2e/competition-demo.spec.ts
node scripts/acceptance/competition-media.mjs
```

Full HD/4K используют неизменённый `scripts/acceptance/high-resolution.mjs` через `competition-high-resolution.mjs` и существующий `withServer`: HIGH_RES_DURATIONS=10, HIGH_RES_CAMERAS=terrain,director, HIGH_RES_REQUIRE_DIRECTOR=1, HIGH_RES_QUALITY=fullhd либо ultra, SWISS_BASELINE=0. Все точные env и команды закреплены в [.github/workflows/competition.yml](../.github/workflows/competition.yml). Публичная приёмка — существующий swiss-public.mjs, APP_URL указан выше, EXPECTED_COMMIT=4dd38163ec2c898db14d35fc516129b9fd4be456.

В sandbox текущей среды localhost listener и Chromium запрещены (listen/setsockopt EPERM). Исходники получены через GitHub API и сверены с Git blob hashes; настоящие UI/экспорты выполнены на Windows/Edge GitHub Actions. Первые ошибки нового test harness (жизненный цикл сервера, выбор финальной сцены вместо replay, ожидание async file.text) исправлены только в изолированной evidence-ветке. Существующие safety assertions сохранены.

PR #31 и #32 не слиты. Pages, Release, теги и защищённые настройки не менялись. Использованы только синтетические маршруты; приватные GPX/видео не загружались.

**Один следующий шаг до дедлайна:** отправить конкурсную заявку с медиа ZIP и ссылкой на PR #31, явно указав, что storyboard демонстрируется в PR, а публичный сайт пока MVP1.6.
