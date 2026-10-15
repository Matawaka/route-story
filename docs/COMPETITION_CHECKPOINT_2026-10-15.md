# Конкурсная проверка Route Story — 15 октября 2026

Дедлайн владельца: 16 октября 2026; точное время подачи не указано.

Исходный код: PR #31, codex/interactive-storyboard-mvp17, d1b75ca2e5997bf2647b86983f653fa5f8c535f8.
Проверенный CI: https://github.com/Matawaka/route-story/actions/runs/38586972334 — SUCCESS, 319 unit, TypeScript/build, 72 browser PASS / 39 skipped. Runner checkout: служебный merge 4d3171872153c49a6f444603f2866618ea2c2ec9.
Артефакт: https://github.com/Matawaka/route-story/actions/runs/38586972334/artifacts/11906183827 (исходный срок хранения до 21 октября).

## Новая изолированная приёмка

Эта ветка добавляет только тест, обработку настоящей видеозаписи и read-only CI workflow. Production src, package pins, limits, safety checks, original PR #31 и main не меняются. Слияние, Pages, Release и защищённые настройки не запрашиваются и не выполняются.

- Тест использует настоящий существующий интерфейс и встроенный синтетический Furka GPX: выбор маршрута, стиль, replay, открытие редактора, проверенный ракурс, время, Undo/Redo, локальный .rstory.json, повторное открытие с теми же пикселями, 16:9/9:16, реальный UI MP4.
- Контекст Playwright записывает настоящий интерфейс в WebM. FFmpeg делает MP4 и один непрерывный GIF-фрагмент; нарисованных или сгенерированных кадров нет.
- Сохраняются 3 полноразмерных снимка интерфейса, включая редактор в двух форматах, и дополнительный mobile viewport.
- Существующие storyboard.spec.ts, validate-video.mjs и high-resolution.mjs сохраняются со всеми прежними утверждениями.
- Отдельные Full HD/4K jobs проверяют 10s в 16:9 и 9:16, terrain/director A/B, реальный H.264 decode, точные preview/preencode pixels и cancel/retry. Эти A/B не доказывают Full HD/4K с пользовательским монтажом.
- Статусы новых проверок PENDING до фактического завершения workflow. Физические устройства, 4K60/native picker, музыка и все остальные длительности не объявляются проверенными.

## Публичная версия и PR

Известный публичный адрес: https://matawaka.github.io/route-story/. Main на момент чтения GitHub API: 4dd38163ec2c898db14d35fc516129b9fd4be456 (MVP1.6). Журнал связывает его с успешным Pages run 38560776521, но прямой HTTPS smoke в текущей среде не выполнен. Не утверждать текущую доступность или sourceCommit сайта без отдельной проверки release.json.

PR #31 добавляет интерактивный storyboard, временную карту, независимые безопасные ракурсы по формату, Undo/Redo и локальные переносимые проекты. Он остаётся draft/open/unmerged; эти возможности не следует приписывать публичному сайту.

## Среда этой сессии

Системная песочница не даёт создать localhost listener (listen EPERM) и запустить Chromium (setsockopt EPERM, SIGTRAP). Сетевая установка/клонирование не завершились; разрешение не получено. Исходники получены через подключённый GitHub API, проверены Git blob hashes. Локального npm ci/typecheck/browser PASS не заявлено. Для реального UI используется отдельный Windows/Edge GitHub Actions runner с существующими закреплёнными зависимостями.

Итоговые числа, media hashes и ссылки нужно дополнить после завершения CI. Только синтетические маршруты; приватных GPX/видео в этой ветке нет.
