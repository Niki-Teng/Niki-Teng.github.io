let arrivalData = [];
let departureData = [];
let currentChart = null;
let currentFlightType = "both"; // 'arrival', 'departure', 'both'
let currentTimeSlot = "all";
let currentStatsData = []; // 儲存當前統計數據用於排序
let currentSortColumn = null;
let currentSortDirection = "asc"; // 'asc' 或 'desc'

// 載入 JSON 資料
async function loadData() {
  try {
    const arrivalResponse = await fetch("arrival.json");
    const departureResponse = await fetch("departure.json");
    arrivalData = await arrivalResponse.json();
    departureData = await departureResponse.json();
    console.log("資料載入完成");
    console.log("到達航班:", arrivalData.length, "條");
    console.log("出發航班:", departureData.length, "條");
  } catch (error) {
    console.error("載入資料失敗:", error);
  }
}

// 計算時間差異（分鐘）
function calculateDelay(scheduled, actual) {
  if (!actual || actual === "") return 0;

  const scheduledTime = new Date(scheduled.replace(/\//g, "-"));
  const actualTime = new Date(actual.replace(/\//g, "-"));

  return Math.round((actualTime - scheduledTime) / (1000 * 60));
}

// 根據時段篩選資料
function filterByTimeSlot(data, timeSlot) {
  if (timeSlot === "all") return data;

  const timeRanges = {
    midnight: { start: 0, end: 3 }, // 00:00-03:59
    earlymorning: { start: 4, end: 7 }, // 04:00-07:59
    morning: { start: 8, end: 11 }, // 08:00-11:59
    afternoon: { start: 12, end: 15 }, // 12:00-15:59
    evening: { start: 16, end: 19 }, // 16:00-19:59
    night: { start: 20, end: 23 }, // 20:00-23:59
  };

  if (!timeRanges[timeSlot]) return data;

  return data.filter((flight) => {
    const hour = new Date(flight.scheduled_time.replace(/\//g, "-")).getHours();
    const range = timeRanges[timeSlot];
    return hour >= range.start && hour <= range.end;
  });
}

// 計算各航空公司統計資料
function calculateAirlineStats(data) {
  const airlineStats = {};

  data.forEach((flight) => {
    const airline = flight.airline;
    if (!airlineStats[airline]) {
      airlineStats[airline] = {
        total: 0,
        delayed: 0,
        onTime: 0,
        cancelled: 0,
        totalDelay: 0,
      };
    }

    airlineStats[airline].total++;

    if (flight.status.includes("取消") || flight.status.includes("Cancelled")) {
      airlineStats[airline].cancelled++;
    } else {
      const delay = calculateDelay(flight.scheduled_time, flight.actual_time);
      if (delay > 15) {
        // 超過15分鐘算誤點
        airlineStats[airline].delayed++;
        airlineStats[airline].totalDelay += delay;
      } else {
        airlineStats[airline].onTime++;
      }
    }
  });

  // 計算誤點率
  Object.keys(airlineStats).forEach((airline) => {
    const stats = airlineStats[airline];
    stats.delayRate =
      stats.total > 0 ? ((stats.delayed / stats.total) * 100).toFixed(1) : 0;
    stats.avgDelay =
      stats.delayed > 0 ? (stats.totalDelay / stats.delayed).toFixed(1) : 0;
  });

  return airlineStats;
}

// 排序統計數據
function sortStatsData(data, column, direction) {
  const sortedData = [...data];

  sortedData.sort((a, b) => {
    let valueA, valueB;

    switch (column) {
      case "airline":
        valueA = a[0]; // airline name
        valueB = b[0];
        break;
      case "total":
        valueA = a[1].total;
        valueB = b[1].total;
        break;
      case "onTime":
        valueA = a[1].onTime;
        valueB = b[1].onTime;
        break;
      case "delayed":
        valueA = a[1].delayed;
        valueB = b[1].delayed;
        break;
      case "cancelled":
        valueA = a[1].cancelled;
        valueB = b[1].cancelled;
        break;
      case "delayRate":
        valueA = parseFloat(a[1].delayRate);
        valueB = parseFloat(b[1].delayRate);
        break;
      case "avgDelay":
        valueA = parseFloat(a[1].avgDelay);
        valueB = parseFloat(b[1].avgDelay);
        break;
      default:
        return 0;
    }

    if (typeof valueA === "string") {
      return direction === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else {
      return direction === "asc" ? valueA - valueB : valueB - valueA;
    }
  });

  return sortedData;
}

// 處理表格標題點擊事件
function handleTableHeaderClick(column) {
  // 如果點擊的是同一列，切換排序方向
  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
  } else {
    currentSortColumn = column;
    currentSortDirection = "asc";
  }

  // 重新排序並更新表格
  const sortedData = sortStatsData(
    currentStatsData,
    column,
    currentSortDirection
  );
  updateStatsTable(sortedData);
  updateTableHeaders();
}

// 更新表格標題的排序指示器
function updateTableHeaders() {
  document.querySelectorAll(".sortable").forEach((header) => {
    const column = header.getAttribute("data-column");
    const indicator = header.querySelector(".sort-indicator");

    if (column === currentSortColumn) {
      indicator.textContent = currentSortDirection === "asc" ? " ▲" : " ▼";
      header.classList.add("sorted");
    } else {
      indicator.textContent = " ▲▼";
      header.classList.remove("sorted");
    }
  });
}

// 更新圖表
function updateChart() {
  let dataToAnalyze = [];

  if (currentFlightType === "arrival") {
    dataToAnalyze = filterByTimeSlot(arrivalData, currentTimeSlot);
  } else if (currentFlightType === "departure") {
    dataToAnalyze = filterByTimeSlot(departureData, currentTimeSlot);
  } else {
    dataToAnalyze = [
      ...filterByTimeSlot(arrivalData, currentTimeSlot),
      ...filterByTimeSlot(departureData, currentTimeSlot),
    ];
  }

  const stats = calculateAirlineStats(dataToAnalyze);

  // 只顯示航班數量前10的航空公司
  const topAirlines = Object.entries(stats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  // 儲存當前數據用於排序
  currentStatsData = topAirlines;

  const labels = topAirlines.map(([airline]) => airline);
  const delayRates = topAirlines.map(([, data]) => parseFloat(data.delayRate));

  const ctx = document.getElementById("chartCanvas").getContext("2d");

  if (currentChart) {
    currentChart.destroy();
  }

  currentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "誤點率 (%)",
          data: delayRates,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `航空公司誤點率統計 - ${getFlightTypeText()} (${getTimeSlotText()})`,
          font: {
            size: 16,
          },
        },
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "航空公司",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "誤點率 (%)",
          },
          beginAtZero: true,
          max: Math.max(...delayRates) * 1.1 || 100, // 動態調整Y軸最大值
        },
      },
    },
  });

  // 更新統計表格（使用當前排序設定）
  if (currentSortColumn) {
    const sortedData = sortStatsData(
      currentStatsData,
      currentSortColumn,
      currentSortDirection
    );
    updateStatsTable(sortedData);
  } else {
    updateStatsTable(topAirlines);
  }
  updateTableHeaders();
}

// 更新統計表格
function updateStatsTable(topAirlines) {
  const tableBody = document.getElementById("statsTableBody");
  tableBody.innerHTML = "";

  topAirlines.forEach(([airline, stats], index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${index + 1}</td>
            <td>${airline}</td>
            <td>${stats.total}</td>
            <td>${stats.onTime}</td>
            <td>${stats.delayed}</td>
            <td>${stats.cancelled}</td>
            <td>${stats.delayRate}%</td>
            <td>${stats.avgDelay} 分鐘</td>
        `;
    tableBody.appendChild(row);
  });
}

function getFlightTypeText() {
  switch (currentFlightType) {
    case "arrival":
      return "入境";
    case "departure":
      return "出境";
    case "both":
      return "出入境";
    default:
      return "出入境";
  }
}

function getTimeSlotText() {
  const timeSlotMap = {
    all: "全時段",
    midnight: "午夜段 00:00-03:59",
    earlymorning: "清晨段 04:00-07:59",
    morning: "上午段 08:00-11:59",
    afternoon: "下午段 12:00-15:59",
    evening: "傍晚段 16:00-19:59",
    night: "夜間段 20:00-23:59",
  };
  return timeSlotMap[currentTimeSlot] || "全時段";
}

function showChart(timeSlot) {
  const timeSlotMap = {
    "全時段 00:00-23:59": "all",
    "午夜段 00:00-03:59": "midnight",
    "清晨段 04:00-07:59": "earlymorning",
    "上午段 08:00-11:59": "morning",
    "下午段 12:00-15:59": "afternoon",
    "傍晚段 16:00-19:59": "evening",
    "夜間段 20:00-23:59": "night",
  };

  currentTimeSlot = timeSlotMap[timeSlot] || "all";
  // 重置排序狀態
  currentSortColumn = null;
  currentSortDirection = "asc";
  updateChart();
}

function setFlightType(type) {
  currentFlightType = type;

  // 更新按鈕樣式
  document.querySelectorAll(".chart-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");

  // 重置排序狀態
  currentSortColumn = null;
  currentSortDirection = "asc";
  updateChart();
}

// 頁面載入完成後初始化
window.addEventListener("load", async () => {
  await loadData();
  // 預設選擇出入境
  document.querySelector(".chart-btn").classList.add("active");
  updateChart();
});
