(function () {
    let portalData = [];
    let currentCategory = null;

    // מיפוי אייקוני SVG Inline לכל הקטגוריות (פותר לחלוטין בעיות CORS / HTTPS / קבצים חסרים)
    const categoryIconsSVG = {
        "הנהלה": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="6" rx="2"/><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
        "מוצרים": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 12v9.5"/></svg>`,
        "שירות ותמיכת תוכנה": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
        "תקשורת": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"/></svg>`,
        "ממשק צד ג'": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></svg>`,
        "ממשל ושותפים": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-2-2"/><path d="m14 14 2.5 2.5"/><path d="M18 11V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/><path d="M8 12h4"/><path d="M8 16h2"/><path d="M8 8h8"/></svg>`,
        "דוחות משתמשים": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        "דוחות ATM": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,

        // קטגוריות ברירת מחדל/זמניות:
        "קטגוריה1": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="6" rx="2"/><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
        "קטגוריה2": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>`,
        "קטגוריה3": `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`
    };

    // אייקון דינמי לתיקייה כללית במקרה שאין התאמה במפה
    const defaultFolderSVG = `<svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3A2 2 0 0 0 6.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;

    // אייקון דשבורד לשורות ברשימה
    const dashboardRowSVG = `<svg class="dash-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`;

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
            btn.textContent = cat;
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
            const iconSvg = categoryIconsSVG[cat] || defaultFolderSVG;
            
            const card = document.createElement("div");
            card.className = "category-card";
            card.onclick = () => showSubView(cat);

            card.innerHTML = `
                <div>
                    <div class="card-header">
                        <span class="card-title">${cat}</span>
                        <div class="card-icon-wrapper">
                            ${iconSvg}
                        </div>
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
                    <div class="dash-icon-wrapper">
                        ${dashboardRowSVG}
                    </div>
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

        // --- חיפוש פנימי בתוך קטגוריה ---
        const subSearch = document.getElementById("subSearchInput");
        const subAutoList = document.getElementById("subAutocompleteList");

        if (subSearch && subAutoList) {
            subSearch.addEventListener("input", (e) => {
                const val = e.target.value.trim().toLowerCase();
                
                if (currentCategory) {
                    renderDashboardRows(currentCategory, val);
                }

                if (!val || !currentCategory) {
                    subAutoList.style.display = "none";
                    return;
                }

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
            { category: "הנהלה", name: "דוח מנהלים ראשי", description: "נתונים מרכזיים", url: "https://tableau.com" },
            { category: "מוצרים", name: "ניתוח מוצרים", description: "מכירות לפי מוצר", url: "https://tableau.com" },
            { category: "תקשורת", name: "ניתוח שידורים", description: "עומסי תקשורת", url: "https://tableau.com" }
        ];
        renderPortal();
    }
})();