const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwZefOM6K3TzjPq0n2m8_Z6lcPKngEIgLMAQWt61OFEtUc9FQWa9MyMjRGaYxaO-WZY/exec";
const ALL_DEPTS = ["ג 3", "א", "ב 1", "ב 2", "ג 1", "ג 2", "ד"];

let sessionData = [];
let inspector = "";
let currentShift = "";
let pendingDepts = [];
let completedDepts = [];
let outsideTemp = "N/A"; 
let myChart = null;

// ПОЛУЧАЕМ ПОГОДУ (Бат-Ям / Центр)
async function fetchWeather() {
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=32.0167&longitude=34.75&current_weather=true");
        const data = await response.json();
        outsideTemp = data.current_weather.temperature;
    } catch (error) {
        console.error("Ошибка погоды:", error);
    }
}

window.onload = () => {
    try {
        const savedSession = localStorage.getItem('tempMonitorSession');
        if (savedSession) {
            const data = JSON.parse(savedSession);
            if (!data.pendingDepts || data.pendingDepts.length === 0) {
                 localStorage.removeItem('tempMonitorSession');
                 return;
            }
            inspector = data.inspector || "";
            currentShift = data.currentShift || "";
            pendingDepts = data.pendingDepts;
            completedDepts = data.completedDepts || [];
            sessionData = data.sessionData || [];
            outsideTemp = data.outsideTemp || "N/A"; 
            
            applyTheme();
            document.getElementById('setup-section').classList.add('hidden');
            document.getElementById('check-section').classList.remove('hidden');
            updateDeptUI();
        }
    } catch (error) {
        localStorage.removeItem('tempMonitorSession');
    }
};

function applyTheme() {
    const container = document.getElementById('app-container');
    container.classList.remove('theme-morning', 'theme-noon', 'theme-evening');
    container.classList.add(currentShift === "בוקר" ? 'theme-morning' : currentShift === "צהריים" ? 'theme-noon' : 'theme-evening');
}

function startCheck() {
    inspector = document.getElementById('inspector-name').value;
    currentShift = document.getElementById('shift-select').value;
    
    if (!inspector) return alert("נא להזין שם בודק");
    
    pendingDepts = [...ALL_DEPTS];
    completedDepts = [];
    sessionData = [];
    
    fetchWeather(); // Запускаем градусник на улице
    
    saveToLocalStorage();
    applyTheme();

    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('check-section').classList.remove('hidden');
    updateDeptUI();
}

function saveToLocalStorage() {
    const data = {
        inspector: inspector,
        currentShift: currentShift,
        pendingDepts: pendingDepts,
        completedDepts: completedDepts,
        sessionData: sessionData,
        outsideTemp: outsideTemp 
    };
    localStorage.setItem('tempMonitorSession', JSON.stringify(data));
}

function cancelSession() {
    const msg = "האם אתה בטוח שברצונך לבטל את הבדיקה?\n\n(Вы уверены, что хотите отменить проверку?)";
    if(confirm(msg)) {
        localStorage.removeItem('tempMonitorSession');
        location.reload();
    }
}

function updateDeptUI() {
    try {
        document.getElementById('progress-text').innerText = `נבדקו ${completedDepts.length} מתוך ${ALL_DEPTS.length}`;
        
        const select = document.getElementById('dept-select');
        select.innerHTML = "";
        pendingDepts.forEach(dept => {
            let opt = document.createElement('option');
            opt.value = dept;
            opt.innerHTML = "מחלקה " + dept;
            select.appendChild(opt);
        });

        const compContainer = document.getElementById('completed-depts-container');
        const compList = document.getElementById('completed-list');
        compList.innerHTML = "";
        
        if (completedDepts.length > 0) {
            compContainer.style.display = "block";
            completedDepts.forEach(dept => {
                let li = document.createElement('li');
                li.innerHTML = `✅ מחלקה ${dept}`;
                compList.appendChild(li);
            });
        } else {
            compContainer.style.display = "none";
        }

        document.getElementById('temp-dining').value = "";
        document.getElementById('temp-room1').value = "";
        document.getElementById('temp-room2').value = "";
        document.getElementById('notes').value = "";
    } catch (error) {}
}

async function saveAndNext() {
    const selectEl = document.getElementById('dept-select');
    if (!selectEl) return;
    const selectedDept = selectEl.value;
    if (!selectedDept) return;

    const tDining = parseFloat(document.getElementById('temp-dining').value);
    const tRoom1 = parseFloat(document.getElementById('temp-room1').value);
    const tRoom2 = parseFloat(document.getElementById('temp-room2').value);
    const note = document.getElementById('notes').value;

    if (isNaN(tDining) || isNaN(tRoom1) || isNaN(tRoom2)) {
        return alert("חובה למלא את כל הטמפרטורות!");
    }

    if (tDining < 17 || tDining > 30 || tRoom1 < 17 || tRoom1 > 30 || tRoom2 < 17 || tRoom2 > 30) {
        return alert("שגיאה: הטמפרטורה חייבת להיות בין 17 ל-30 מעלות!");
    }

    const tRoomsAvg = Math.round(((tRoom1 + tRoom2) / 2) * 10) / 10;
    
    let issues = [];
    if (tDining > 24) issues.push("🔴 חדר אוכל: חם");
    else if (tDining < 22) issues.push("🔵 חדר אוכל: קר");
    
    if (tRoomsAvg > 24) issues.push("🔴 חדרים: חם");
    else if (tRoomsAvg < 22) issues.push("🔵 חדרים: קר");
    
    let status = (issues.length > 0) ? issues.join(" | ") : "✅ תקין";

    const record = {
        date: new Date().toLocaleDateString('he-IL'),
        shift: currentShift,
        time: new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'}),
        inspector: inspector,
        dept: selectedDept,
        dining_temp: tDining,
        rooms_temp: tRoomsAvg,
        outside_temp: outsideTemp, // УЛИЧНАЯ ПОГОДА ЛЕТИТ В КОЛОНКУ J
        notes: note,
        status: status
    };

    sessionData.push(record);
    
    pendingDepts = pendingDepts.filter(d => d !== selectedDept);
    completedDepts.push(selectedDept);
    
    saveToLocalStorage();

    fetch(SCRIPT_URL, { 
        method: "POST", 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(record) 
    }).catch(err => console.error("Ошибка сети:", err));

    if (pendingDepts.length > 0) {
        updateDeptUI();
    } else {
        localStorage.removeItem('tempMonitorSession');
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
                { label: 'חדרים, ממוצע', data: data.map(d => d.rooms_temp), borderColor: '#f44336' }
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