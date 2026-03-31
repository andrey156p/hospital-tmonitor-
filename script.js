const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwZefOM6K3TzjPq0n2m8_Z6lcPKngEIgLMAQWt61OFEtUc9FQWa9MyMjRGaYxaO-WZY/exec";
const ALL_DEPTS = ["ג 3", "א", "ב 1", "ב 2", "ג 1", "ג 2", "ד"];

let sessionData = [];
let inspector = "";
let currentShift = "";
let pendingDepts = [];
let completedDepts = [];
let outsideTemp = "N/A";
let myChart = null;

async function fetchWeather() {
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=32.0167&longitude=34.75&current_weather=true");
        const data = await response.json();
        outsideTemp = data.current_weather.temperature;
    } catch (e) { outsideTemp = "N/A"; }
}

window.onload = () => {
    const saved = localStorage.getItem('tempMonitorSession');
    if (saved) {
        const data = JSON.parse(saved);
        inspector = data.inspector;
        currentShift = data.currentShift;
        pendingDepts = data.pendingDepts || [];
        completedDepts = data.completedDepts || [];
        sessionData = data.sessionData || [];
        outsideTemp = data.outsideTemp || "N/A";
        
        if (pendingDepts.length === 0 && completedDepts.length > 0) {
            showFinalReport();
        } else {
            document.getElementById('setup-section').classList.add('hidden');
            document.getElementById('check-section').classList.remove('hidden');
            applyTheme();
            updateDeptUI();
        }
    }
};

function startCheck() {
    inspector = document.getElementById('inspector-name').value;
    currentShift = document.getElementById('shift-select').value;
    if (!inspector) return alert("נא להזין שם בודק");
    
    pendingDepts = [...ALL_DEPTS];
    completedDepts = [];
    sessionData = [];
    fetchWeather();
    saveToLocalStorage();
    applyTheme();
    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('check-section').classList.remove('hidden');
    updateDeptUI();
}

function saveToLocalStorage() {
    localStorage.setItem('tempMonitorSession', JSON.stringify({
        inspector, currentShift, pendingDepts, completedDepts, sessionData, outsideTemp
    }));
}

function applyTheme() {
    const s = document.getElementById('app-container').classList;
    s.remove('theme-morning', 'theme-noon', 'theme-evening');
    s.add(currentShift === "בוקר" ? 'theme-morning' : currentShift === "צהריים" ? 'theme-noon' : 'theme-evening');
}

function updateDeptUI() {
    // 1. Очищаем все поля ввода
    document.getElementById('temp-dining').value = "";
    document.getElementById('temp-room1').value = "";
    document.getElementById('temp-room2').value = "";
    document.getElementById('notes').value = "";

    // 2. Обновляем прогресс
    document.getElementById('progress-text').innerText = `נבדקו ${completedDepts.length} מתוך ${ALL_DEPTS.length}`;
    
    // 3. Обновляем список выбора отделений
    const sel = document.getElementById('dept-select');
    sel.innerHTML = "";
    pendingDepts.forEach(d => {
        let o = document.createElement('option');
        o.value = d; o.innerText = "מחלקה " + d;
        sel.appendChild(o);
    });

    // 4. Обновляем список завершенных
    const list = document.getElementById('completed-list');
    list.innerHTML = "";
    if (completedDepts.length > 0) {
        document.getElementById('completed-depts-container').style.display = "block";
        completedDepts.forEach(d => {
            let li = document.createElement('li');
            li.innerText = `✅ מחלקה ${d} (נרשם)`;
            list.appendChild(li);
        });
    } else {
        document.getElementById('completed-depts-container').style.display = "none";
    }
}

async function saveAndNext() {
    const deptSelect = document.getElementById('dept-select');
    const dept = deptSelect.value;
    const tD = parseFloat(document.getElementById('temp-dining').value);
    const tR1 = parseFloat(document.getElementById('temp-room1').value);
    const tR2 = parseFloat(document.getElementById('temp-room2').value);
    const notes = document.getElementById('notes').value;

    if (!dept) return alert("בחר מחלקה");
    if (isNaN(tD) || isNaN(tR1) || isNaN(tR2)) return alert("חובה למלא את כל הטמפרטורות!");
    
    const btn = document.querySelector('.main-btn');
    btn.innerText = "...שומר נתונים";
    btn.disabled = true;

    const avgR = Math.round(((tR1 + tR2) / 2) * 10) / 10;
    let issues = [];
    if (tD > 24) issues.push("🔴 חדר אוכל: חם"); else if (tD < 22) issues.push("🔵 חדר אוכל: קר");
    if (avgR > 24) issues.push("🔴 חדרים: חם"); else if (avgR < 22) issues.push("🔵 חדרים: קר");
    let status = issues.length > 0 ? issues.join(" | ") : "✅ תקין";

    const record = {
        date: new Date().toLocaleDateString('he-IL'),
        shift: currentShift,
        time: new Date().toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}),
        inspector, dept, dining_temp: tD, rooms_temp: avgR, notes, status, outside_temp: outsideTemp
    };

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: 'no-cors',
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(record)
        });

        sessionData.push(record);
        pendingDepts = pendingDepts.filter(d => d !== dept);
        completedDepts.push(dept);
        saveToLocalStorage();

        if (pendingDepts.length > 0) {
            updateDeptUI(); // Здесь произойдет очистка полей и смена отделения
        } else {
            localStorage.removeItem('tempMonitorSession');
            showFinalReport();
        }
    } catch (e) {
        alert("שגיאת תקשורת! הנתונים לא נשמרו.");
    } finally {
        btn.innerText = "שמור והמשך";
        btn.disabled = false;
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