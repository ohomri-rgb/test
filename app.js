let rawData = [];
let categoriesData = {};

document.addEventListener('DOMContentLoaded', () => {
    // אתחול ה-Extension מול Tableau
    tableau.extensions.initializeAsync().then(() => {
        fetchTableauData();
    });

    setupEventListeners();
});

// 1. משך נתונים מגיליון Tableau הנתון
async function fetchTableauData() {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    // מצא את הגיליון שנקרא "Data_Sheet" ב-Dashboard
    const worksheet = dashboard.worksheets.find(ws => ws.name === "Data_Sheet");

    if (!worksheet) {
        console.error("הגיליון Data_Sheet לא נמצא בדשבורד.");
        return;
    }

    const summaryData = await worksheet.getSummaryDataAsync();
    parseData(summaryData);
    renderCategoriesView();
}

// 2. המרת מבנה הנתונים מ-Tableau לאובייקטים נוחים לעבודה
function parseData(tableauData) {
    const columns = tableauData.columns.map(col => col.fieldName);
    
    // מיפוי עמודות לפי שמות השדות
    const idxCategory = columns.findIndex(c => c.includes("Category") || c.includes("קטגוריה"));
    const idxDashboard = columns.findIndex(c => c.includes("Dashboard") || c.includes("דשבורד"));
    const idxDesc = columns.findIndex(c => c.includes("Description") || c.includes("תיאור"));
    const idxUrl = columns.findIndex(c => c.includes("URL"));
    const idxImage = columns.findIndex(c => c.includes("Image_URL") || c.includes("תמונה"));

    rawData = [];
    categoriesData = {};

    tableauData.data.forEach(row => {
        const item = {
            category: row[idxCategory]?.formattedValue || '',
            dashboard: row[idxDashboard]?.formattedValue || '',
            description: row[idxDesc]?.formattedValue || '',
            url: row[idxUrl]?.formattedValue || '',
            image: row[idxImage]?.formattedValue || ''
        };

        rawData.push(item);

        if (!categoriesData[item.category]) {
            categoriesData[item.category] = [];
        }
        categoriesData[item.category].push(item);
    });
}

// 3. רינדור מסך קטגוריות ראשי
function renderCategoriesView() {
    const grid = document.getElementById('categories-grid');
    grid.innerHTML = '';

    Object.keys(categoriesData).forEach(catName => {
        const count = categoriesData[catName].length;
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <h3>${catName}</h3>
            <p>${count} דשבורדים</p>
            <span style="color: var(--primary-color)">כניסה לקטגוריה &larr;</span>
        `;
        card.onclick = () => openCategory(catName);
        grid.appendChild(card);
    });
}

// 4. מעבר לדף משני - רשימת דשבורדים בקטגוריה
function openCategory(catName) {
    document.getElementById('main-view').classList.remove('active');
    document.getElementById('sub-view').classList.add('active');
    document.getElementById('selected-category-title').innerText = catName;

    renderDashboardsList(categoriesData[catName] || []);
}

function renderDashboardsList(items) {
    const list = document.getElementById('dashboards-list');
    list.innerHTML = '';

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'dashboard-row';
        row.innerHTML = `
            <div>
                <h4>${item.dashboard}</h4>
                <p style="color: #64748b; margin: 4px 0 0;">${item.description}</p>
            </div>
            <a href="${item.url}" target="_blank" class="btn-open">פתיחה ↗</a>
        `;

        // אירועי Hover להצגת Preview Image
        if (item.image) {
            row.addEventListener('mouseenter', (e) => showPreview(e, item.image));
            row.addEventListener('mousemove', (e) => movePreview(e));
            row.addEventListener('mouseleave', hidePreview);
        }

        list.appendChild(row);
    });
}

// 5. מנגנון תמונה מקדימה ב-Hover
const tooltip = document.getElementById('preview-tooltip');
const tooltipImg = document.getElementById('preview-img');

function showPreview(e, imgSrc) {
    tooltipImg.src = imgSrc;
    tooltip.style.display = 'block';
    movePreview(e);
}

function movePreview(e) {
    // מיקום התמונה המקדימה ליד עכבר הלינק (עם היסט)
    tooltip.style.left = (e.clientX - 340) + 'px'; 
    tooltip.style.top = (e.clientY + 15) + 'px';
}

function hidePreview() {
    tooltip.style.display = 'none';
    tooltipImg.src = '';
}

// 6. ניהול אירועי חיפוש והשלמה אוטומטית (Autocomplete)
function setupEventListeners() {
    document.getElementById('back-btn').onclick = () => {
        document.getElementById('sub-view').classList.remove('active');
        document.getElementById('main-view').classList.add('active');
    };

    const globalSearch = document.getElementById('global-search');
    const autoDropdown = document.getElementById('autocomplete-results');

    globalSearch.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        autoDropdown.innerHTML = '';

        if (!val) return;

        const matches = rawData.filter(d => 
            d.dashboard.toLowerCase().includes(val) || 
            d.category.toLowerCase().includes(val)
        );

        matches.forEach(match => {
            const el = document.createElement('div');
            el.className = 'autocomplete-item';
            el.innerHTML = `<strong>${match.dashboard}</strong> <small>(${match.category})</small>`;
            el.onclick = () => {
                openCategory(match.category);
                autoDropdown.innerHTML = '';
                globalSearch.value = '';
            };
            autoDropdown.appendChild(el);
        });
    });
}