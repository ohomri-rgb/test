(function () {
    let portalData = [];
    let currentCategory = null;

    const categoryIcons = {
    "הנהלה": "👔",
    "מוצרים": "📦",
    "שירות ותמיכת תוכנה": "🛠️",
    "תקשורת": "📡",
    "ממשק צד ג'": "🔌",
    "ממשל ושותפים": "🤝",
    "דוחות משתמשים": "👥",
    "דוחות ATM": "🏧"
};

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            window.tableau.extensions.initializeAsync().then(function () {
                fetchTableauData();
            }).catch(function (err) {
                console.error("שגיאה בהפעלת Tableau Extension API:", err);
            });
        } else {
            console.warn("Tableau API לא זוהה - טוען נתוני דמה לבדיקה מקומית");
            loadMockData();
        }

        setupEventListeners();
    });

    async function fetchTableauData() {
        try {
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            const worksheet = dashboard.worksheets.find(w => w.name === "Sheet 1") || dashboard.worksheets[0];
            
            if (!worksheet) return;

            const summaryData = await worksheet.getSummaryDataAsync();
            const columns = summaryData.columns;
            
            const catIdx = columns.findIndex(c => c.fieldName === "קטגוריה" || c.fieldName === "Category");
            const dashIdx = columns.findIndex(c => c.fieldName === "דשבורד" || c.fieldName === "Dashboard");
            const descIdx = columns.findIndex(c => c.fieldName === "תיאור" || c.fieldName === "Description");
            const urlIdx = columns.findIndex(c => c.fieldName === "URL" || c.fieldName === "DashboardURL");
            

            portalData = summaryData.data.map(row => ({
                category: (catIdx !== -1 && row[catIdx]) ? (row[catIdx].formattedValue || row[catIdx].value) : '',
                icon: categoryIcons[(catIdx !== -1 && row[catIdx]) ? (row[catIdx].formattedValue || row[catIdx].value) : ''] || "📁",
                name: (dashIdx !== -1 && row[dashIdx]) ? (row[dashIdx].formattedValue || row[dashIdx].value) : '',
                description: (descIdx !== -1 && row[descIdx]) ? (row[descIdx].formattedValue || row[descIdx].value) : '',
                url: (urlIdx !== -1 && row[urlIdx]) ? (row[urlIdx].formattedValue || row[urlIdx].value) : '#'
            }));

            portalData = portalData.filter(d => d.category && d.name);
            renderPortal();
        } catch (error) {
            console.error("שגיאה בשליפת הנתונים מטאבלו:", error);
        }
    }

function renderPortal() {
    const categories = [...new Set(portalData.map(item => item.category))].filter(Boolean);
    renderNavTabs(categories);
    renderCategoryCards(categories);
}

function renderNavTabs(categories) {
    const container = document.getElementById("categoryTabs");
    if (!container) return;

    container.innerHTML = "";

    categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "tab-btn";
        
        // שליפת האייקון או אייקון ברירת מחדל
        const icon = categoryIcons[cat] || "📁";
        btn.innerHTML = `${icon} ${cat}`;
        
        btn.onclick = () => showSubView(cat);
        container.appendChild(btn);
});
}

    function renderCategoryCards(categories) {
        const grid = document.getElementById("categoriesGrid");
        if (!grid) return;
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

    function showSubView(categoryName, highlightDashName = null) {
        currentCategory = categoryName;
        document.getElementById("mainView").classList.remove("active");
        document.getElementById("subView").classList.add("active");

        document.getElementById("selectedCategoryTitle").textContent = categoryName;
        document.getElementById("selectedCategoryDesc").textContent = `מציג את כל הדוחות תחת קטגוריית ${categoryName}`;

        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.textContent === categoryName);
        });

        const subSearch = document.getElementById("subSearchInput");
        if (subSearch) subSearch.value = "";

        const subAutoList = document.getElementById("subAutocompleteList");
        if (subAutoList) subAutoList.style.display = "none";

        renderDashboardRows(categoryName, "", highlightDashName);
    }

    function showMainView() {
        document.getElementById("subView").classList.remove("active");
        document.getElementById("mainView").classList.add("active");

        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.classList.remove("active");
        });
    }

    function renderDashboardRows(categoryName, filterText = "", highlightDashName = null) {
        const listContainer = document.getElementById("dashboardsList");
        if (!listContainer) return;
        
        listContainer.innerHTML = "";

        let items = portalData.filter(d => d.category === categoryName);
        if (filterText) {
            items = items.filter(d => d.name.toLowerCase().includes(filterText.toLowerCase()));
        }

        let targetRowElement = null;

        items.forEach(dash => {
            const row = document.createElement("div");
            row.className = "dashboard-row";

            const rawDesc = dash.description ? String(dash.description).trim() : "";
            const hasDescription = rawDesc !== "" && rawDesc.toLowerCase() !== "null" && rawDesc.toLowerCase() !== "undefined";
            const descriptionHtml = hasDescription ? `<p class="dash-desc">${rawDesc}</p>` : '';

            row.innerHTML = `
                <div class="dash-info">
                    <span class="dash-icon">📊</span>
                    <div class="dash-details">
                        <h4>${dash.name}</h4>
                        ${descriptionHtml}
                    </div>
                </div>
                <a href="${dash.url}" target="_blank" class="btn-open">פתיחה ↗</a>
            `;

            if (highlightDashName && dash.name.trim().toLowerCase() === highlightDashName.trim().toLowerCase()) {
                targetRowElement = row;
            }

            listContainer.appendChild(row);
        });

        if (targetRowElement) {
            setTimeout(() => {
                targetRowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetRowElement.classList.add("row-highlight");
                
                setTimeout(() => {
                    targetRowElement.classList.remove("row-highlight");
                }, 2500);
            }, 100);
        }
    }

    function setupEventListeners() {
        const brandLogo = document.getElementById("brandLogo");
        if (brandLogo) brandLogo.onclick = showMainView;

        const btnBack = document.getElementById("btnBack");
        if (btnBack) btnBack.onclick = showMainView;

        // --- חיפוש פנימי בתוך קטגוריה עם Autocomplete וסינון בלייב ---
        const subSearch = document.getElementById("subSearchInput");
        const subAutoList = document.getElementById("subAutocompleteList");

        if (subSearch && subAutoList) {
            subSearch.addEventListener("input", (e) => {
                const val = e.target.value.trim().toLowerCase();
                
                // סינון הרשימה המוצגת בדף
                if (currentCategory) {
                    renderDashboardRows(currentCategory, val);
                }

                if (!val || !currentCategory) {
                    subAutoList.style.display = "none";
                    return;
                }

                // שליפת התאמות מקטגוריה נוכחית בלבד
                const matches = portalData.filter(d => 
                    d.category === currentCategory && 
                    d.name.toLowerCase().includes(val)
                );

                if (matches.length === 0) {
                    subAutoList.style.display = "none";
                    return;
                }

                subAutoList.innerHTML = "";
                matches.forEach(m => {
                    const li = document.createElement("li");
                    li.innerHTML = `<strong>${m.name}</strong>`;
                    li.onclick = () => {
                        subSearch.value = "";
                        subAutoList.style.display = "none";
                        // הצגה מלאה ואיפוס הסינון + הדגשת השורה
                        renderDashboardRows(currentCategory, "", m.name);
                    };
                    subAutoList.appendChild(li);
                });
                subAutoList.style.display = "block";
            });

            document.addEventListener("click", (e) => {
                if (!subSearch.contains(e.target) && !subAutoList.contains(e.target)) {
                    subAutoList.style.display = "none";
                }
            });
        }

        // --- חיפוש גלובלי בדף הראשי ---
        const globalSearch = document.getElementById("globalSearchInput");
        const autoList = document.getElementById("autocompleteList");

        if (globalSearch && autoList) {
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
                    li.innerHTML = `
                        <strong>${m.name}</strong>
                        <small>(${m.category})</small>
                    `;
                    li.onclick = () => {
                        showSubView(m.category, m.name);
                        globalSearch.value = "";
                        autoList.style.display = "none";
                    };
                    autoList.appendChild(li);
                });
                autoList.style.display = "block";
            });

            document.addEventListener("click", (e) => {
                if (!globalSearch.contains(e.target) && !autoList.contains(e.target)) {
                    autoList.style.display = "none";
                }
            });
        }
    }

    function loadMockData() {
        portalData = [
            { category: "תחקורים", name: "תחקור תדירות שידורים בדקה", description: "Null", url: "https://tableau.com" },
            { category: "תחקורים", name: "תחקור שידורים", description: "null", url: "https://tableau.com" },
            { category: "תחקורים", name: "דשבורד בדיקה נוסף לביצוע גלילה", description: "תיאור קצר להדגמה", url: "https://tableau.com" }
        ];
        renderPortal();
    }
})();
