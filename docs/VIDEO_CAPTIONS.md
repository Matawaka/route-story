# Подписи в кадре

В разделе «Оформление» настройка **«Пояснения в видео и предпросмотре»** имеет два значения:

- **Показывать подписи и показатели** — прежний вид, выбран по умолчанию.
- **Без пояснений · карта и путешественник** — убирает название, интро/финальные пояснения, расстояние, вторую метрику, легенду уклона, подписи Старт/Финиш, географические подписи2D, компас, шкалу, прогресс и необязательное брендинг-оформление. Картографические данные, путь, цвет по уклону, темп, путешественник и камера сохраняются.

Обязательные подписи источников сохраняются на компактной контрастной подложке. 3D использует точные проверенные manifest.attribution для DEM и imagery (включая modified Copernicus Sentinel и Kartverket CC BY4.0); Swiss сохраняет © swisstopo. За рельефом маркер по-прежнему соединён с настоящим якорем пунктиром, даже когда его текстовая подпись скрыта. При явной2D-схеме без загруженной карты не создаётся вымышленная атрибуция Natural Earth.

Настройка отличается от кнопки **«Скрыть пояснения»** интерфейса: та управляет только вспомогательным текстом страницы и не меняет видеокадры. Режимы не связаны. Название и метрики не удаляются из данных; название остаётся в поле/имени файла и возвращается при включении подписей. Выбор кадра сохраняется в памяти при смене маршрута; приватные данные не сохраняются/не отправляются.

Технически это validated immutable StoryConfig.captionMode=full/none, с full для legacy callers. Preview и MP4 используют один renderer и timestamp. Во время экспорта поле заблокировано; даже принудительное изменение DOM не меняет активный snapshot. Точки/сегменты/пacing/350m clearance/LOS/camera/resource readiness/размеры/24fps не меняются, интро/аутро не пропускаются. Нет нового источника данных/шрифта/зависимости/workflow или лимита.

## Проверенная локальная реализация

Runtime commit c3a9db942fcb323501eeee5b36a14d30bc5773c6, base main1d303ab; код не опубликован.220unit/20files,build,56browserPASS/30explicit skips,audit0. Отдельные full captions+previous unified19PASS;5caption cases rerun on committed runtime PASS. Classic/Cinematic Atlas/Night в обоих аспектах,0/6/20s, reversible seek, UI independence, title restore, occlusion cue, immutable export/cancelretry и реальное3D/720p покрыты.

Реальные чистые видео:2D10s640×360240frames; Swiss20s1280×720480frames и30s720×1280720frames. ВсеH.264/24fps,independent FFmpeg/ffprobe decode/PTS/full-frame counts. Direct export pixels exactly equal preview; decoded MAE и every-frame central-geography variance recorded. Полные файлы/отчёты в artifacts/video-captions; [машинные результаты](VIDEO_CAPTIONS_EVIDENCE.json). Время exportMs включает создание/сохранение download и исключает последующий FFmpeg; не сравнивается с другими границами замера. Physical/native/GPU tests NOTTESTED/NOTMEASURED.

С подписями (тот же timestamp/камера/маршрут/output):

![Подписи включены](images/captions-atlas-full.png)

Без пояснений:

![Atlas без пояснений](images/captions-atlas-clean.png)

![Night без пояснений](images/captions-night-clean.png)

## Повторение

PowerShell:

```powershell
npm.cmd run check
$env:PLAYWRIGHT_CHANNEL='msedge'
$env:CI='1'
$env:SWISS_PILOT='1'
$env:SWISS_BASELINE='0'
$env:UNIFIED_UX_ACCEPTANCE='1'
$env:FULL_EXPORT_ACCEPTANCE='1'
npx.cmd playwright test tests/e2e/captions.spec.ts tests/e2e/unified.spec.ts
```

Публикация этого нового режима требует owner review/merge и отдельного разрешённого protected Pages выпуска. Предыдущая публикация1d303ab остаётся рабочей.
