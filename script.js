// Твой персональный и рабочий URL
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
    document.getElementById('current-dept-name').innerText = "מחלקה: " + departments[currentDeptIndex];
    document.getElementById('temp-dining').value = "";
    document.getElementById('temp-rooms').value = "";
    document.getElementById('notes').value = "";
}

async function saveAndNext() {
    const t1 = parseFloat(document.getElementById('temp-dining').value);
    const t2 = parseFloat(document.getElementById('temp-rooms').value);
    const note = document.getElementById('notes').value;

    if (isNaN(t1) || isNaN(t2)) return alert("חובה למלא את כל הנתונים!");

    let status = (t1 >= 24 || t2 >= 24) ? "🔴 חם מאוד" : (t1 <= 22 || t2 <= 22) ? "🔵 קר" : "✅ תקין";

    const record = {
        date: new Date().toLocaleDateString('he-IL'),
        shift: currentShift,
        time: new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'}),
        inspector: inspector,
        dept: departments[currentDeptIndex],
        dining_temp: t1,
        rooms_temp: t2,
        notes: note,
        status: status
    };

    sessionData.push(record);
    
    // Отправка данных на твой сервер (Обновленный обход CORS)
    fetch(SCRIPT_URL, { 
        method: "POST", 
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(record) 
    }).then(response => console.log("Отправлено в Google!"))
      .catch(err => alert("Ошибка отправки: " + err));

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