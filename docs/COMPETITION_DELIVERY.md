# Route Story — комплект конкурсной поставки

Обновлено 9 октября 2026 года. **Все четыре sprint PR объединены владельцем; Gate 5A пройден на merged main. Публичная поставка PENDING.** Окружение `github-pages` защищено, но включение Pages, deployment и GitHub Release требуют отдельного разрешения владельца. Заявка организаторам не отправлена. 14 октября — внутренний календарный день семь; час подачи организаторами не установлен.

## Репозиторий и точный код

- Публичный репозиторий: [Matawaka/route-story](https://github.com/Matawaka/route-story).
- PR [#1](https://github.com/Matawaka/route-story/pull/1), [#2](https://github.com/Matawaka/route-story/pull/2), [#3](https://github.com/Matawaka/route-story/pull/3), [#4](https://github.com/Matawaka/route-story/pull/4) MERGED владельцем, каждый с итоговой базой main. PR #4 merged at 2026-10-09T06:56:01Z.
- Проверенный release main: `5f39332b7358949d248da6b2f99ba445ee1b41e8`; [main-push CI 37896163991](https://github.com/Matawaka/route-story/actions/runs/37896163991) SUCCESS. Его дерево точно совпадает с final Sprint 4 head `3e4d6cb44b654c1b0a5616d20049a3a49e8916ff`.
- Документационная ветка Sprint 5: `codex/sprint-5-public-launch`, от этого main. Предыдущий PR-стек больше не блокирует выпуск; новая документация автоматически не сливается и не запускает redeployment.
- Документационный [PR #5](https://github.com/Matawaka/route-story/pull/5) OPEN, base main; checkpoint `ba2b8cff933bcecec40f3b038d8f0d45b30f99a3` подтверждён remote. [CI 37900902826](https://github.com/Matawaka/route-story/actions/runs/37900902826) SUCCESS: clean install, 92 unit / 23 browser, build, 3 intentional skips, 37.0s browser suite. Следующие journal/link changes не меняют application/workflow; current HEAD указан в Git/PR.
- Точный commit идентифицированной локальной release-приёмки: `67d1726662742af33066df8cffde331a4270f77b`, подтверждён в origin. Последующие изменения README/журнала/доказательств не изменяют production-приложение.
- Exact-main CI: clean install, 92 unit / 23 browser pass, build pass, 3 intentional skips, 32.0s browser suite. Такая же свежая локальная проверка merged main — 92 / 23, сборка прошла, 3 пропуска, 27.9s. Это проверка merged SHA, не только старой release-ветки.
- Публичный HTTPS URL и GitHub Release: **PENDING**. Предполагаемый адрес не выдаётся за существующий.

## Обязательные материалы

| Материал | Статус и доказательство |
| --- | --- |
| Проверенный commit / версия | main `5f39332b7358949d248da6b2f99ba445ee1b41e8`, package 1.0.0; tag `v1.0.0` PENDING |
| Публичный репозиторий | VERIFIED, ссылка выше |
| Работающий HTTPS URL | PENDING: Pages source не включён, deployment не запускался |
| Защита publication | VERIFIED через API: `github-pages`, reviewer Matawaka, только main, owner self-review разрешён; требуется ручное подтверждение человеком |
| Чистая локальная установка | VERIFIED: Node 24.19.0, `npm.cmd ci`, build/check; команды в README |
| Публичный синтетический GPX | VERIFIED anonymous HTTP200, exact-main bytes: [учебный GPX](https://raw.githubusercontent.com/Matawaka/route-story/5f39332b7358949d248da6b2f99ba445ee1b41e8/public/samples/synthetic.gpx), [переход через 180°](https://raw.githubusercontent.com/Matawaka/route-story/5f39332b7358949d248da6b2f99ba445ee1b41e8/public/samples/synthetic-antimeridian.gpx); MIT, явно синтетические |
| ATLAS 16:9 MP4 | VERIFIED локально; `artifacts/release/atlas-20s.mp4`; public release asset URL PENDING |
| NIGHT 9:16 MP4 | VERIFIED локально; `artifacts/release/night-30s.mp4`; public release asset URL PENDING |
| Независимая проверка видео | VERIFIED: FFmpeg/ffprobe, [машинный отчёт](RELEASE_EVIDENCE.json), таблица ниже |
| Публичное заявление поддержки | [SUPPORTED_PLATFORMS](SUPPORTED_PLATFORMS.md), ограничено фактически испытанными сборками |
| README и проверенный screenshot | [README](../README.md), [production screenshot](images/route-story.png) |
| Лицензии / атрибуции | MIT, Travel Animation, Natural Earth, Mediabunny MPL; тексты включены в dist и проверены по hashes |
| Ограничения | README, SUPPORTED_PLATFORMS, PERFORMANCE, RELEASE; нет обещания универсальной мобильной поддержки |
| Описание и демонстрация | [Текст заявки](COMPETITION_SUBMISSION.md), [DEMONSTRATION](DEMONSTRATION.md); настоящий UI/export, синтетические GPX |
| Итоговая публичная приёмка | PENDING: после разрешения — реальный HTTPS smoke, публичные downloads и проверка SHA-256 |

## Примеры: фактическая проверка

Окружение: Windows_NT 10.0.26200 x64, Microsoft Edge 154.0.4258.62, headless Playwright 1.64.0, Node 24.19.0. Production package served locally at `/route-story/`, secure localhost context. **Это не публичный HTTPS и не физический телефон.** Кодировщик `avc1.42001f`, H.264 Constrained Baseline, целевой битрейт 5 Мбит/с. Данные настоящего GPX, но координаты маршрутов созданы синтетически.

| Параметр | ATLAS | NIGHT |
| --- | --- | --- |
| Исходный файл / точек | synthetic.gpx / 9 | synthetic-antimeridian.gpx / 80 |
| Размер GPX в этой проверке | 897 bytes | 5383 bytes |
| Название | Учебный маршрут · ATLAS | Через 180° · NIGHT |
| Формат / качество | 16:9 / Standard | 9:16 / Standard |
| Размер кадра | 1280×720 | 720×1280 |
| Длительность | 20.000s | 30.000s |
| FPS / декодированных кадров | 24 / 480 | 24 / 720 |
| Размер MP4 | 1 553 778 bytes | 2 282 557 bytes |
| Export wall time | 1557.6ms | 1737.7ms |
| Визуальные метрики | 46,15 км / набор высоты 290 м | 70,77 км / набор высоты 392 м |
| Независимый decoder | FFmpeg 6.1.1 + ffprobe; без ошибок | FFmpeg 6.1.1 + ffprobe; без ошибок |
| Уникальных decoded frame hashes | 480 | 720 |
| Native browser playback | Загрузка, seek, ненулевое движение времени проверены | Загрузка, seek, ненулевое движение времени проверены |

SHA-256 MP4:

```text
atlas-20s.mp4  8eca832f3eab547c07b3a3a22765711e4019d7427fdb023e3dadd04d6aeb4b26
night-30s.mp4  80a12e42c94315a9269dbf67d0d121ba0a6e71a6537b155fb9b40371af8ea60a
```

Измерение — по одному финальному экспорту на этом компьютере, не median benchmark и не обещание скорости другим устройствам. Время включает capability check, рендер/кодирование и MP4 finalization, исключает download и независимое декодирование. JS heap, native/process peak и GPU memory в Sprint 4 не измерялись; достоверные отдельные Sprint 3 наблюдения и их ограничения сохранены в PERFORMANCE.md.

FFprobe подтвердил MP4/H.264, размеры, длительность в пределах одного кадра, 24 FPS и полное число кадров. Для каждого кадра проверены timestamp `i/24` и длительность `1/24` с допуском 10 микросекунд. FFmpeg декодировал каждый кадр без stderr при `-v error`; все изображения меняются, начало и финал различны. Кадры 0/1/10/19/19.958s (Atlas) и 0/1/15/29/29.958s (Night) извлечены из реальных MP4. Визуально проверены вступление, середина, финал и крайние кадры: читаемые названия/метрики, видимые старт/финиш, корректная короткая геометрия через 180°. Полные названия доступны в UI; для вертикального примера выбрано короткое название без ellipsis.

Примеры созданы в Sprint 4 на `67d17266…`; файлы присутствуют на текущем компьютере. В Sprint 5 оба повторно независимо декодированы и SHA-256 совпали с историческим RELEASE_EVIDENCE.json. Проверенный merged main содержит ту же production-реализацию. Минимальные шесть assets и SHA256SUMS подготовлены в игнорируемом `artifacts/sprint5/release-assets/`; это ещё не публикация. GPX assets фиксируют LF-байты exact-main source, совпадающие с исходными примерами. После публичной приёмки новые видео с сайта, если выбранные для публикации, получат собственные отчёты/контрольные суммы. В source Git MP4 не добавлены. Не распространять `.reference`/external GPX или видео из unresolved-license Hong Kong acceptance.

Новый локальный `artifacts/sprint5/route-story-v1.0.0-candidate.zip` содержит package exact main 5f39332 и минимальные synthetic assets: 3 326 641 bytes / 19 файлов, SHA-256 `74d433faa39e81fca4c7367e7c74026e0d61c13f3fae2781ae560feafe9455b4`. Размер и SHA-256 каждого файла проверены чтением ZIP; manifest сайта фиксирует точный source. Нет diagnostics/API responses, node_modules или private GPX. Публичное размещение PENDING.

Исторический `artifacts/release/route-story-v1-release-candidate.zip` тоже найден: 3 326 598 bytes, SHA-256 `6ee20e5bb6e88d3e765032bc2dc8465f3d1c5cc31bcbee19870074247b8d7d5c`. Он фиксирует старый site/video source 67d17266… и review checkpoint a9b78bee…; сохранён отдельно и не выдаётся за новый main package. Рабочий localhost не заявляется как публичный URL; временный acceptance host закрывается после проверки.

## Регрессии и security gate

- Exact merged main: `npm.cmd ci`; `$env:PLAYWRIGHT_CHANNEL='msedge'; npm.cmd run check` — 92 unit / 23 browser pass, build pass, 3 intentional opt-in skips. Все проверки завершились успешно; 4s regression и 20s Standard остаются в routine CI. Main CI проверил тот же полный SHA.
- Full Sprint 4 local: `PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 npm.cmd run check` — 92 unit / 25 browser pass, build pass; один внешний unresolved-license GPX test skipped; 37.8s browser suite. Оба 30s Standard / 5000-point теста прошли. Production-код не изменился при merge; повтор тяжёлого profiling не требовался.
- `npm.cmd ci` clean install — zero vulnerabilities; `npm.cmd audit` и `npm.cmd audit --omit=dev` — zero vulnerabilities. Runtime и dev версии закреплены без изменений.
- `node scripts/package-release.mjs` на exact main — десять public files, 392837 bytes до manifest, sourceCommit 5f39332 / version 1.0.0; лицензии/карта/примеры сверены с checkout. Разница с LF-пакетом Sprint 4 (392357 bytes) обусловлена CRLF checkout, не новой runtime-зависимостью. Extra-data rejection и `/route-story/` проверены тестом.
- `npm.cmd run release:acceptance` — VERIFIED локально для exact 67d17266…, два финальных MP4, native playback, intro/replay/outro, reversible seek, отмена/повтор, обе композиции, viewport 390×844 без горизонтального overflow.
- `node scripts/acceptance/release.mjs --smoke` на main 5f39332 — VERIFIED локально, два отдельных 10s Standard MP4, native playback, все 10 hashes, отмена/повтор, unsupported API, пустое storage, viewport 390×844 без overflow. PublicHttps:false; это не проверка живого сайта. После публикации обязательно выполнить smoke и отдельный full public export 20s/30s.
- Локальный production CSP без unsafe-inline/unsafe-eval; meta присутствует, CSP response header у локального тестового хоста отсутствует. Публичные response headers пока не проверены.
- Нет cross-origin/POST/ошибочных HTTP/JS запросов. Local/session storage, IndexedDB, caches и cookies пусты; reload очищает пользовательский маршрут. Unsupported VideoEncoder в отдельном тестовом page даёт объяснение и сохраняет preview.
- В release changes нет новых зависимостей, секретов, приватных GPX, telemetry или ослабления лимитов. Перед разрешённой публикацией повторить exact-main gate и проверить изменения с момента этого отчёта.

## Краткое описание для заявки

Route Story от Matawaka превращает GPX в воспроизводимую анимированную историю маршрута. Пользователь выбирает название, стиль Atlas или Night, 10/20/30 секунд и горизонтальный либо вертикальный формат, смотрит и перематывает маршрут, затем сохраняет настоящее H.264 MP4. Расстояние рассчитано по исходным географическим координатам; сегменты не соединяются выдуманными линиями. Обработка и кодирование идут в браузере, без загрузки личного GPX на сервер, аккаунтов, телеметрии и внешних карт. Для демонстрации используются явно синтетические GPX. Код открыт по MIT с сохранением сторонних лицензий и атрибуций. Поддержка экспорта определяется возможностями кодировщика конкретного браузера; проверенные окружения и ограничения опубликованы отдельно.

Поля ссылки на приложение, release videos и фактического submission подтверждения дополняются только после выполнения соответствующих действий. Канал подачи указан владельцем: комментарий к посту в закрытом Telegram-канале «Вайбкодинговая». Точной ссылки на оригинальный пост пока нет. Оценка ниже основана на переданном тексте анонса, а не на независимо открытом источнике.

## Соответствие переданному анонсу Вайбатона

| Требование | Наблюдаемое доказательство / оставшееся действие |
| --- | --- |
| Документированный импорт маршрута | GPX 1.0/1.1, track/route points, safe XML; unit/E2E. GeoJSON/CSV не обязательны при поддержке документированного GPX |
| Настоящая геометрия, старт/финиш | Географическое расстояние, сегменты без мостов, antimeridian/duplicates; regression и VIDEO_VALIDATION |
| Динамический replay | Shared timestamp timeline, реальное движение/seek/детерминированные кадры; не заранее записанный preview |
| Минимум два заметно разных стиля | Atlas/Night, проверены в обоих форматах/качествах, screenshots в VISUAL_VALIDATION |
| Минимум два информационных элемента | Расстояние + набор высоты при полной серии высот, иначе число точек; без выдуманных дат/скоростей |
| Готовые 9:16 и 16:9 файлы | Реальные local Night 30s и Atlas 20s MP4, независимое декодирование; публичные downloads PENDING |
| Независимо проверяемый продукт | Репозиторий/README и воспроизводимый запуск VERIFIED; live HTTPS PENDING |
| Защита: импорт → стиль → replay → export → открыть видео | DEMONSTRATION + реальный UI acceptance локально; публичная защита/сайт PENDING |

Вес оценки по переданному анонсу: готовый экспорт 30%, визуал/storytelling 25%, маршрут/анимация 15%, UX 10%, техника 10%, форматы 5%, финальная демонстрация 5%. Фокус финального этапа — публикуемый рабочий результат и настоящая демонстрация. Это не присвоенная оценка жюри и не сертификация конкурсного соответствия. Соло-разработка, AI-разработка и MIT задокументированы; никаких чужих неопубликованных маршрутов @wahrier в комплекте нет.

## Оставшиеся действия

1. Получить отдельное разрешение владельца на включение Pages, manual dispatch и GitHub Release v1.0.0. Merge уже выполнен владельцем; разрешение публикации ещё отсутствует.
2. Перед dispatch повторно проверить exact remote main и его successful main-push CI, существующий main-only/human-reviewer environment; включить Pages source GitHub Actions.
3. Запустить существующий workflow с полным reviewed SHA; владелец вручную подтверждает защищённый deploy в GitHub. Агент не нажимает Approve за владельца.
4. Проверить возвращённый HTTPS URL анонимно: assets/subpath/manifest/licenses/CSP/privacy, оба стиля/формата, seek/cancel/retry, independent decode. После smoke выполнить отдельный полный 20s/30s export на живом сайте.
5. Опубликовать v1.0.0 на точном reviewed SHA, validated synthetic MP4/GPX/reports; анонимно скачать каждый asset и сверить SHA-256. Только затем заполнить реальные URL в focused docs PR. Не сливать PR/redeploy автоматически.
6. Владелец размещает [готовый текст заявки](COMPETITION_SUBMISSION.md) и проверенные ссылки комментарием к посту в закрытом Telegram-канале «Вайбкодинговая». Точная ссылка пока не предоставлена. Отправка агентом требует отдельного доступа/разрешения. Статус: NOT SUBMITTED.
