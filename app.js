(function () {
    let portalData = [];
    let currentCategory = null;
    // Cache לתמונות שכבר נטענו כדי למנוע בקשות רשת חוזרות
    const imageCache = new Map();

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
            const imgIdx = columns.findIndex(c => c.fieldName === "PreviewURL" || c.fieldName === "PreviewImageURL");

            portalData = summaryData.data.map(row => ({
                category: (catIdx !== -1 && row[catIdx]) ? (row[catIdx].formattedValue || row[catIdx].value) : '',
                name: (dashIdx !== -1 && row[dashIdx]) ? (row[dashIdx].formattedValue || row[dashIdx].value) : '',
                description: (descIdx !== -1 && row[descIdx]) ? (row[descIdx].formattedValue || row[descIdx].value) : '',
                url: (urlIdx !== -1 && row[urlIdx]) ? (row[urlIdx].formattedValue || row[urlIdx].value) : '#',
                previewUrl: (imgIdx !== -1 && row[imgIdx]) ? (row[imgIdx].formattedValue || row[imgIdx].value) : ''
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

    function showSubView(categoryName) {
        currentCategory = categoryName;
        document.getElementById("mainView").classList.remove("active");
        document.getElementById("subView").classList.add("active");

        document.getElementById("selectedCategoryTitle").textContent = categoryName;
        document.getElementById("selectedCategoryDesc").textContent = `מציג את כל הדוחות תחת קטגוריית ${categoryName}`;

        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.classList.toggle("active", btn.textContent === categoryName);
        });

        renderDashboardRows(categoryName);
    }

    function showMainView() {
        document.getElementById("subView").classList.remove("active");
        document.getElementById("mainView").classList.add("active");

        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.classList.remove("active");
        });
    }

    function renderDashboardRows(categoryName, filterText = "") {
        const listContainer = document.getElementById("dashboardsList");
        if (!listContainer) return;
        
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

            row.addEventListener("mouseenter", (e) => showPreview(e, dash.previewUrl));
            row.addEventListener("mousemove", (e) => movePreview(e));
            row.addEventListener("mouseleave", hidePreview);

            listContainer.appendChild(row);
        });
    }

    // === מנגנון HOVER PREVIEW VIEW (פתרון בעיית CORS/Authentication) ===
    const tooltip = document.getElementById("imagePreviewTooltip");
    const previewImg = document.getElementById("previewImage");

    async function showPreview(e, url) {
        if (!url || url === 'Null' || url === 'null' || !tooltip || !previewImg) return;

        let cleanUrl = String(url).trim();
        if (!cleanUrl || cleanUrl === '#' || cleanUrl.toLowerCase() === 'null') return;

        if (cleanUrl.endsWith('.Png')) {
            cleanUrl = cleanUrl.slice(0, -4) + '.png';
        }

        // 1. בדיקה אם התמונה כבר נשמרה בזיכרון המטמון
        if (imageCache.has(cleanUrl)) {
            previewImg.src = imageCache.get(cleanUrl);
            tooltip.style.display = "block";
            movePreview(e);
            return;
        }

        // 2. טעינת התמונה באמצעות Fetch עם Credentials לעקיפת חסימת הדפדפן
        try {
            const response = await fetch(cleanUrl, { mode: 'cors', credentials: 'include' });
            if (!response.ok) throw new Error("חסימת אבטחה או קישור לא תקין");

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            imageCache.set(cleanUrl, objectUrl); // שמירה ב-Cache
            previewImg.src = objectUrl;
            tooltip.style.display = "block";
            movePreview(e);
        } catch (err) {
            // ניסיון נפילה (Fallback) לטעינה ישירה למקרה שאין CORS חסום
            previewImg.src = cleanUrl;
            tooltip.style.display = "block";
            movePreview(e);
        }
    }

    function movePreview(e) {
        if (tooltip && tooltip.style.display === "block") {
            tooltip.style.left = (e.clientX + 15) + "px";
            tooltip.style.top = (e.clientY + 15) + "px";
        }
    }

    function hidePreview() {
        if (tooltip && previewImg) {
            tooltip.style.display = "none";
        }
    }

    function setupEventListeners() {
        const brandLogo = document.getElementById("brandLogo");
        if (brandLogo) brandLogo.onclick = showMainView;

        const btnBack = document.getElementById("btnBack");
        if (btnBack) btnBack.onclick = showMainView;

        const subSearch = document.getElementById("subSearchInput");
        if (subSearch) {
            subSearch.addEventListener("input", (e) => {
                if (currentCategory) {
                    renderDashboardRows(currentCategory, e.target.value);
                }
            });
        }

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
    }

    function loadMockData() {
        portalData = [
            { category: "קטגוריה1", name: "דוח1", description: "בלה בלה", url: "https://tableau.com", previewUrl: "https://via.placeholder.com/300x180/543b93/ffffff?text=Preview+1" },
            { category: "קטגוריה1", name: "דוח2", description: "בלה בלה", url: "https://tableau.com", previewUrl: "" }
        ];
        renderPortal();
    }
})();
