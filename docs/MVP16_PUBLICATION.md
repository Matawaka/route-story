# MVP 1.6 — проверенная публикация

Публикация завершена 14 октября 2026 года после явного разрешения владельца на merge/deployment и его личного подтверждения защищённого окружения GitHub.

- Приложение: https://matawaka.github.io/route-story/
- Реальный production commit: `4dd38163ec2c898db14d35fc516129b9fd4be456`.
- PR #29: https://github.com/Matawaka/route-story/pull/29 — MERGED; проверенный head `547b2e66db7be270701f41ef6b0cc97cee3c04fd`.
- Exact main CI: https://github.com/Matawaka/route-story/actions/runs/38559460254 — SUCCESS.
- Единственный Pages run: https://github.com/Matawaka/route-story/actions/runs/38560776521 — build, deploy и https-acceptance SUCCESS.
- Deployment API вернул именно указанный URL; `release.json` независимо подтверждает production commit.

Защищённый workflow, main-only policy и обязательный reviewer Matawaka сохранены. Включены прежние approved-пакеты Sogne, Furka и автоматическая география. Публичный манифест содержит 45 проверенных ресурсов: 8 509 623 байта + 7 844 байта `release.json` = **8 517 467 байт**, в пределах 9 MiB. SHA-256 манифеста: `5b3dca3bf0ea928d7ad5e1750d2aaae95992cccf717c76afae96cd0c61ebdceb`. Предыдущее локальное измерение 8 519 086 байт остаётся отдельным результатом; опубликованный пакет проверен по собственным хешам.

## Полные видео нового режиссёра через HTTPS

Сцена — утверждённый **синтетический** дорожный пример Furka, а не запись человеческого путешествия. Источники и `© swisstopo` сохранены. Использован действительный основной интерфейс опубликованного приложения, без импорта исходных модулей или замены экспортера.

Среда: Windows 10.0.26200 x64, Microsoft Edge 155.0.4283.45. Режим Standard, H.264 Constrained Baseline, 24 FPS.

| Сцена | Размер | Длительность | Декодировано кадров | MP4, байт | Результат |
|---|---|---:|---:|---:|---|
| Atlas, режиссёр, 16:9 | 1280 × 720 | 20 с | 480 | 12 912 115 | VERIFIED |
| Night, режиссёр, 9:16 | 720 × 1280 | 30 с | 720 | 18 635 031 | VERIFIED |
| Повтор после отмены, 9:16 | 720 × 1280 | 10 с | 240 | 6 501 236 | VERIFIED |

Оба основных ролика действительно выбрали director без fallback. Независимые FFmpeg/ffprobe декодировали все кадры, проверили точные временные метки, размеры, длительность и частоту. Карта непустая и меняется во всех кадрах. Точный PNG предпросмотра совпал с реальным Canvas-источником `VideoFrame` перед кодированием при том же разрешении; reverse seek вернул тот же PNG. Отмена прервала экспорт, повтор завершился без перезагрузки. Не было внешних запросов, ошибок страницы и сохранения маршрута.

SHA-256:

- 20 с, 16:9: `11d27be4ce6aac4442f313cbc10129903772f488012b78f779fd26944822a30c`.
- 30 с, 9:16: `b591c5001f9531c12dab58cb773db8cf605a1714d60f483ed532538eb551861e`.

Измеренные 14,96 и 22,71 секунды включают экспорт, получение файла и независимую проверку; это не отдельное время кодирования. Снимки интерфейса и декодированных кадров, сами MP4 и отчёты находятся в ignored `artifacts/director-publication/public-main/`. Машиночитаемая сводка: [MVP16_DEPLOYMENT_EVIDENCE.json](MVP16_DEPLOYMENT_EVIDENCE.json).

Воспроизведение проверки на Windows PowerShell:

```powershell
$env:APP_URL='https://matawaka.github.io/route-story/'
$env:EXPECTED_COMMIT='4dd38163ec2c898db14d35fc516129b9fd4be456'
$env:ACCEPTANCE_DIR='artifacts/director-publication/public-main'
$env:PLAYWRIGHT_CHANNEL='msedge'
node scripts/acceptance/director-public.mjs
```

## Общая HTTPS-приёмка

Существующий workflow прошёл весь HTTPS job за 8 минут 22 секунды на Windows / Edge виртуального runner. Проверены начальная загрузка Swiss в едином интерфейсе, Sogne photo, оба aspect ratio, хеши, отмена/повтор, лицензии и локальная обработка. [Артефакт public-https-acceptance](https://github.com/Matawaka/route-story/actions/runs/38560776521/artifacts/11893516298) имеет размер 27 905 512 байт и хранится GitHub 7 дней. Он скачан обратно, все **семь** MP4 повторно независимо декодированы на этом компьютере.

Каждый из этих семи файлов — **10 секунд / 240 кадров**. Исторические имена `smoke-atlas-20s` и `smoke-night-30s` не означают полную длительность в smoke-режиме. Полные 20/30-секундные публичные ролики режиссёра подтверждены отдельной проверкой выше.

Дополнительный локально запущенный тест **реального HTTPS** `scripts/acceptance/release.mjs --smoke` прошёл с `EXPECTED_AUTO_GEOGRAPHY=1`. Подтверждены anonymous HTTP 200, secure context, правильный `/route-story/` subpath, все 45 SHA-256, CSP и notices, синтетический GPX и antimeridian GPX, воспроизведение/seek, две реальные Standard-записи, native playback, cancel/recovery и понятный отказ при симулированном отсутствии WebCodecs. Отказ от передачи области внешнему провайдеру сохраняет рабочую локальную карту; до согласия внешних запросов нет. Storage, cookies, unexpected requests, bad responses и page errors отсутствуют.

## Границы этой приёмки

- Новый режиссёр в Full HD и 4K ранее прошёл настоящие локальные экспорт/декодирование; эти результаты сохранены в [CAMERA_DIRECTOR_EVIDENCE.json](CAMERA_DIRECTOR_EVIDENCE.json). Новая отдельная публичная 4K-приёмка здесь не выполнялась.
- Физические macOS / Android / iOS для нового режиссёра — **NOT TESTED**. Смена размера viewport не считается физическим тестом.
- Нативная память и VRAM в этом публичном прогоне не измерялись. Предыдущие локальные наблюдения не подменяют эти измерения.
- Bounded smoke проверяет наличие и согласие автоматической географии; новый live-поиск Sentinel/DEM в этом прогоне — **NOT TESTED**. Предыдущие фактические Mont Blanc/Malerweg результаты сохранены отдельно, приватные маршруты и видео не публиковались.
- Старые режимы камеры остаются доступны; непригодные новые ракурсы имеют явный безопасный fallback. Доказательства непрерывной безопасности и известные визуальные ограничения см. [CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md).
- Package version остаётся `1.2.0-rc.1`; MVP 1.6 — название улучшения. Новые tag/GitHub Release не создавались, старые releases не изменялись.

Отдельный handover [PR #30](https://github.com/Matawaka/route-story/pull/30) содержит журнал и инструмент публичной проверки. Он не изменяет опубликованный production SHA и не сливается автоматически; обновление этих документов само по себе не запускает повторный деплой.
