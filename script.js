const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwZefOM6K3TzjPq0n2m8_Z6lcPKngEIgLMAQWt61OFEtUc9FQWa9MyMjRGaYxaO-WZY/exec";

const departments = ["ג 3", "א", "ב 1", "ב 2", "ג 1", "ג 2", "ד"];

let currentDeptIndex = 0;
let sessionData = [];
let inspector = "";
let currentShift = "";
let myChart = null;

function startCheck() {
    inspector = document.getElementById('inspector-name').value;
    currentShift = document.getElementById('shift-select').value;
    
    if (!inspector) return alert("נא להזין שם בודק");
    
    const container = document.getElementById('app-container');
    container.classList.add(currentShift === "בוקר" ? 'theme-morning' : currentShift === "צהריים" ? 'theme-noon' : 'theme-evening');

    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('check-section').classList.remove('hidden');
    updateDeptUI();
}

function updateDeptUI() {
    document.getElementById('progress-text').innerText = `מחלקה ${currentDeptIndex + 1} מתוך ${departments.length}`;
    document.getElementById('current-dept-name').innerText = departments[currentDeptIndex];
    
    document.getElementById('temp-dining').value = "";
    document.getElementById('temp-room1').value = "";
    document.getElementById('temp-room2').value = "";
    document.getElementById('notes').value = "";
}

async function saveAndNext() {
    const tDining = parseFloat(document.getElementById('temp-dining').value);
    const tRoom1 = parseFloat(document.getElementById('temp-room1').value);
    const tRoom2 = parseFloat(document.getElementById('temp-room2').value);
    const note = document.getElementById('notes').value;

    // Проверка заполнения всех полей
    if (isNaN(tDining) || isNaN(tRoom1) || isNaN(tRoom2)) {
        return alert("חובה למלא את כל הטמפרטורות! (Заполните все поля)");
    }

    // Проверка диапазона 17-30
    if (tDining < 17 || tDining > 30 || tRoom1 < 17 || tRoom1 > 30 || tRoom2 < 17 || tRoom2 > 30) {
        return alert("שגיאה: הטמפרטורה חייבת להיות בין 17 ל-30 מעלות! (Ошибка: От 17 до 30 градусов)");
    }

    // Расчет средней температуры палат
    const tRoomsAvg = Math.round(((tRoom1 + tRoom2) / 2) * 10) / 10;

   let status = (tDining > 24 || tRoomsAvg > 24) ? "🔴 חם מאוד" : (tDining <= 22 || tRoomsAvg <= 22) ? "🔵 קר" : "✅ תקין";

    const record = {
        date: new Date().toLocaleDateString('he-IL'),
        shift: currentShift,
        time: new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'}),
        inspector: inspector,
        dept: departments[currentDeptIndex],
        dining_temp: tDining,
        rooms_temp: tRoomsAvg,
        notes: note,
        status: status
    };

    sessionData.push(record);
    
    // Отправка данных
    fetch(SCRIPT_URL, { 
        method: "POST", 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(record) 
    }).catch(err => console.error("Ошибка сети:", err));

    if (currentDeptIndex < departments.length - 1) {
        currentDeptIndex++;
        updateDeptUI();
    } else {
        showFinalReport();
    }
}

function showFinalReport() {
    document.getElementById('check-section').classList.add('hidden');
    document.getElementById('report-section').classList.remove('hidden');
    renderChart(sessionData);
}

function renderChart(data) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.dept),
            datasets: [
                { label: 'אוכל', data: data.map(d => d.dining_temp), borderColor: '#1a73e8' },
                { label: 'חדרים', data: data.map(d => d.rooms_temp), borderColor: '#f44336' }
            ]
        }
    });
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(sessionData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "דוח");
    XLSX.writeFile(wb, `Report_${new Date().toLocaleDateString('he-IL')}.xlsx`);
}