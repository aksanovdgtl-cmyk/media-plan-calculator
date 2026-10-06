# Калькулятор медиаплана / Media Plan Calculator

Планирование бюджета, показов, кликов, результатов и продаж по четырем рекламным системам. В расчет входят сценарии, месяцы и распределение бюджета. Результат можно скачать в Excel.

Автор: [Марат Аксанов](https://aksanov.digital/about), [Aksanov.Digital](https://aksanov.digital).

## Онлайн-версии

- [media-plan-calculator](https://aksanov.digital/tools/advertising/media-plan-calculator)

Весь каталог: [инструменты для маркетинга и бизнеса](https://aksanov.digital/tools).

## Запуск

Скачайте или клонируйте репозиторий. Откройте `index.html` в современном браузере. Сборка и регистрация не нужны. Для локального сервера:

```sh
python3 -m http.server 8080
```

Откройте `http://localhost:8080`. Страницы инструмента:

- `index.html`

Формулы медиаплана доступны отдельно в `src/engine.js`; модуль поддерживает `require()` в Node.js.

## Данные и зависимости

Вводные и загруженные отчеты обрабатываются в браузере. Код инструмента не отправляет их на сервер и не подключается к рекламным аккаунтам. В этой версии нет счетчиков сайта и скриптов Tilda.

SheetJS CE 0.20.3, Apache-2.0. Библиотека загружается с cdn.sheetjs.com для выгрузки Excel. Ее код не включен в этот репозиторий.

Для загрузки внешней библиотеки нужен интернет. В запросах к CDN передаются обычные сетевые данные, включая IP; содержимое загруженного отчета туда не отправляется. Внешние изображения из исходной страницы также могут загружаться с CDN. Пользовательские шрифты не включены, используется системный запасной шрифт из исходного стека.

## Ограничения

Прогноз использует введенные CPC, CPM, CTR и конверсии. Он не подключается к рекламным кабинетам. Пороги и предупреждения в коде служат ориентирами, а фактические результаты могут отличаться.

## Проверки

```sh
npm install
npm test
```

Проверки используют синтетические вводные, расчетные примеры и файлы. Зависимости из `devDependencies` нужны для тестов; для открытия инструмента установка npm-пакетов не требуется.

## Исходная версия

Код выделен из опубликованных страниц Aksanov.Digital 2026-10-06. Расчетные формулы и пороги сохранены. HTML, CSS и JavaScript разнесены по файлам; внутренние ссылки ведут на исходный сайт. Источники и контрольные суммы фрагментов: [provenance.json](provenance.json).

## Как сослаться

Используйте кнопку GitHub «Cite this repository» или файл [CITATION.cff](CITATION.cff). В статье, презентации или описании своей доработки можно указать:

> Марат Аксанов. Калькулятор медиаплана. Aksanov.Digital. https://aksanov.digital/tools/advertising/media-plan-calculator

Ссылка на онлайн-версию при упоминании инструмента приветствуется. MIT требует сохранить уведомление об авторстве и текст лицензии в копиях кода; добавлять ссылку на сайт по условиям лицензии не требуется.

## Лицензия

[MIT](LICENSE), copyright 2026 Marat Aksanov. Лицензия относится к коду и документации этого проекта. Сторонние библиотеки и внешние медиа остаются под собственными лицензиями.

## English

Client-side media planning for Google Ads, Meta Ads, Yandex Direct and Telegram Ads. Compare scenarios, allocate budgets and export a monthly plan to Excel. The calculation engine also runs in Node.js.

Author: [Marat Aksanov](https://aksanov.digital/about). Original tools and methodology: [Aksanov.Digital](https://aksanov.digital/tools).

Open `index.html` in a modern browser, or serve the folder with `python3 -m http.server 8080`. No build step or account is required. Input data stays in the browser. Excel features require the pinned third-party CDN library noted above. This source snapshot excludes Tilda runtime and analytics. See [CITATION.cff](CITATION.cff) for attribution and [LICENSE](LICENSE) for MIT terms.
