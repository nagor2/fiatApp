# Charts Demo - Quick Start

## 🚀 Запуск демо

### Development режим

```bash
# В корне проекта
docker compose --profile dev up

# Или локально
npm install
npm start
```

Откройте: **http://localhost:3000/charts-demo**

### Production режим

```bash
docker compose --profile prod up -d
```

Откройте: **http://localhost:8008/charts-demo**

## 📊 Что внутри

### 12 типов графиков:

1. **Line Chart** - Линейные графики (цены токенов, APY)
2. **Area Chart** - Графики с заливкой (TVL, ликвидность)
3. **Bar Chart** - Столбчатые диаграммы (объемы торгов)
4. **Stacked Bar** - Столбцы с накоплением (состав collateral)
5. **Pie Chart** - Круговые диаграммы (распределение активов)
6. **Composed Chart** - Комбинированные (цена + объем)
7. **Multi-Line** - Множественные линии (сравнение токенов)
8. **Candlestick** - Свечной график (OHLC для трейдинга)
9. **Scatter** - Точечный график (APY vs Risk)
10. **Radar** - Радарная диаграмма (метрики протокола)
11. **Treemap** - Иерархическое дерево (структура активов)
12. **Animated** - График с real-time обновлениями

### Каждый пример включает:
- ✅ Рабочий код графика
- ✅ Тестовые данные
- ✅ DeFi use cases (как использовать в DotFlat)
- ✅ Кастомные tooltips
- ✅ Responsive дизайн

## 📁 Структура файлов

```
src/demo/
├── ChartsDemo.js              # Главная страница с навигацией
├── LineChartDemo.js           # Линейный график
├── AreaChartDemo.js           # График с заливкой
├── BarChartDemo.js            # Столбчатая диаграмма
├── StackedBarChartDemo.js     # Столбцы с накоплением
├── PieChartDemo.js            # Круговая диаграмма
├── ComposedChartDemo.js       # Комбинированный график
├── MultiLineChartDemo.js      # Множественные линии
├── CandlestickChartDemo.js    # Свечной график
├── ScatterChartDemo.js        # Точечный график
├── RadarChartDemo.js          # Радарная диаграмма
├── TreemapChartDemo.js        # Treemap
├── AnimatedChartDemo.js       # Анимированный график
├── index.js                   # Экспорты для импорта
├── demo.css                   # Стили для демо
├── README.md                  # Документация
├── USAGE-EXAMPLES.md          # Примеры интеграции
└── QUICKSTART-DEMO.md         # Этот файл
```

## 💡 Как использовать в вашем коде

### Импорт отдельного графика

```jsx
import { LineChartDemo } from './demo';

// В вашем компоненте
<LineChartDemo />
```

### Импорт главного компонента

```jsx
import ChartsDemo from './demo/ChartsDemo';

// Показать все графики
<ChartsDemo />
```

### Копирование кода

1. Откройте демо: http://localhost:3000/charts-demo
2. Выберите нужный тип графика
3. Код находится в соответствующем файле `src/demo/*Demo.js`
4. Скопируйте и адаптируйте под ваши данные

## 🎯 Примеры для DotFlat

### График цены DFC токена

```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<LineChart width={600} height={300} data={priceHistory}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="price" stroke="#8884d8" />
</LineChart>
```

### TVL Dashboard

```jsx
import { AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

<AreaChart width={800} height={400} data={tvlData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Area type="monotone" dataKey="tvl" fill="#8884d8" />
</AreaChart>
```

### Portfolio Distribution

```jsx
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

<PieChart width={400} height={400}>
  <Pie data={assets} dataKey="value" cx="50%" cy="50%" outerRadius={120}>
    {assets.map((entry, index) => (
      <Cell key={index} fill={COLORS[index]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

## 📚 Дополнительная информация

- **Библиотека**: Recharts v2.13.3
- **Bundle size**: ~150 KB (легковесная)
- **Технология**: SVG, D3 submodules
- **Документация**: https://recharts.org/
- **API**: https://recharts.org/en-US/api

## 🔧 Troubleshooting

### График не отображается
Проверьте:
1. Данные в правильном формате (массив объектов)
2. ResponsiveContainer имеет высоту
3. dataKey совпадает с ключами в данных

### Ошибка импорта recharts
```bash
# Установите зависимость
npm install recharts
```

### Данные не обновляются
- Проверьте что используете setState или state management
- Для real-time используйте useEffect с зависимостями

## 🎨 Кастомизация

Все графики можно кастомизировать:
- Цвета через `stroke`, `fill` props
- Размеры через `width`, `height` или ResponsiveContainer
- Tooltips через кастомные компоненты
- Анимации через `animationDuration`, `animationEasing`

См. `USAGE-EXAMPLES.md` для детальных примеров интеграции.
