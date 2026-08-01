(function () {
    let rawData = [];
    let categoriesData = {};
    let attempts = 0;
    const MAX_ATTEMPTS = 400;

    // מנגנון הבדיקה והסנכרון הבטוח מהקוד העובד
    const checkTableauLoaded = setInterval(() => {
        attempts++;
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            initPortalExtension();
        } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(checkTableauLoaded);
            renderError("Timeout: לא ניתן לטעון את Tableau Extensions API.");
        }
    }, 50);

    async function initPortalExtension() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;

            // איתור הגיליון (לוקח את הגיליון הראשון או מחיפוש לפי שם)
            let worksheet = dashboard.worksheets.find(ws => ws.name === "Data_Sheet") || dashboard.worksheets[0];

            if (!worksheet) {
                renderError("לא נמצא גיליון נתונים בדשבורד.");
                return;
            }

            const summaryData = await worksheet.getSummaryDataAsync();
            parseTableauData(summaryData);
            setupEventListeners();
            renderCategoriesView();

        } catch (err) {
            renderError(`שגיאה בטעינת הנתונים: ${err.message}`);
        }
    }

    // המרת ה-DataTable של טאבלו לאובייקטים בצורה מוגנת
    function parseTableauData(summaryData) {
        const columns = summaryData.columns.map(c => c.fieldName.trim());

        // זיהוי אינדקסים לפי שמות העמודות בטבלה
        const idxCat = columns.findIndex(c => c.includes("קטגוריה") || c.toLowerCase().includes("category"));
        const idxDash = columns.findIndex(c => c.includes("דשבורד") || c.toLowerCase().includes("dashboard"));
        const idxDesc = columns.findIndex(c => c.includes("תיאור") || c.toLowerCase().includes("description"));
        const idxUrl = columns.findIndex(c => c === "URL" || c.toLowerCase().includes("url"));
        const idxImage = columns.findIndex(c => c.includes("תמונה") || c.toLowerCase().includes("image"));

        rawData = [];
        categoriesData = {};

        summaryData.data.forEach(row => {
            const item = {
                category: idxCat !== -1 && row[idxCat] ? row[idxCat].formattedValue || row[idxCat].value : '',
                dashboard: idxDash !== -1 && row[idxDash] ? row[idxDash].formattedValue || row[idxDash].value : '',
                description: idxDesc !== -1 && row[idxDesc] ? row[idxDesc].formattedValue || row[idxDesc].value : '',
                url: idxUrl !== -1 && row[idxUrl] ? row[idxUrl].formattedValue || row[idxUrl].value : '#',
                image: idxImage !== -1 && row[idxImage] ? row[idxImage].formattedValue || row[idxImage].value : ''
            };

            if (item.category && item.dashboard) {
                rawData.push(item);
                if (!categoriesData[item.category]) {
                    categoriesData[item.category] = [];
                }
                categoriesData[item.category].push(item);
            }
        });
    }

    // הצגת קטגוריות
    function renderCategoriesView() {
        const grid = document.getElementById('categories-grid');
        if (!grid) return;
        grid.innerHTML = '';

        Object.keys(categoriesData).forEach(catName => {
            const count = categoriesData[catName].length;
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `
                <h3>${catName}</h3>
                <p>${count} דשבורדים</p>
                <span class="card-link">כניסה לקטגוריה &larr;</span>
            `;
            card.onclick = () => openCategory(catName);
            grid.appendChild(card);
        });
    }

    // הצגת רשימת דשבורדים בקטגוריה
    function openCategory(catName) {
        document.getElementById('main-view').classList.remove('active');
        document.getElementById('sub-view').classList.add('active');
        document.getElementById('selected-category-title').innerText = catName;

        const list = document.getElementById('dashboards-list');
        list.innerHTML = '';

        const items = categoriesData[catName] || [];
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'dashboard-row';
            row.innerHTML = `
                <div class="dash-info">
                    <h4>${item.dashboard}</h4>
                    <p>${item.description}</p>
                </div>
                <a href="${item.url}" target="_blank" class="btn-open">פתיחה ↗</a>
            `;

            // Hover Image Preview
            if (item.image) {
                row.addEventListener('mouseenter', (e) => showPreview(e, item.image));
                row.addEventListener('mousemove', (e) => movePreview(e));
                row.addEventListener('mouseleave', hidePreview);
            }

            list.appendChild(row);
        });
    }

    // מנגנון ה-Hover לתמונה מקדימה
    const tooltip = document.getElementById('preview-tooltip');
    const tooltipImg = document.getElementById('preview-img');

    function showPreview(e, imgSrc) {
        if (!tooltip || !tooltipImg) return;
        tooltipImg.src = imgSrc;
        tooltip.style.display = 'block';
        movePreview(e);
    }

    function movePreview(e) {
        if (!tooltip) return;
        tooltip.style.left = (e.clientX - 330) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    }

    function hidePreview() {
        if (!tooltip) return;
        tooltip.style.display = 'none';
        tooltipImg.src = '';
    }

    // ניהול החיפוש וה-Autocomplete
    function setupEventListeners() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                document.getElementById('sub-view').classList.remove('active');
                document.getElementById('main-view').classList.add('active');
            };
        }

        const globalSearch = document.getElementById('global-search');
        const autoDropdown = document.getElementById('autocomplete-results');

        if (globalSearch && autoDropdown) {
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
    }

    function renderError(msg) {
        const container = document.getElementById("statusMessage");
        if (!container) return;
        container.innerHTML = `
            <div style="direction: rtl; color: #dc2626; padding: 12px; border: 1px solid #fca5a5; background: #fef2f2; border-radius: 6px; font-size: 13px;">
                <strong>❌ שגיאה:</strong> ${msg}
            </div>
        `;
    }
})();
