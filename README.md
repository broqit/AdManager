# AdManager

Бібліотека AdManager, призначена для взаємодії з Google DFP.

## Вступ

AdManager - це бібліотека JavaScript для взаємодії з [Google Publisher Tags (GPT)](https://support.google.com/dfp_sb/answer/1649768?hl=en) та [Google DFP](https://www.google.com/dfp). Вона відповідає за завантаження бібліотеки GPT, а також за визначення та запит рекламного інвентарю. Нижче наведено документацію з конфігурації та використання.

- [Встановлення](#встановлення)
- [Основне використання](#основне-використання)
- [Налаштування](#налаштування)
- [Інвентар](#інвентар)
- [Події](#події)
- [Динамічна вставка](#динамічна-вставка)
- [Оновлення](#оновлення)
- [Посилання](#посилання)

## Встановлення

### Yarn

AdManager може бути встановлено використовуючи [yarn](https://yarnpkg.com/). Для цього ви можете скористатися CLI:

```bash
$ yarn add @broqit/AdManager --save
```

Або визначити його у файлі package.json:

```javascript
    "dependencies": {
        "@broqit/AdManager": "latest"
    }
```

### Пряме завантаження

Якщо ви не використовуєте менеджери пакетів, бібліотеку можна прямо завантажити з GitHub, використовуючи кнопку **Download ZIP**.

## Основне використання

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AdManager Використання</title>
    <script src="AdManager.min.js"></script>
</head>
<body>
    <!--
    This is the ad unit container. AdManager looks for all of the
    [data-ad-unit] in the DOM and grabs the slot name to make a
    request from DFP to fill those units.
    -->
    <div data-ad-unit="Unit_Name_in_DFP"></div>

    <script>
        ( function () {

            var config = {
                account: 1234567,
                inventory: [
                    {
                        slot: 'Unit_Name_in_DFP',
                        sizes: [
                            [ 728, 90 ],
                            [ 970, 250 ],
                            [ 1000, 220 ]
                        ]
                    }
                ]
            };

            AdManager( config );

        } () );
    </script>
</body>
</html>
```

## Налаштування

Для ініціалізації AdManager потрібен об'єкт конфігурації.

| key                                      | type    |
| ---------------------------------------- | ------- |
| [`account`](#account)                    | Integer |
| [`autoload`](#autoload)                  | Boolean |
| [`clientType`](#clienttype)              | String  |
| [`inventory`](#inventory)                | Array   |
| [`context`](#context)                    | String  |
| [`enabled`](#enabled)                    | Boolean |
| [`targeting`](#targeting)                | Array   |
| [`insertionEnabled`](#insertionenabled)  | Array   |
| [`insertion`](#insertion)                | Object  |

**Приклад конфігурації:**

```javascript
{
    account: 1234567,
    clientType: 'desktop',
    inventory: [
        {
            slot: 'Unit_Name_in_DFP',
            sizes: [
                [ 728, 90 ],
                [ 970, 250 ],
                [ 1000, 220 ]
            ]
        }
    ]
}
```

### `account`

**Тип:** Integer

**За змовчуванням:** `null`, обов'язково вказується

**Опис:** Ваш мережевий код, знайдений у вкладці "Адміністратор" DFP

[:arrow_up:](#налаштування)

### `autoload`

**Тип:** Boolean

**За змовчуванням:** `true`

**Опис:** Чи запускати процес ініціалізації банерів автоматично.

[:arrow_up:](#налаштування)

### `clientType`

**Тип:** String

**За змовчуванням:** `'default'`, optional

**Опис:** Оголошується тип клієнта (наприклад, настільний комп'ютер, планшет або мобільний телефон). Значення може бути встановлене зовнішнім сценарієм виявлення клієнта і буде використовуватися для порівняння з кожною одиницею інвентаризації, щоб побачити, чи повинен товар відображатися для цього клієнта.

Наприклад, якщо виявлено десктопний пристрій, для цього значення слід встановити значення `clientType: 'desktop'` та банери в масиві інвентарю, які збігаються (`type: 'desktop'`) будуть відображені. Це дозволяє включати як десктопні, так і мобільні елементи інвентарю, але показувати лише відповідні відповідно до того, що `clientType` встановлено значення під час завантаження.

[:arrow_up:](#налаштування)

### `inventory`

**Тип:** Array

**За змовчуванням:** `[]`, обов'язково вказується

**Опис:** Масив з одного або кількох об'єктів, які визначають різні типи оголошень. Дивіться розділ «Інвентаризація» нижче. Більш детальну інформацію можна знайти в розділі [inventory section below](#інвентар).

Приклад:
```javascript
var config = {
    // ...
    inventory: [
        {
            slot: 'Unit_Name_1',
            sizes: [
                [ 728, 90 ],
                [ 970, 250 ],
                [ 1000, 220 ]
            ]
        },
        {
            slot: 'Unit_Name_2',
            sizes: [
                [ 728, 90 ],
                [ 970, 250 ],
                [ 1000, 220 ]
            ]
        },
        // ...
    ]
};
```

[:arrow_up:](#налаштування)

### `context`

**Тип:** String

**За змовчуванням:** `'body'`, необов'язково

**Опис:** Використовується як селектор JavaScript, який визначає контекст DOM, куди потрібно вставити рекламу. У стандартних випадках це буде статично, оскільки буде лише одна сторінка. У програмах нескінченної прокрутки може існувати кілька сторінок в одному вікні, і це дає можливість відрізнити одну сторінку від іншої.

[:arrow_up:](#налаштування)

### `enabled`

**Тип:** Boolean

**За змовчуванням:** `true`, необов'язково

**Опис:** Це дає можливість вимкнути AdManager.

[:arrow_up:](#налаштування)

### `insertionEnabled`

**Тип:** Boolean

**За змовчуванням:** `false`, необов'язково

**Опис:** Чи слід вмикати динамічне вставлення.

[:arrow_up:](#налаштування)

### `insertion`

**Тип:** Object

**Приклад Insertion:**
```javascript
{
    pxBetweenUnits: 800,
    adHeightLimit: 1000,
    insertExclusion: [
        'img',
        'iframe',
        'video',
        'audio',
        '.video',
        '.audio',
        '[data-ad-unit]'
    ]
}
```

#### `insertion.insertExclusion`

**Тип:** Array

**За змовчуванням:**
```javascript
[
    'img',
    'iframe',
    'video',
    'audio',
    '.video',
    '.audio',
    '[data-ad-unit]'
]
```

**Опис:** При використанні функції динамічної вставки це дозволяє налаштувати, які елементи слід виключити під час пошуку дійсних точок вставки.

[:arrow_up:](#налаштування)

#### `insertion.pxBetweenUnits`

**Тип:** Integer

**За змовчуванням:** `800`, необов'язково

**Опис:** Мінімальна відстань між динамічно вставленими блоками.

[:arrow_up:](#налаштування)

#### `insertion.adHeightLimit`

**Тип:** Integer

**За змовчуванням:** `1000`, необов'язково

**Опис:** Максимальна висота для динамічно вставлених блоків.

[:arrow_up:](#налаштування)

## Інвентар

Масив інвентарю – це сукупність об'єктів, які представляють різні позиції оголошень.

| property name                   | тип     |                                             |
| ------------------------------- |---------|---------------------------------------------|
| [`slot`](#slot)                 | String  |                                             |
| [`sizes`](#sizes)               | Array   |                                             |
| [`type`](#type)                 | String  |                                             |
| [`dynamic`](#dynamic)           | Boolean |                                             |
| [`localContext`](#localcontext) | String  | необов'язково (обов'язковий, якщо `dynamic: true`) |

**Приклад використання:**

```javascript
var config = {
    // ...
    inventory: [
        {
            slot: 'Article_Leaderboard',
            sizes: [
                [ 728, 90 ],
                [ 970, 250 ],
                [ 1000, 220 ]
            ],
            type: 'desktop',
            dynamic: false
        },
        {
            slot: 'Article_Dynamic',
            sizes: [
                [ 300, 250 ],
                [ 300, 600 ]
            ],
            type: 'desktop',
            dynamic: true,
            localContext: '.entry-content'
        }
        // ...
    ]
};
```
### `slot`

**Тип:** String

**Опис:** Ім'я слота, визначене в DFP.

[:arrow_up:](#інвентар)

### `sizes`

**Тип:** Array

**Опис:** Масив прийнятих розмірів для цього модуля. Має відповідати розмірам, визначеним у DFP.

[:arrow_up:](#інвентар)

### `type`

**Тип:** String

**Опис:** Це можна використовувати для категоризації інвентарю. Наприклад, його можна використовувати для позначення того, чи призначений пристрій для настільних комп'ютерів або мобільних пристроїв. Це значення звіряється з [`clientType`](#clienttype).

[:arrow_up:](#інвентар)

### `dynamic`

**Тип:** Boolean

**За змовчуванням:** `false`

**Опис:** Це вмикає/вимикає динамічну вставку. Якщо значення задати `false`, AdManager очікуватиме контейнер на сторінці з атрибутом `data-ad-unit` та значення атрибута, що відповідає назві слота, визначеному в об'єкті Інвентаризація.

[:arrow_up:](#інвентар)

### `localContext`

**Тип:** String

**Опис:** Це потрібно тільки для динамічної вставки. Рядок є селектором javaScript, який вказує точку вставки для нового оголошення.

Приклад:
```javascript
var config = {
    // ...
    inventory: [
        // ...
        {
            slot: 'Article_Dynamic',
            sizes: [
                [ 300, 250 ],
                [ 300, 600 ]
            ],
            type: 'desktop',
            dynamic: true,
            localContext: '.entry-content'
        }
        // ...
    ]
};
```

[:arrow_up:](#інвентар)

## Події

Користувацькі події javaScript з префіксом `AdManager`.

| event                                                            | джерело тригера |
| ---------------------------------------------------------------- |-----------------|
| [`AdManager:libraryLoaded`](#admanagerlibraryloaded)             | внутрішнє       |
| [`AdManager:adUnitRendered`](#admanageradunitrendered)           | внутрішнє       |
| [`AdManager:slotsDefined`](#admanagerslotsdefined)               | внутрішнє       |
| [`AdManager:refresh`](#admanagerrefresh)                         | зовнішнє        |
| [`AdManager:runSequence`](#admanagerrunsequence)                 | обидва варіанти         |
| [`AdManager:emptySlots`](#admanageremptyslots)                   | зовнішнє        |
| [`AdManager:emptySlotsInContext`](#admanageremptyslotsincontext) | зовнішнє        |
| [`AdManager:importConfig`](#admanagerimportconfig)               | обидва варіанти |

### `AdManager:libraryLoaded`

**Опис:** Це спрацьовує один раз під час завантаження бібліотеки GPT.

[:arrow_up:](#події)

### `AdManager:adUnitRendered`

**Опис:** Він спрацьовує щоразу, коли показується оголошення. Прив'яжіть до цієї події, щоб отримувати сповіщення про показ певного оголошення.

**Parameter:** `unit` {Object}

| name          | type    | description                                               |
| ------------- | ------- | --------------------------------------------------------- |
| `name`        | String  | The slot name defined in DFP.                             |
| `id`          | String  | HTML id for the current ad wrapper.                       |
| `size`        | Array   | Indicates the pixel size of the rendered creative.        |
| `isEmpty`     | Boolean | true if no ad was returned for the slot, false otherwise. |
| `creativeId`  | String  | Creative ID of the rendered ad.                           |
| `lineItemId`  | String  | Line item ID of the rendered ad.                          |
| `serviceName` | String  | Name of the service that rendered the slot.               |

[:arrow_up:](#події)

### `AdManager:slotsDefined`

**Опис:** Це спрацьовує, коли слоти успішно визначені, але до показу оголошень.

[:arrow_up:](#події)

### `AdManager:refresh`

**Опис:** Передайте масив назв слотів, які потрібно оновити. Слоти вже повинні бути в DOM.

**Приклад використання:**

```javascript
document.dispatchEvent(new CustomEvent('AdManager:refresh', {
    detail: ['Unit_Name_1', 'Unit_Name_2']
}));
```

[:arrow_up:](#події)

### `AdManager:runSequence`

**Опис:** Тригер для запуску повної кваліфікаційної послідовності: визначення позицій у DOM, визначення слотів DFP, таргетинг, запит на креатив та відображення.

**Приклад використання:**

```javascript
document.dispatchEvent(new CustomEvent('AdManager:runSequence'));
```

[:arrow_up:](#події)

### `AdManager:emptySlots`

**Опис:** Передайте масив назв слотів, які потрібно очистити.

**Приклад використання:**

```javascript
$.event.trigger( 'AdManager:emptySlots', [ 'Unit_Name_1', 'Unit_Name_2' ] );
```

[:arrow_up:](#події)

### `AdManager:emptySlotsInContext`

**Опис:** Передати масив назв слотів, які потрібно спорожнити у виділенні.

**Приклад використання:**

```javascript
document.dispatchEvent(new CustomEvent('AdManager:emptySlotsInContext', {
    detail: {
        $context: document.querySelector('.entry-content'), // Defaults to the context set in the config.
        removeContainer: true // Defaults to true
    }
}));
```

[:arrow_up:](#події)

### `AdManager:importConfig`

**Опис:** Передайте об'єкт для імпорту нових значень конфігурації. Нова конфігурація перевизначить значення в поточній конфігурації.

**Приклад використання:**

```javascript
document.dispatchEvent(new CustomEvent('AdManager:importConfig', {
    detail: {
        targeting: {
            category: [
                'athletics',
                'technology',
                'graphic design'
            ]
        }
    }
}));
```

[:arrow_up:](#події)

## Динамічна вставка

### Огляд

**Замітка:** Ця функція не є обов'язковою.

Ця функція дозволяє AdManager динамічно вставляти змінну кількість нових позицій оголошень на льоту, без заздалегідь визначених рекламних контейнерів. Модуль Insertion.js містить логіку, яка аналізує DOM-вузли в заданій текстовій області, щоб визначити оптимальні місця, куди вставляти рекламу.

### Інструкція

- Додавайте нові елементи інвентарю, які відображають максимально можливу кількість динамічно вставлених оголошень.
- Set the additional options `dynamic` and `localContext` in the inventory config.
```javascript
var config = {
    // ...
    inventory: [
        // ...
        {
            slot: 'Dynamic_Unit_1',
            sizes: [
                [ 300, 250 ],
                [ 300, 425 ],
                [ 300, 600 ]
            ],
            type: 'desktop',
            dynamic: true,
            localContext: '.entry-content'
        },
        {
            slot: 'Dynamic_Unit_2',
            sizes: [
                [ 300, 250 ],
                [ 300, 425 ],
                [ 300, 600 ]
            ],
            type: 'desktop',
            dynamic: true,
            localContext: '.entry-content'
        },
        {
            slot: 'Dynamic_Unit_3',
            sizes: [
                [ 300, 250 ],
                [ 300, 425 ],
                [ 300, 600 ]
            ],
            type: 'desktop',
            dynamic: true,
            localContext: '.entry-content'
        }
    ]
};

AdManager( config );
```
- If a more specific outer/main context is needed (the default context is `body`), the property `context` can be added to the config. This is needed when keeping multiple contexts or articles separate, such as in infinite scroll applications. In the example below, it is `.hentry`.
```html
<body>
    <div class="hentry">
        <div class="entry-content">
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
            <p>Paragraph 3</p>
        </div>
    </div>

    <script type="text/javascript">
        ( function () {

            var config = {
                // ...
                context: '.hentry',
                inventory: [
                    {
                        // ...
                        dynamic: true,
                        localContext: '.entry-content'
                        }
                    ]
                }
            };

            AdManager( config );

        } () );
    </script>
</body>
```


## Оновлення
Цей реліз включає в себе ряд основних оновлень та покращень у порівнянні з оригінальною версією https://github.com/athletics/AdManager.

### Оновлені залежності

Оновлено gulp до 4 версії

### Видалені залежності

Використання `jQuery` було видалено. Це було зроблено з метою забезпечення більшої гнучкості та незалежності від цієї бібліотеки.

### Переписаний код

Всі модулі були переписані використовуючи сучасний синтаксис ES6 класів. Це було зроблено з метою поліпшення структури коду та його читаємості.

### Оновлено GPT URL

Ми змінили GPT URL на новий, що надає офіційний сайт.

### Підсумок

Ці зміни призначені для того, щоб поліпшити рівень ефективності та надійності нашої бібліотеки. Завдяки видаленню залежностей та використанню нових технологій, ми прагнемо зробити нашу бібліотеку ще кращою для вас!

### Розробка

Проєкт містить gulpfile.js для конкатенації та мініфікації.
To use first [install gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) and the dependencies (`yarn install`). The default gulp task (`gulp`) will start the watch task.

## Посилання

* [IAB Ad Standards and Creative Guidelines](http://www.iab.net/guidelines/508676/508767)
* [Google Publisher Tag samples](https://support.google.com/dfp_premium/answer/1638622?hl=en)
* [Оригінальний репозиторій - athletics/AdManager](https://github.com/athletics/AdManager)