(function () {
    let portalData = [];
    let currentCategory = null;

    // אתחול התקשורת מול Tableau API
    document.addEventListener("DOMContentLoaded", () => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            window.tableau.extensions.initializeAsync().then(() => {
                fetchTableauData();
            }).catch(err => {
                console.error("שגיאה בהפעלת Tableau Extension API:", err);
            });
        } else {
            console.warn("Tableau Environment לא זוהה - טוען נתוני דמה לבדיקה");
            loadMockData(); // מנגנון נתוני דמה לבדיקות פיתוח מקומי
        }

        setupEventListeners();
    });

    // שליפת הנתונים מהגיליון הנסתר בדשבורד
    async function fetchTableauData() {
        try {
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            // שליפת הגיליון הראשון (או גיליון ייעודי בשם DataWorksheet)
            const worksheet = dashboard.worksheets.find(w => w.name === "DataWorksheet") || dashboard.worksheets[0];
            
            if (!worksheet) return;

            const summaryData = await worksheet.getSummaryDataAsync();[cite: 1]
            const columns = summaryData.columns;
            
            // מיפוי עמודות לפי שמות השדות בטבלה שלך
            const catIdx = columns.findIndex(c => c.fieldName === "Category");
            const dashIdx = columns.findIndex(c => c.fieldName === "DashboardName");
            const descIdx = columns.findIndex(c => c.fieldName === "Description");
            const urlIdx = columns.findIndex(c => c.fieldName === "DashboardURL");
            const imgIdx = columns.findIndex(c => c.fieldName === "PreviewImageURL");

            portalData = summaryData.data.map(row => ({
                category: catIdx !== -1 ? row[catIdx].value : '',
                name: dashIdx !== -1 ? row[dashIdx].value : '',
                description: descIdx !== -1 ? row[descIdx].value : '',
                url: urlIdx !== -1 ? row[urlIdx].value : '#',
                previewUrl: imgIdx !== -1 ? row[imgIdx].value : ''
            }));

            renderPortal();
        } catch (error) {
            console.error("שגיאה בשליפת הנתונים מטאבלו:", error);
        }
    }

    // רינדור ראשי של הפורטל
    function renderPortal() {
        const categories = [...new Set(portalData.map(item => item.category))].filter(Boolean);
        
        renderNavTabs(categories);
        renderCategoryCards(categories);
    }

    // יצירת הלשוניות ב-Header
    function renderNavTabs(categories) {
        const container = document.getElementById("categoryTabs");
        container.innerHTML = `<button class="tab-btn active" data-cat="ALL">הכל</button>`;

        categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.className = "tab-btn";
            btn.textContent = cat;
            btn.onclick = () => showSubView(cat);
            container.appendChild(btn);
        });
    }

    // יצירת כרטיסי הקטגוריות בדף הראשי
    function renderCategoryCards(categories) {
        const grid = document.getElementById("categoriesGrid");
        grid.innerHTML = "";

        categories.forEach(cat => {
            const count = portalData.filter(d => d.category === cat).length;
            const card = document.createElement("div");
            card.className = "category-card";
            card.onclick = () => showSubView(cat);

            card.innerHTML = `
                <div>
                    <div class="card-header">
                        <span class="card-title">${cat}</span>
                        <span class="card-icon">📁</span>
                    </div>
                    <div class="card-desc">${count} דוחות זמינים בקטגוריה זו</div>
                </div>
                <span class="card-footer-link">כניסה לקטגוריה ←</span>
            `;
            grid.appendChild(card);
        });
    }

    // מעבר לדף המשני ברמת דשבורד
    function showSubView(categoryName) {
        currentCategory = categoryName;
        document.getElementById("mainView").classList.remove("active");
        document.getElementById("subView").classList.add("active");

        document.getElementById("selectedCategoryTitle").textContent = categoryName;
        document.getElementById("selectedCategoryDesc").textContent = `מציג את כל הדוחות תחת קטגוריית ${categoryName}`;

        // עדכון הלשוניות
        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.textContent === categoryName);
        });

        renderDashboardRows(categoryName);
    }

    // חזרה לדף הראשי
    function showMainView() {
        document.getElementById("subView").classList.remove("active");
        document.getElementById("mainView").classList.active = true;
        document.getElementById("mainView").classList.add("active");

        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.cat === "ALL");
        });
    }

    // רינדור שורות הדשבורדים בדף המשני
    function renderDashboardRows(categoryName, filterText = "") {
        const listContainer = document.getElementById("dashboardsList");
        listContainer.innerHTML = "";

        let items = portalData.filter(d => d.category === categoryName);
        if (filterText) {
            items = items.filter(d => d.name.toLowerCase().includes(filterText.toLowerCase()));
        }

        items.forEach(dash => {
            const row = document.createElement("div");
            row.className = "dashboard-row";

            row.innerHTML = `
                <div class="dash-info">
                    <span class="dash-icon">📊</span>
                    <div class="dash-details">
                        <h4>${dash.name}</h4>
                        <p>${dash.description}</p>
                    </div>
                </div>
                <a href="${dash.url}" target="_blank" class="btn-open">פתיחה ↗</a>
            `;

            // אירועי Hover להצגת תמונת ה-Preview
            row.addEventListener("mouseenter", (e) => showPreview(e, dash.previewUrl));
            row.addEventListener("mousemove", (e) => movePreview(e));
            row.addEventListener("mouseleave", hidePreview);

            listContainer.appendChild(row);
        });
    }

    // מנגנון Preview Image on Hover
    const tooltip = document.getElementById("imagePreviewTooltip");
    const previewImg = document.getElementById("previewImage");

    function showPreview(e, url) {
        if (!url) return;
        previewImg.src = url;
        tooltip.style.display = "block";
        movePreview(e);
    }

    function movePreview(e) {
        if (tooltip.style.display === "block") {
            tooltip.style.left = (e.clientX + 15) + "px";
            tooltip.style.top = (e.clientY + 15) + "px";
        }
    }

    function hidePreview() {
        tooltip.style.display = "none";
        previewImg.src = "";
    }

    // הגדרת אירועי חיפוש וניווט
    function setupEventListeners() {
        document.getElementById("btnBack").onclick = showMainView;

        // חיפוש בדף המשני
        document.getElementById("subSearchInput").addEventListener("input", (e) => {
            if (currentCategory) {
                renderDashboardRows(currentCategory, e.target.value);
            }
        });

        // חיפוש גלובלי עם Autocomplete בדף הראשי
        const globalSearch = document.getElementById("globalSearchInput");
        const autoList = document.getElementById("autocompleteList");

        globalSearch.addEventListener("input", (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (!val) {
                autoList.style.display = "none";
                return;
            }

            const matches = portalData.filter(d => d.name.toLowerCase().includes(val));
            if (matches.length === 0) {
                autoList.style.display = "none";
                return;
            }

            autoList.innerHTML = "";
            matches.forEach(m => {
                const li = document.createElement("li");
                li.innerHTML = `<strong>${m.name}</strong> <small style="color:#64748b">(${m.category})</small>`;
                li.onclick = () => {
                    showSubView(m.category);
                    globalSearch.value = "";
                    autoList.style.display = "none";
                };
                autoList.appendChild(li);
            });
            autoList.style.display = "block";
        });

        document.addEventListener("click", (e) => {
            if (!globalSearch.contains(e.target)) {
                autoList.style.display = "none";
            }
        });
    }

    // נתוני דמה לבדיקה סביבתית מחוץ לטאבלו
    function loadMockData() {
        portalData = [
            { category: "הנהלה", name: "פורטפוליו פרויקטים", description: "סטטוס פרויקטים אסטרטגיים, תקציב מול ביצוע", url: "#", previewUrl: "https://via.placeholder.com/300x180/006674/ffffff?text=Portfolio+Preview" },
            { category: "הנהלה", name: "דוח בוקר יומי", description: "עדכון יומי אוטומטי של מדדי מפתח לשעה 07:00", url: "#", previewUrl: "https://via.placeholder.com/300x180/0284c7/ffffff?text=Morning+Report" },
            { category: "כספים", name: "תזרים מזומנים", description: "מעקב הכנסות והוצאות בזמן אמת", url: "#", previewUrl: "https://via.placeholder.com/300x180/10b981/ffffff?text=Cash+Flow" }
        ];
        renderPortal();
    }
})();
