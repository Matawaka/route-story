# Route Story — комплект конкурсной поставки

Обновлено 9 октября 2026 года. **Подготовка выпуска выполнена локально; публичная поставка PENDING.** Слияние release PR, настройка GitHub Pages, deployment и GitHub Release требуют явного разрешения владельца. Заявка организаторам не отправлена. 14 октября — внутренний календарный день семь; час подачи организаторами не установлен.

## Репозиторий и точный код

- Публичный репозиторий: [Matawaka/route-story](https://github.com/Matawaka/route-story).
- PR [#1](https://github.com/Matawaka/route-story/pull/1), [#2](https://github.com/Matawaka/route-story/pull/2), [#3](https://github.com/Matawaka/route-story/pull/3) уже MERGED владельцем, каждый с итоговой базой main.
- Проверенный main: `dd86c372b6d6c757d7327e22366b402f60ad9b4e`; [main CI](https://github.com/Matawaka/route-story/actions/runs/37889234952) SUCCESS. Его дерево совпадает со Sprint 3 `488db3b327b37379c3a225ecaaa3984210145012`.
- Release branch: `release/route-story-v1`, от этого main. Стек предыдущих PR больше не блокирует выпуск.
- Точный commit идентифицированной локальной release-приёмки: `67d1726662742af33066df8cffde331a4270f77b`, подтверждён в origin. Последующие изменения README/журнала/доказательств не изменяют production-приложение.
- Release PR: **PENDING — ссылка будет добавлена после создания**. Проверки final main после его разрешённого слияния: **PENDING**.
- Публичный HTTPS URL и GitHub Release: **PENDING**. Предполагаемый адрес не выдаётся за существующий.

## Обязательные материалы

| Материал | Статус и доказательство |
| --- | --- |
| Проверенный commit | main dd86c372…, release acceptance 67d17266…; финальный reviewed SHA будет закреплён в PR |
| Публичный репозиторий | VERIFIED, ссылка выше |
| Работающий HTTPS URL | PENDING: Pages не настроен, deployment не запускался |
| Чистая локальная установка | VERIFIED: Node 24.19.0, `npm.cmd ci`, build/check; команды в README |
| Публичный синтетический GPX | VERIFIED: [учебный GPX](../public/samples/synthetic.gpx), [переход через 180°](../public/samples/synthetic-antimeridian.gpx); MIT, явно синтетические |
| ATLAS 16:9 MP4 | VERIFIED локально; `artifacts/release/atlas-20s.mp4`; public release asset URL PENDING |
| NIGHT 9:16 MP4 | VERIFIED локально; `artifacts/release/night-30s.mp4`; public release asset URL PENDING |
| Независимая проверка видео | VERIFIED: FFmpeg/ffprobe, [машинный отчёт](RELEASE_EVIDENCE.json), таблица ниже |
| Публичное заявление поддержки | [SUPPORTED_PLATFORMS](SUPPORTED_PLATFORMS.md), ограничено фактически испытанными сборками |
| README и проверенный screenshot | [README](../README.md), [production screenshot](images/route-story.png) |
| Лицензии / атрибуции | MIT, Travel Animation, Natural Earth, Mediabunny MPL; тексты включены в dist и проверены по hashes |
| Ограничения | README, SUPPORTED_PLATFORMS, PERFORMANCE, RELEASE; нет обещания универсальной мобильной поддержки |
| Описание и демонстрация | Текст ниже, [DEMONSTRATION](DEMONSTRATION.md); настоящий UI/export, синтетические GPX |
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

Примеры и JSON-отчёты подготовлены локально для последующей публикации в GitHub Release. В source Git MP4 не добавлены. Синтетический QA JSON и screenshot можно просмотреть в release PR. Не распространять любые `.reference`/external GPX или видео из unresolved-license Hong Kong acceptance.

## Регрессии и security gate

- Базовый main: 88 unit / 22 browser pass, build pass; 3 intentional opt-in skips.
- Release routine: 92 unit / 23 browser pass, build pass; 3 intentional opt-in skips (4s regression и 20s Standard остаются в routine CI).
- Full local: `PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 npm.cmd run check` — 92 unit / 25 browser pass, build pass; один внешний unresolved-license GPX test skipped; 37.8s browser suite. Оба 30s Standard / 5000-point теста проходят.
- `npm.cmd ci` clean install — zero vulnerabilities; `npm.cmd audit` и `npm.cmd audit --omit=dev` — zero vulnerabilities. Runtime и dev версии закреплены без изменений.
- `npm.cmd run release:package` — десять public files, 392357 bytes до manifest; лицензии/карта/синтетические примеры сверены с source. Extra-data rejection и `/route-story/` проверены тестом.
- `npm.cmd run release:acceptance` — VERIFIED локально для exact 67d17266…, два финальных MP4, native playback, intro/replay/outro, reversible seek, отмена/повтор, обе композиции, viewport 390×844 без горизонтального overflow.
- Локальный production CSP без unsafe-inline/unsafe-eval; meta присутствует, CSP response header у локального тестового хоста отсутствует. Публичные response headers пока не проверены.
- Нет cross-origin/POST/ошибочных HTTP/JS запросов. Local/session storage, IndexedDB, caches и cookies пусты; reload очищает пользовательский маршрут. Unsupported VideoEncoder в отдельном тестовом page даёт объяснение и сохраняет preview.
- В release changes нет новых зависимостей, секретов, приватных GPX, telemetry или ослабления лимитов. Перед разрешённой публикацией повторить exact-main gate и проверить изменения с момента этого отчёта.

## Краткое описание для заявки

Route Story от Matawaka превращает GPX в воспроизводимую анимированную историю маршрута. Пользователь выбирает название, стиль Atlas или Night, 10/20/30 секунд и горизонтальный либо вертикальный формат, смотрит и перематывает маршрут, затем сохраняет настоящее H.264 MP4. Расстояние рассчитано по исходным географическим координатам; сегменты не соединяются выдуманными линиями. Обработка и кодирование идут в браузере, без загрузки личного GPX на сервер, аккаунтов, телеметрии и внешних карт. Для демонстрации используются явно синтетические GPX. Код открыт по MIT с сохранением сторонних лицензий и атрибуций. Поддержка экспорта определяется возможностями кодировщика конкретного браузера; проверенные окружения и ограничения опубликованы отдельно.

Поля ссылки на приложение, release videos и фактического submission подтверждения дополняются только после выполнения соответствующих действий. Требования организатора сверх переданного owner specification не проверялись.

## Оставшиеся действия

1. Владелец рассматривает release PR и явно разрешает merge + Pages/public release assets.
2. Выполнить утверждённое слияние, проверить полный main SHA и успешную main CI; сохранить source branches.
3. Настроить Pages source GitHub Actions и защищённое `github-pages` окружение (main-only, human reviewer); выполнить ручной reviewed-SHA workflow.
4. Проверить возвращённый реальный HTTPS URL без аккаунта: assets/subpath/CSP/privacy, preview, unsupported encoder, cancellation/retry, actual downloads и independent decoding. Green deployment без URL-проверки не считается приёмкой.
5. Опубликовать validated синтетические MP4/GPX/reports в GitHub Release, повторно скачать, сверить hashes, добавить существующие URL в README и этот документ.
6. После успешной публичной приёмки подготовить фактическую отправку заявки по предоставленному владельцем каналу организатора. Отдельное разрешение/данные submission не получены.
