(function () {
    let portalData = [];
    let currentCategory = null;

    // מיפוי שמות הקבצים לפי שמות הקטגוריות המדויקים
    const categoryIconFiles = {
        "הנהלה": "briefcase-business.png",
        "מוצרים": "package.png",
        "שירות ותמיכת תוכנה": "headset.png",
        "תקשורת": "radio.png",
        "ממשק צד ג'": "plug.png",
        "ממשל ושותפים": "handshake.png",
        "דוחות משתמשים": "users.png",
        "דוחות ATM": "credit-card.png",
        
        // התאמה למקרה של שמות זמניים:
        "קטגוריה1": "briefcase-business.png",
        "קטגוריה2": "package.png",
        "קטגוריה3": "headset.png",
        "קטגוריה4": "radio.png",
        "קטגוריה5": "plug.png",
        "קטגוריה6": "handshake.png",
        "קטגוריה7": "users.png",
        "קטגוריה8": "credit-card.png"
    };

    /**
     * פונקציית עזר לאימות כתובות URL
     * מונעת הרצת javascript: או הפניות לא מורשות
     */
    function sanitizeUrl(urlString) {
        if (!urlString) return '#';
        const trimmed = urlString.trim();
        try {
            const parsed = new URL(trimmed, window.location.origin);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return trimmed;
            }
        } catch (e) {
            // במידה ומדובר בנתיב יחסי תקין
            if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
                return trimmed;
            }
        }
        return '#';
    }

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
                category: (catIdx !== -1 && row[catIdx]) ? String(row[catIdx].formattedValue || row[catIdx].value || '') : '',
                name: (dashIdx !== -1 && row[dashIdx]) ? String(row[dashIdx].formattedValue || row[dashIdx].value || '') : '',
                description: (descIdx !== -1 && row[descIdx]) ? String(row[descIdx].formattedValue || row[descIdx].value || '') : '',
                url: (urlIdx !== -1 && row[urlIdx]) ? sanitizeUrl(row[urlIdx].formattedValue || row[urlIdx].value) : '#'
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
            btn.textContent = cat; // שימוש ב-textContent למניעת XSS
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
            const fileName = categoryIconFiles[cat];
            const card = document.createElement("div");
            card.className = "category-card";
            card.onclick = () => showSubView(cat);

            // יצירת חלק עליון
            const topDiv = document.createElement("div");
            const headerDiv = document.createElement("div");
            headerDiv.className = "card-header";

            const titleSpan = document.createElement("span");
            titleSpan.className = "card-title";
            titleSpan.textContent = cat;

            headerDiv.appendChild(titleSpan);

            if (fileName) {
                const img = document.createElement("img");
                img.src = `./${fileName}`;
                img.alt = cat;
                img.className = "card-icon-img";
                img.onerror = function() {
                    this.onerror = null;
                    const span = document.createElement("span");
                    span.className = "card-icon";
                    span.textContent = "📁";
                    this.replaceWith(span);
                };
                headerDiv.appendChild(img);
            } else {
                const iconSpan = document.createElement("span");
                iconSpan.className = "card-icon";
                iconSpan.textContent = "📁";
                headerDiv.appendChild(iconSpan);
            }

            const descDiv = document.createElement("div");
            descDiv.className = "card-desc";
            descDiv.textContent = `${count} דוחות זמינים בקטגוריה זו`;

            topDiv.appendChild(headerDiv);
            topDiv.appendChild(descDiv);

            const footerSpan = document.createElement("span");
            footerSpan.className = "card-footer-link";
            footerSpan.textContent = "כניסה לקטגוריה ←";

            card.appendChild(topDiv);
            card.appendChild(footerSpan);

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

            const rawDesc = dash.description ? dash.description.trim() : "";
            const hasDescription = rawDesc !== "" && rawDesc.toLowerCase() !== "null" && rawDesc.toLowerCase() !== "undefined";

            // בניית מבנה ה-DOM בבטחה
            const dashInfo = document.createElement("div");
            dashInfo.className = "dash-info";

            const dashImg = document.createElement("img");
            dashImg.src = "./layout-dashboard.png";
            dashImg.alt = "דשבורד";
            dashImg.className = "dash-icon-img";
            dashImg.onerror = function() {
                this.onerror = null;
                const span = document.createElement("span");
                span.className = "dash-icon";
                span.textContent = "📊";
                this.replaceWith(span);
            };

            const dashDetails = document.createElement("div");
            dashDetails.className = "dash-details";

            const h4 = document.createElement("h4");
            h4.textContent = dash.name; // בטוח מפני XSS
            dashDetails.appendChild(h4);

            if (hasDescription) {
                const p = document.createElement("p");
                p.className = "dash-desc";
                p.textContent = rawDesc; // בטוח מפני XSS
                dashDetails.appendChild(p);
            }

            dashInfo.appendChild(dashImg);
            dashInfo.appendChild(dashDetails);

            // כפתור פתיחה עם הגנה מפני Reverse Tabnabbing ו-XSS
            const openLink = document.createElement("a");
            openLink.href = sanitizeUrl(dash.url);
            openLink.target = "_blank";
            openLink.rel = "noopener noreferrer"; // הגנת אבטחה קריטית
            openLink.className = "btn-open";
            openLink.textContent = "פתיחה ↗";

            row.appendChild(dashInfo);
            row.appendChild(openLink);

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
                    const strong = document.createElement("strong");
                    strong.textContent = m.name;
                    li.appendChild(strong);

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
                    const strong = document.createElement("strong");
                    strong.textContent = m.name;

                    const small = document.createElement("small");
                    small.textContent = ` (${m.category})`;

                    li.appendChild(strong);
                    li.appendChild(small);

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