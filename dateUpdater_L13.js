(function() {
    const VERSION = "v4.7.0-BulletproofReset";
    let attempts = 0;
    const MAX_ATTEMPTS = 400;

    const checkTableauLoaded = setInterval(() => {
        attempts++;
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            
            if (!document.getElementById("statusMessage")) {
                console.error(`[Tableau Extension] ❌ Missing HTML element with ID 'statusMessage'`);
                return;
            }
            
            autoDiscoverAndSync();
        } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(checkTableauLoaded);
            console.error(`[Tableau Extension] Timeout loading Tableau Extensions API.`);
        }
    }, 50);

    async function autoDiscoverAndSync() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;

            let targetWorksheet = null;
            let targetFilter = null;

            // --- שלב 1: סריקה וזיהוי פילטר הטווח הפעיל ---
            for (const worksheet of dashboard.worksheets) {
                const filters = await worksheet.getFiltersAsync();
                const rangeFilter = filters.find(f => f.filterType === window.tableau.FilterType.Range);
                
                if (rangeFilter) {
                    targetWorksheet = worksheet;
                    targetFilter = rangeFilter;
                    break;
                }
            }

            if (!targetWorksheet || !targetFilter) {
                renderError(`לא נמצא פילטר מסוג Range (סליידר) באף גיליון בדשבורד.`);
                return;
            }

            const targetFilterName = targetFilter.fieldName;
            let rawMaxDate = null;

            // --- שלב 2: ניסיון שליפה עדין מה-Domain, עם תפיסת שגיאות למניעת 400 Internal Error ---
            try {
                const domainInfo = await targetFilter.getDomainAsync();
                if (domainInfo) {
                    // לעיתים ה-max נמצא ב-max.value ולעיתים ישירות ב-max
                    const maxVal = domainInfo.max && domainInfo.max.value ? domainInfo.max.value : domainInfo.max;
                    if (maxVal) {
                        const parsed = new Date(maxVal);
                        if (!isNaN(parsed.getTime())) {
                            rawMaxDate = parsed;
                        }
                    }
                }
            } catch (domainError) {
                console.warn("[DateUpdater] Domain fetch skipped or failed, moving to summary data fallback.", domainError);
            }

            // --- שלב 3: מנגנון Fallback חסין לחלוטין (מופעל גם כשהפילטר מנוקה / Reset) ---
            if (!rawMaxDate || isNaN(rawMaxDate.getTime())) {
                try {
                    const summaryData = await targetWorksheet.getSummaryDataAsync();
                    const dateColumn = summaryData.columns.find(col => 
                        col.dataType === 'date' || col.dataType === 'date-time' || col.fieldName === targetFilterName
                    );
                    
                    if (dateColumn && summaryData.data.length > 0) {
                        const dateColumnIndex = dateColumn.index;
                        let maxTime = 0;
                        summaryData.data.forEach(row => {
                            const rawCell = row[dateColumnIndex];
                            if (rawCell && rawCell.value) {
                                let parsedDate = new Date(rawCell.value);
                                if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > maxTime) {
                                    maxTime = parsedDate.getTime();
                                    rawMaxDate = parsedDate;
                                }
                            }
                        });
                    }
                } catch (summaryError) {
                    console.warn("[DateUpdater] Summary data fallback failed, using current date.", summaryError);
                }
            }

            // ברירת מחדל סופית אם כל השאר נכשל
            if (!rawMaxDate || isNaN(rawMaxDate.getTime())) {
                rawMaxDate = new Date();
            }

            // --- שלב 4: חילוץ שנה וחודש בצורה בטוחה (UTC) ---
            let maxYear = !isNaN(rawMaxDate.getUTCFullYear()) ? rawMaxDate.getUTCFullYear() : rawMaxDate.getFullYear();
            let maxMonth = !isNaN(rawMaxDate.getUTCMonth()) ? rawMaxDate.getUTCMonth() : rawMaxDate.getMonth();

            let truncatedMaxDate = new Date(Date.UTC(maxYear, maxMonth, 1));
            let calculatedMinDate = new Date(Date.UTC(maxYear - 1, maxMonth, 1));

            if (isNaN(truncatedMaxDate.getTime()) || isNaN(calculatedMinDate.getTime())) {
                throw new Error("התאריכים המחושבים אינם תקינים.");
            }

            // --- שלב 5: החלת הפילטר בטאבלו עם מעטפת הגנה מפני שגיאות 400 ---
            try {
                await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                    min: calculatedMinDate,
                    max: truncatedMaxDate
                });
            } catch (applyErr) {
                console.error("[DateUpdater] Direct apply failed, attempting reset sequence...", applyErr);
                // במקרה קיצוני של דחייה מצד השרת, ננסה לאפס לטווח רחב ואז לצמצם
                let safeMin = new Date(Date.UTC(maxYear - 3, 0, 1));
                let safeMax = new Date(Date.UTC(maxYear, 11, 31));
                await targetWorksheet.applyRangeFilterAsync(targetFilterName, { min: safeMin, max: safeMax });
                
                // ניסיון שני תחולה סופית
                await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                    min: calculatedMinDate,
                    max: truncatedMaxDate
                });
            }

            // --- שלב 6: עדכון ה-UI למשתמש ---
            renderUI(
                calculatedMinDate.toLocaleDateString('he-IL', {timeZone: 'UTC'}), 
                truncatedMaxDate.toLocaleDateString('he-IL', {timeZone: 'UTC'}), 
                targetFilterName, 
                targetWorksheet.name,
                VERSION
            );

        } catch (error) {
            renderError(`שגיאה בתהליך הסנכרון: ${error.message}`);
        }
    }

    function renderUI(startDateFormatted, endDateFormatted, filterName, sheetName, version) {
        const container = document.getElementById("statusMessage");
        if (!container) return;
        
        container.innerHTML = `
            <style>
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
                .status-card {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                    direction: rtl;
                    text-align: right;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 14px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    max-width: 290px;
                    margin: 0 auto;
                }
                .status-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .status-title-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse 2s infinite ease-in-out;
                }
                .status-title {
                    color: #0f172a;
                    font-weight: 600;
                    font-size: 13px;
                }
                .version-badge {
                    font-size: 10px;
                    background: #f1f5f9;
                    color: #475569;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: monospace;
                }
                .meta-info {
                    font-size: 11px;
                    color: #64748b;
                    margin-bottom: 8px;
                    line-height: 1.4;
                }
                .date-display {
                    background: #f8fafc;
                    border: 1px dashed #cbd5e1;
                    border-radius: 6px;
                    padding: 8px 12px;
                    text-align: center;
                }
                .date-label {
                    font-size: 11px;
                    color: #64748b;
                    display: block;
                    margin-bottom: 4px;
                }
                .date-value {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1e293b;
                }
            </style>
            
            <div class="status-card">
                <div class="status-header">
                    <div class="status-title-group">
                        <span class="status-dot"></span>
                        <span class="status-title">טווח תאריכים עודכן</span>
                    </div>
                    <span class="version-badge">${version}</span>
                </div>
                <div class="meta-info">
                    גיליון: <strong>${sheetName}</strong><br>
                    פילטר: <strong>${filterName}</strong>
                </div>
                <div class="date-display">
                    <span class="date-label">טווח מעודכן (שנה אחורה):</span>
                    <span class="date-value">${startDateFormatted} - ${endDateFormatted}</span>
                </div>
            </div>
        `;
    }

    function renderError(msg) {
        const container = document.getElementById("statusMessage");
        if (!container) return;
        
        container.innerHTML = `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #dc2626; padding: 12px; border: 1px solid #fca5a5; background: #fef2f2; border-radius: 6px; font-size: 13px;">
                <strong>❌ שגיאה בסנכרון:</strong><br>${msg}
            </div>
        `;
    }
})();
