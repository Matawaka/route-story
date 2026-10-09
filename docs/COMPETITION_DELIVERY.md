# Route Story — комплект конкурсной поставки

Обновлено **9 октября 2026 года**. **Публичный выпуск v1.0.0 VERIFIED; Gates 6A/6B выполнены.** HTTPS-приложение работает анонимно, два полных MP4 получены через его интерфейс и опубликованы. Все восемь assets скачаны повторно и проверены по SHA-256. Документация обновляется в существующем PR #5; он не объединён. Конкурсная заявка **NOT SUBMITTED**.

Разработка началась 8 октября 2026 года, Asia/Yekaterinburg. 14 октября — внутренний календарный день семь; отдельный срок/час подачи организатора не установлен.

## Проверенные публичные ссылки и код

- Приложение: [https://matawaka.github.io/route-story/](https://matawaka.github.io/route-story/).
- Репозиторий: [Matawaka/route-story](https://github.com/Matawaka/route-story).
- Release и tag: [v1.0.0](https://github.com/Matawaka/route-story/releases/tag/v1.0.0), опубликован 2026-10-09T09:37:08Z по GitHub API.
- Production SHA и фактический target tag: `5f39332b7358949d248da6b2f99ba445ee1b41e8`.
- [Main-push CI 37896163991](https://github.com/Matawaka/route-story/actions/runs/37896163991) SUCCESS: clean install, 92 unit, build, 23 browser pass/3 intentional skips.
- [Единственный deployment 37901620765](https://github.com/Matawaka/route-story/actions/runs/37901620765) SUCCESS: build, deploy, https-acceptance. Owner human review выполнен; новый deployment не запускался.
- Реальный URL подтверждён output `page_url`, env APP_URL downstream job и success deployment status 6955784587; предполагаемый адрес не использовался как доказательство.
- Sprint PR #1–#4 MERGED владельцем. Документационный [PR #5](https://github.com/Matawaka/route-story/pull/5), ветка `codex/sprint-5-public-launch`, base main, остаётся OPEN. Точный documentation HEAD — в Git/PR; production SHA не меняется из-за обновления журнала.

## Материалы поставки

| Материал | Реальный результат |
| --- | --- |
| Live HTTPS и independently reproducible startup | VERIFIED; сайт выше, чистый checkout tag v1.0.0 и npm.cmd команды в README |
| ATLAS 16:9 | [atlas-20s.mp4](https://github.com/Matawaka/route-story/releases/download/v1.0.0/atlas-20s.mp4) |
| NIGHT 9:16 | [night-30s.mp4](https://github.com/Matawaka/route-story/releases/download/v1.0.0/night-30s.mp4) |
| Independent video reports | [Atlas JSON](https://github.com/Matawaka/route-story/releases/download/v1.0.0/atlas-20s.mp4.validation.json), [Night JSON](https://github.com/Matawaka/route-story/releases/download/v1.0.0/night-30s.mp4.validation.json) |
| Synthetic GPX | [synthetic.gpx](https://github.com/Matawaka/route-story/releases/download/v1.0.0/synthetic.gpx), [synthetic-antimeridian.gpx](https://github.com/Matawaka/route-story/releases/download/v1.0.0/synthetic-antimeridian.gpx), явно синтетические/MIT |
| Проверенный ZIP | [route-story-v1.0.0.zip](https://github.com/Matawaka/route-story/releases/download/v1.0.0/route-story-v1.0.0.zip), 3 326 982 bytes/19 entries; site соответствует public manifest |
| Контрольные суммы | [SHA256SUMS.txt](https://github.com/Matawaka/route-story/releases/download/v1.0.0/SHA256SUMS.txt); все 8 assets анонимно скачаны и совпали с локальными SHA-256 |
| License/attribution | MIT, Travel Animation, Natural Earth, Mediabunny MPL-2.0; тексты доступны в deployed package и проверены по hashes |
| Поддержка платформ | [SUPPORTED_PLATFORMS](SUPPORTED_PLATFORMS.md), ограниченная реальными сборками/тестами |
| Демонстрация/заявка | [DEMONSTRATION](DEMONSTRATION.md), [готовый текст](COMPETITION_SUBMISSION.md) |
| Машинные доказательства | [RELEASE_EVIDENCE.json](RELEASE_EVIDENCE.json), отдельный sprint6PublicRelease; исторические результаты сохранены |

## Gate 6A — реальная HTTPS-приёмка

Workflow smoke выполнил два 10s Standard exports на Edge 153.0.4234.48 / Windows runner. Actual artifact acceptance-https-smoke.json скачан и прочитан; publicHttps:true, sourceCommit 5f39332, статус VERIFIED. Установочный audit — zero vulnerabilities.

Повторная независимая проверка этого сайта на текущем компьютере:

```powershell
$env:APP_URL = 'https://matawaka.github.io/route-story/'
$env:EXPECTED_COMMIT = '5f39332b7358949d248da6b2f99ba445ee1b41e8'
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node scripts/acceptance/release.mjs --smoke
node scripts/acceptance/release.mjs
Remove-Item Env:APP_URL, Env:EXPECTED_COMMIT
```

Обе команды VERIFIED. Полная команда создаёт Atlas 20s / Night 30s из публичного UI, сохраняет реальные downloads, независимо декодирует и воспроизводит их в native HTML video. Это не localhost и не substitute exporter. Окружение: Windows_NT 10.0.26200 x64 / Edge 154.0.4258.62 / Node 24.19.0; физического телефона в этой проверке нет.

Проверены anonymous HTTP 200, secure context, точный release.json SHA, все 10 file hashes, JS/CSS/Natural Earth/licenses/samples и правильный `/route-story/`. Работают импорт, оба стиля/формата, title/duration controls, Play/Pause/Seek и детерминированное обратное seeking, Standard capability, отмена и последующий экспорт, повторный экспорт в том же сеансе. Simulated unavailable VideoEncoder сохраняет preview и показывает WebCodecs error. Mobile viewport 390×844 без horizontal overflow.

Пакет сайта: 392336 bytes до manifest. Ни одного unexpected cross-origin/POST/WebSocket, 404 response или page error. Local/session storage пусты, IndexedDB/Cache Storage/cookies отсутствуют; reload удаляет user route. Meta CSP restrictive, без unsafe-inline/unsafe-eval; **CSP response header не наблюдался**. Meta не заменяет все security headers. Не заявляется универсальная безопасность памяти/поддержка устройств.

## Полные видео с публичного сайта

Оба получены из явно синтетических GPX:9 точек Atlas и80 точек Night через 180°. Кодировщикavc1.42001f/H.264 Constrained Baseline, Standard 5 Mbps. Расстояние/набор высоты рассчитаны по GPX:46,15 км / 290 м и70,77 км / 392 м. Это не реальные поездки или приватная GPS-история.

| Параметр | ATLAS | NIGHT |
| --- | --- | --- |
| Формат/размер | 16:9/1280×720 | 9:16/720×1280 |
| Длительность/FPS/кадры | 20.000s/24/480 | 30.000s/24/720 |
| Размер MP4 | 1 553 778bytes | 2 282 557bytes |
| Export wall time | 1212.3ms | 1703.6ms |
| SHA-256 | cc9eca7f4c39363997b2f51369f242f9ae9444eac94a1fc3c3b5395622d5c938 | cb3d7553e859c2e4fe0ca469299a9eb126d9641d245ae9d8d2334195932b69fe |
| Native playback | Загрузка/seek/движение времени VERIFIED | Загрузка/seek/движение времени VERIFIED |
| FFmpeg/ffprobe | Без ошибок, все480 frames | Без ошибок, все720 frames |

Это отдельные наблюдения, не median benchmark и не обещание другим устройствам. Walltime включает capability/рендер/encode/finalize, исключает download/independent decode. Native/process/JS-heap/GPU memory в этой приёмке **NOT MEASURED**; отдельные Sprint 3 наблюдения — [PERFORMANCE](PERFORMANCE.md).

FFmpeg6.1.1/ffprobe подтвердили MP4/H.264, размеры, длительность с допуском одного кадра,24 FPS, полное число кадров, timestamps i/24 и packet durations 1/24 с допуском10 µs; decode stderr при -v error пуст.480/720 различных frame hashes, начало/финал различны. После публикации оба MP4 скачаны заново и ещё раз независимо декодированы. Из этих реальных видео просмотрены кадры1/10/19s и1/15/29s: читаемые названия/метрики, видимые endpoints, верные intro/replay/outro. Screenshot не является проверкой physical phone usability.

## Gate 6B — опубликованные assets

Release создан после успешной HTTPS-приёмки с явным ранее полученным разрешением владельца. До создания проверены отсутствие Release/tag v1.0.0; после создания target lightweight tag проверен по API и точно равен reviewed 5f39332. Tag не перемещался; новый workflow не создавался, дополнительных deployments нет.

Все8returned browser_download_url проверены **анонимным GET200**; bytes/SHA-256 совпали с finalized local files. Проверенный ZIP скачан с тем же hash d50a3b54c022cae51068c6f86859dbf04d19d6faa758f8deb1d157d834fcdb8e; каждый из19 entries заранее прочитан и сверён. В public assets только static site/licenses/synthetic GPX/validated MP4/reports/checksums: нет private routes, .reference, node_modules или API/memory diagnostic dumps.

Новые MP4 имеют те же размеры/геометрию, но другие file hashes, чем Sprint 4. Здесь приведены **пересчитанные** public-export hashes; исторические значения не копировались в новые reports.

## Историческая локальная приёмка — сохранена

Sprint 4 full check:92 unit/build/25 browser pass, один unresolved-license external-data skip,37.8s; оба30s720p/5000 points прошли. Исходный local video commit 67d1726662742af33066df8cffde331a4270f77b: Atlas 20s 1557.6ms/hash 8eca832f3eab547c07b3a3a22765711e4019d7427fdb023e3dadd04d6aeb4b26; Night 30s 1737.7ms/hash 80a12e42c94315a9269dbf67d0d121ba0a6e71a6537b155fb9b40371af8ea60a. Они были VERIFIED локально/publicHttps:false и теперь не выдаются за public exports.

Sprint 5 fresh exact-main check:92 unit/build/23 browser pass/3 opt-in skips,27.9s; mainCI32.0s. Local package392837 bytes/10 files и local smoke10s/10s VERIFIED. Различие байтов пакета между Windows checkout и Linux deployment включает line endings; сравнение всегда по manifest фактического build. Старые ZIP/videos сохранены в игнорируемых artifacts; исходные historical JSON и journal остаются в репозитории. Реальный Hong Kong route manual test не включён в Git или Release из-за unresolved redistribution license.

## Соответствие переданному анонсу Вайбатона

| Минимальное требование | Доказательство |
| --- | --- |
| Документированный импорт | GPX 1.0/1.1 track/route points, safe XML; unit/E2E и public UI |
| Корректный старт/финиш/геометрия | geographic distance/segment gaps/antimeridian regression; public exports |
| Реальный анимированный replay | timestamp timeline, moving marker, deterministic seek; не prerecord preview |
| Два разных стиля | Atlas/Night в public site и MP4 |
| Два factual information elements | distance + ascent при полной elevation series, иначе recorded point count |
| 9:16 и16:9 готовые файлы | PublicNight/Atlas downloads с independently decoded H.264 |
| Продукт независимо от компьютера автора | Anonymous live HTTPS, publicrepo/README, воспроизводимый tag startup |
| Защита: импорт→стиль→replay→export→openvideo | Automated public UI acceptance и manual DEMONSTRATION; публичная защита организаторам ещё не проведена |

По **переданному владельцем тексту** отсутствующих обязательных продуктовых пунктов не выявлено. Вес оценки: экспорт30%, visual/storytelling25%, route15%,UX10%,technical10%,formats5%,demo5%. Это не оценка жюри и не заявление официальной eligibility. Оригинальный пост в закрытом Telegram недоступен: точный URL не предоставлен, публичный поиск не нашёл источник, Telegram posting connector отсутствует. Независимая сверка полной редакции правил остаётся **NOT VERIFIED**.

## Оставшиеся действия

1. Владелец рассматривает существующий PR #5 с фактическими URL/evidence; автоматического merge/redeploy нет.
2. Подтвердить точный конкурсный пост/дополнительные требования. Готовый русский текст — [COMPETITION_SUBMISSION](COMPETITION_SUBMISSION.md).
3. Владелец размещает текст и проверенные ссылки комментарием к посту в закрытом Telegram-канале «Вайбкодинговая». Для отправки агентом нужны точный пост, доступ и отдельная авторизация. **NOT SUBMITTED**.

Physical Android/iOS/Safari остаются NOT TESTED; Windows WebKit MP4 UNSUPPORTED в ранее проверенной сборке. Новых feature/renderer/exporter изменений для выпуска не потребовалось.
