# Поддерживаемые окружения

Матрица Sprint 3 относится к конкретным сборкам на Windows 10.0.26200 x64, проверенным 9 октября 2026 года. Возможность MP4 проверяется по наличию WebCodecs и поддержке H.264 на выбранных размерах; блокировки по названию браузера нет. Для экспорта нужен HTTPS или localhost. [Публичная HTTPS-приёмка](https://matawaka.github.io/route-story/) прошла на Edge 154.0.4258.62 / Windows_NT 10.0.26200 x64: Standard 20s landscape и30s portrait; [workflow smoke](https://github.com/Matawaka/route-story/actions/runs/37901620765) дополнительно прошёл на Edge 153.0.4234.48 / Windows runner. Это не расширяет проверку Chrome/Firefox на другие версии или ОС. Подробности: [COMPETITION_DELIVERY](COMPETITION_DELIVERY.md).

| Окружение | Предпросмотр / GPX / перемотка | H.264 MP4 | Статус |
| --- | --- | --- | --- |
| Microsoft Edge 154.0.4258.62, Windows desktop | Проверено | Проверены 360p/720p, оба формата; 30s Standard в локальной приёмке | VERIFIED |
| Google Chrome 154.0.8037.98, Windows desktop | Проверено | Проверены четыре разрешения, 10s / 240 кадров | VERIFIED для этой сборки |
| Playwright Firefox 157.0, Windows | Проверено | Четыре разрешения после узкого исправления AVC metadata | VERIFIED для тестовой сборки |
| Playwright WebKit 27.2, Windows | Проверено | В тестовой сборке отсутствует VideoEncoder; приложение показывает причину | UNSUPPORTED для MP4 |
| Playwright Chromium 156.0.8078.4, Pixel 5 emulation на Windows | Проверены мобильный viewport и touch | Экспорт проверен с **настольным** кодировщиком Windows | VERIFIED только эмуляция |
| Физический Android / Chrome | Не проверено | Не проверено | NOT TESTED |
| Физический iPhone/iPad / Safari | Не проверено | Не проверено | NOT TESTED |
| Safari на macOS | Не проверено | Не проверено | NOT TESTED |

В последней матрице не осталось ENVIRONMENT BLOCKED; если браузер/устройство не запускается в новом окружении, это ограничение тестовой среды, а не успешная проверка. Playwright WebKit на Windows не подтверждает поддержку Safari. Снимки мобильного layout не подтверждают экспорт на физическом телефоне.

Если кодировщик недоступен, GPX и Canvas-предпросмотр продолжают работать. Для Standard приложение предлагает явно выбрать совместимое качество; длительность/качество автоматически не меняются. Серверного экспорта и WebM-подмены нет.

Локальная воспроизводимость, точные codec/resolution результаты и ограничения: [COMPATIBILITY.md](COMPATIBILITY.md). Измерения больших треков и отдельных категорий памяти: [PERFORMANCE.md](PERFORMANCE.md). Подготовка выпуска и отдельная публичная проверка: [RELEASE.md](RELEASE.md). Новые версии и другие ОС требуют новой проверки.
