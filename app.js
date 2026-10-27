// Initialize PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// Timetable Configuration (Selasa: 2, Khamis: 4)
const TIMETABLE = {
    // 2 = Selasa (Selasa)
    2: {},
    // 4 = Khamis (Khamis)
    4: {}
};

const DAY_NAMES = {
    0: "Ahad",
    1: "Isnin",
    2: "Selasa",
    3: "Rabu",
    4: "Khamis",
    5: "Jumaat",
    6: "Sabtu"
};

const MONTH_NAMES = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun", 
    "Julai", "Ogos", "September", "Oktiber", "November", "Disember"
];

// App State
let state = {
    logs: {}, // Format: { "YYYY-MM-DD": { 8: { task: "...", desc: "..." }, ... } }
    profile: {
        name: "MOHD AZRULNIZAM BIN MOHD KAMARUDIN",
        designation: "Ketua Unit ICT / Pensyarah JTMK",
        department: "Jabatan Teknologi Maklumat & Komunikasi",
        institution: "Politeknik METrO Tasek Gelugor",
        hodName: "PUAN Hajah ...",
        hodDesignation: "Ketua Jabatan Teknologi Maklumat & Komunikasi",
        isLecturer: true // default
    },
    signature: "", // base64 string
    activeDate: "", // YYYY-MM-DD
    timetable: {} // loaded from localstorage or defaulted
};

// Elements
const logDateInput = document.getElementById("log-date");
const themeToggle = document.getElementById("theme-toggle");
const activeLogDateLabel = document.getElementById("active-log-date-label");
const wfhDayWarning = document.getElementById("wfh-day-warning");
const timetableStatusBody = document.getElementById("timetable-status-body");
const saveLogBtn = document.getElementById("save-log-btn");
const printDailyBtn = document.getElementById("print-daily-btn");
const wordDailyBtn = document.getElementById("word-daily-btn");
const printMonthlyBtn = document.getElementById("print-monthly-btn");
const wordMonthlyBtn = document.getElementById("word-monthly-btn");
const filterMonthInput = document.getElementById("filter-month");
const historyTableBody = document.getElementById("history-table-body");
const totalDaysCount = document.getElementById("total-days-count");
const totalHoursCount = document.getElementById("total-hours-count");

// History print elements
const printDailyDateSelect = document.getElementById("print-daily-date-select");
const printDailyStatusBox = document.getElementById("print-daily-status-box");
const printDailyStatusError = document.getElementById("print-daily-status-error");
const printDailySelectedBtn = document.getElementById("print-daily-selected-btn");
const wordDailySelectedBtn = document.getElementById("word-daily-selected-btn");
const printMonthlyStatusBox = document.getElementById("print-monthly-status-box");
const printMonthlyStatusText = document.getElementById("print-monthly-status-text");

// Settings Elements
const profileNameInput = document.getElementById("profile-name");
const profileDesigInput = document.getElementById("profile-designation");
const profileDeptInput = document.getElementById("profile-department");
const profileInstInput = document.getElementById("profile-institution");
const hodNameInput = document.getElementById("hod-name");
const hodDesigInput = document.getElementById("hod-designation");
const saveSettingsBtn = document.getElementById("save-settings-btn");

// Signature Elements
const canvas = document.getElementById("signature-pad");
const ctx = canvas.getContext("2d");
const clearSigBtn = document.getElementById("clear-sig-btn");
const saveSigBtn = document.getElementById("save-sig-btn");
const signaturePreviewImg = document.getElementById("signature-preview-img");
const noSignatureText = document.getElementById("no-signature-text");

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    loadLocalStorageData();
    setupDateInputs();
    setupEventListeners();
    setupTabNavigation();
    setupSignaturePad();
    
    // Set theme from localstorage or default
    const savedTheme = localStorage.getItem("bdr_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeToggleIcon(savedTheme);

    // Default to active tab content loading
    loadActiveDateLog();
    updateDashboardStats();
    updateHistoryTable();
    updateSignaturePreview();
    
    // Initialize history print states
    if (printDailyDateSelect) {
        printDailyDateSelect.value = state.activeDate;
        checkDailyPrintDateStatus(state.activeDate);
    }
    updateMonthlyPrintStatus();
});

// Load Data from LocalStorage
function loadLocalStorageData() {
    const savedLogs = localStorage.getItem("bdr_logs");
    if (savedLogs) {
        state.logs = JSON.parse(savedLogs);
    }
    
    const savedProfile = localStorage.getItem("bdr_profile");
    if (savedProfile) {
        state.profile = JSON.parse(savedProfile);
        // Migrasi nama institusi jika masih nilai lalai lama
        if (state.profile.institution === "Politeknik ..." || state.profile.institution === "Politeknik Kuching Sarawak") {
            state.profile.institution = "Politeknik METrO Tasek Gelugor";
            localStorage.setItem("bdr_profile", JSON.stringify(state.profile));
        }
        
        // Ensure default lecturer status
        if (state.profile.isLecturer === undefined) {
            state.profile.isLecturer = true;
        }

        // Pre-populate input fields
        profileNameInput.value = state.profile.name;
        profileDesigInput.value = state.profile.designation;
        profileDeptInput.value = state.profile.department;
        profileInstInput.value = state.profile.institution;
        hodNameInput.value = state.profile.hodName;
        hodDesigInput.value = state.profile.hodDesignation;
        
        const isLecturerCheckbox = document.getElementById("profile-is-lecturer");
        if (isLecturerCheckbox) {
            isLecturerCheckbox.checked = state.profile.isLecturer;
        }
    } else {
        state.profile.isLecturer = true; // default
    }
    
    // Load custom timetable
    const savedTimetable = localStorage.getItem("bdr_timetable");
    if (savedTimetable) {
        state.timetable = JSON.parse(savedTimetable);
        // Migrasi paksa jika dikesan mengandungi subjek Fatimah atau jika jadual kosong
        const savedStr = JSON.stringify(state.timetable);
        if (savedStr.includes("DFC20293") || savedStr === '{"1":{},"2":{},"3":{},"4":{},"5":{}}' || Object.keys(state.timetable).length === 0) {
            state.timetable = JSON.parse(JSON.stringify(TIMETABLE));
            localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
        }
    } else {
        // Fallback to default
        state.timetable = JSON.parse(JSON.stringify(TIMETABLE));
        localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
    }

    renderManualGridInputs();
    toggleTimetableSection(state.profile.isLecturer);
    
    const savedSig = localStorage.getItem("bdr_signature");
    if (savedSig) {
        state.signature = savedSig;
    }

    // Set navbar date
    const today = new Date();
    document.getElementById("nav-date-string").innerText = `${DAY_NAMES[today.getDay()]}, ${today.getDate()} ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
}

// Setup Date Inputs
function setupDateInputs() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    
    const todayStr = `${yyyy}-${mm}-${dd}`;
    logDateInput.value = todayStr;
    state.activeDate = todayStr;
    
    if (printDailyDateSelect) {
        printDailyDateSelect.value = todayStr;
    }
    
    selectBestDefaultMonth();
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme Toggle
    themeToggle.addEventListener("click", () => {
        let currentTheme = document.documentElement.getAttribute("data-theme");
        let newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("bdr_theme", newTheme);
        updateThemeToggleIcon(newTheme);
        showToast(`Tema ditukar ke ${newTheme === 'dark' ? 'Gelap' : 'Cerah'}`);
    });

    // Date Picker Change
    logDateInput.addEventListener("change", (e) => {
        state.activeDate = e.target.value;
        loadActiveDateLog();
    });

    // Save Log Button
    saveLogBtn.addEventListener("click", () => {
        saveActiveDateLog();
    });

    // Save Settings Button
    saveSettingsBtn.addEventListener("click", () => {
        state.profile = {
            name: profileNameInput.value.trim(),
            designation: profileDesigInput.value.trim(),
            department: profileDeptInput.value.trim(),
            institution: profileInstInput.value.trim(),
            hodName: hodNameInput.value.trim(),
            hodDesignation: hodDesigInput.value.trim()
        };
        localStorage.setItem("bdr_profile", JSON.stringify(state.profile));
        if (typeof saveUserDataToCloud === 'function') saveUserDataToCloud(true);
        
        // Update sidebar and top fields
        document.querySelector(".profile-card h4").innerText = state.profile.name.split(" ")[0] || "USER";
        document.querySelector(".profile-card .designation").innerText = state.profile.designation;
        
        showToast("Maklumat peribadi berjaya dikemas kini!");
    });

    // Print Daily Button
    printDailyBtn.addEventListener("click", () => {
        triggerDailyPrint();
    });

    // Word Daily Button (Dashboard)
    if (wordDailyBtn) {
        wordDailyBtn.addEventListener("click", () => {
            exportDailyWord(state.activeDate);
        });
    }

    // Print Monthly Button
    printMonthlyBtn.addEventListener("click", () => {
        triggerMonthlyPrint();
    });

    // Word Monthly Button
    if (wordMonthlyBtn) {
        wordMonthlyBtn.addEventListener("click", () => {
            exportMonthlyWord();
        });
    }

    // Month filter change updates history table and monthly print status
    filterMonthInput.addEventListener("change", () => {
        updateHistoryTable();
        updateMonthlyPrintStatus();
    });

    // Daily print date select change in history tab
    if (printDailyDateSelect) {
        printDailyDateSelect.addEventListener("change", (e) => {
            checkDailyPrintDateStatus(e.target.value);
        });
    }

    // Daily print button in history tab
    if (printDailySelectedBtn) {
        printDailySelectedBtn.addEventListener("click", () => {
            const targetDate = printDailyDateSelect.value;
            if (targetDate) {
                triggerDailyPrintForDate(targetDate);
            }
        });
    }

    // Daily Word button in history tab
    if (wordDailySelectedBtn) {
        wordDailySelectedBtn.addEventListener("click", () => {
            const targetDate = printDailyDateSelect.value;
            if (targetDate) {
                exportDailyWord(targetDate);
            }
        });
    }

    // Lecturer role checkbox listener
    const isLecturerCheckbox = document.getElementById("profile-is-lecturer");
    if (isLecturerCheckbox) {
        isLecturerCheckbox.addEventListener("change", (e) => {
            state.profile.isLecturer = e.target.checked;
            localStorage.setItem("bdr_profile", JSON.stringify(state.profile));
            toggleTimetableSection(e.target.checked);
            loadActiveDateLog();
            showToast(e.target.checked ? "Mod Pensyarah diaktifkan!" : "Mod Pensyarah dinyahaktifkan!");
        });
    }

    // Save manual timetable button
    const saveManualTimetableBtn = document.getElementById("save-manual-timetable-btn");
    if (saveManualTimetableBtn) {
        saveManualTimetableBtn.addEventListener("click", () => {
            saveManualTimetable();
        });
    }

    // Restore default timetable listener
    const restoreDefaultTimetableBtn = document.getElementById("restore-default-timetable-btn");
    if (restoreDefaultTimetableBtn) {
        restoreDefaultTimetableBtn.addEventListener("click", () => {
            if (confirm("Adakah anda pasti untuk menetapkan semula jadual waktu kepada jadual lalai Mohd Azrulnizam?")) {
                state.timetable = JSON.parse(JSON.stringify(TIMETABLE));
                localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
                syncLogsWithActiveTimetable();
                loadActiveDateLog();
                renderManualGridInputs();
                showToast("Jadual waktu telah dikembalikan ke jadual asal!");
            }
        });
    }

    // Clear current timetable listener
    const clearCurrentTimetableBtn = document.getElementById("clear-current-timetable-btn");
    if (clearCurrentTimetableBtn) {
        clearCurrentTimetableBtn.addEventListener("click", () => {
            if (confirm("Adakah anda pasti untuk mengosongkan jadual waktu kuliah? Semua pengisian kelas automatik akan dibersihkan.")) {
                state.timetable = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
                localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
                syncLogsWithActiveTimetable();
                loadActiveDateLog();
                renderManualGridInputs();
                showToast("Jadual waktu dikosongkan! Sila masukkan jadual baru secara manual.");
            }
        });
    }

    // Reload timetable day listener
    const reloadTimetableDayBtn = document.getElementById("reload-timetable-day-btn");
    if (reloadTimetableDayBtn) {
        reloadTimetableDayBtn.addEventListener("click", () => {
            if (confirm("Adakah anda pasti untuk memuat semula jadual waktu? Ini akan menggantikan pengisian kelas hari ini dengan jadual aktif (catatan yang belum disimpan akan hilang).")) {
                if (state.logs[state.activeDate]) {
                    delete state.logs[state.activeDate];
                    localStorage.setItem("bdr_logs", JSON.stringify(state.logs));
                }
                loadActiveDateLog();
                showToast("Jadual waktu semasa berjaya dimuat semula ke dalam borang!");
            }
        });
    }

    // Export Data JSON
    document.getElementById("export-json-btn").addEventListener("click", () => {
        exportDataJSON();
    });

    // Import Data Trigger
    const fileInput = document.getElementById("import-file-input");
    document.getElementById("import-json-btn").addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const importedData = JSON.parse(evt.target.result);
                if (importedData.logs) {
                    state.logs = importedData.logs;
                    localStorage.setItem("bdr_logs", JSON.stringify(state.logs));
                }
                if (importedData.profile) {
                    state.profile = importedData.profile;
                    localStorage.setItem("bdr_profile", JSON.stringify(state.profile));
                }
                if (importedData.signature) {
                    state.signature = importedData.signature;
                    localStorage.setItem("bdr_signature", state.signature);
                }
                if (importedData.timetable) {
                    state.timetable = importedData.timetable;
                    localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
                }
                
                loadLocalStorageData();
                loadActiveDateLog();
                updateDashboardStats();
                updateHistoryTable();
                updateSignaturePreview();
                showToast("Data berjaya diimport!");
            } catch (err) {
                showToast("Ralat! Fail tidak sah.", "danger");
            }
        };
        reader.readAsText(file);
    });

    // Hourly Attachment Listeners
    const hoursList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    hoursList.forEach(hr => {
        const itemRow = document.querySelector(`.timeline-item[data-hour="${hr}"]`);
        if (!itemRow) return;

        const fileInput = itemRow.querySelector(".hour-attachment-input");
        const removeBtn = itemRow.querySelector(".remove-hour-attachment-btn");
        const preview = itemRow.querySelector(".hour-attachment-preview");

// Helper function to compress evidence images before storing/cloud syncing
function compressImageBase64(dataUrl, callback) {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
        return callback(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 600;

        if (width > height) {
            if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            }
        } else {
            if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6);
        callback(compressedDataUrl);
    };
    img.onerror = () => {
        callback(dataUrl);
    };
    img.src = dataUrl;
}

        if (fileInput) {
            fileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Max size: 2MB per attachment
                if (file.size > 2 * 1024 * 1024) {
                    showToast("Saiz fail terlalu besar! Had maksimum fail lampiran ialah 2MB.", "danger");
                    e.target.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = (evt) => {
                    const rawDataUrl = evt.target.result;
                    compressImageBase64(rawDataUrl, (compressedDataUrl) => {
                        state.tempHourAttachments[hr] = {
                            name: file.name,
                            type: file.type.startsWith("image") ? "image/jpeg" : file.type,
                            data: compressedDataUrl
                        };
                        if (preview) {
                            preview.innerText = file.name;
                            preview.title = file.name;
                        }
                        if (removeBtn) removeBtn.classList.remove("hidden");
                        
                        const label = hr < 12 ? `${hr}:00 AM` : (hr === 12 ? "12:00 PM" : `${hr-12}:00 PM`);
                        showToast(`Lampiran jam ${label} berjaya dimuat naik!`);
                    });
                };
                reader.readAsDataURL(file);
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener("click", () => {
                if (fileInput) fileInput.value = "";
                state.tempHourAttachments[hr] = null; // Mark explicitly as removed
                if (state.logs[state.activeDate] && state.logs[state.activeDate][hr]) {
                    delete state.logs[state.activeDate][hr].attachment;
                }
                if (preview) preview.innerText = "";
                removeBtn.classList.add("hidden");
                
                // Immediately save active date log to persist deletion to LocalStorage & Cloud
                saveActiveDateLog();
                
                const label = hr < 12 ? `${hr}:00 AM` : (hr === 12 ? "12:00 PM" : `${hr-12}:00 PM`);
                showToast(`Lampiran jam ${label} dibuang & diselaraskan.`);
            });
        }
    });
}

// Update Theme Toggle Icon
function updateThemeToggleIcon(theme) {
    const icon = themeToggle.querySelector("i");
    if (theme === "dark") {
        icon.className = "fa-solid fa-sun";
    } else {
        icon.className = "fa-solid fa-moon";
    }
}

// Tab Navigation logic
function setupTabNavigation() {
    const menuItems = document.querySelectorAll(".menu-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const breadcrumbCurrent = document.getElementById("breadcrumb-current");
    const currentTabTitle = document.getElementById("current-tab-title");

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            const tabId = item.getAttribute("data-tab");
            if (!tabId) return; // Lepaskan pautan luar (seperti manual.html)
            
            e.preventDefault();
            
            // Remove active classes
            menuItems.forEach(mi => mi.classList.remove("active"));
            tabContents.forEach(tc => tc.classList.remove("active"));

            // Add active classes
            item.classList.add("active");
            document.getElementById(`tab-${tabId}`).classList.add("active");

            // Update Breadcrumb & Header
            let tabLabel = "Dashboard";
            if (tabId === "history") tabLabel = "Rekod & Cetakan";
            if (tabId === "settings") tabLabel = "Tetapan & T/Tangan";
            
            breadcrumbCurrent.innerText = tabLabel;
            currentTabTitle.innerText = tabLabel + " Utama";

            // If history tab clicked, refresh history and print/Word button states
            if (tabId === "history") {
                updateHistoryTable();
                if (printDailyDateSelect) {
                    if (!state.logs[printDailyDateSelect.value]) {
                        const logKeys = Object.keys(state.logs || {}).sort((a, b) => new Date(b) - new Date(a));
                        if (logKeys.length > 0) printDailyDateSelect.value = logKeys[0];
                    }
                    checkDailyPrintDateStatus(printDailyDateSelect.value);
                }
                updateMonthlyPrintStatus();
            }
        });
    });
}

// Setup Signature Pad
function setupSignaturePad() {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Account for canvas actual internal resolution vs layout client width/height
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const coords = getCoordinates(e);
        lastX = coords.x;
        lastY = coords.y;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        
        lastX = coords.x;
        lastY = coords.y;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    // Mouse Events
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Touch Events for Mobile/Tablets
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);

    // Clear Signature
    clearSigBtn.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Save Signature
    saveSigBtn.addEventListener("click", () => {
        // Check if canvas is empty
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        
        if (canvas.toDataURL() === blank.toDataURL()) {
            showToast("Sila lukis tandatangan sebelum menyimpan.", "warning");
            return;
        }

        const dataURL = canvas.toDataURL();
        state.signature = dataURL;
        localStorage.setItem("bdr_signature", dataURL);
        
        updateSignaturePreview();
        showToast("Tandatangan digital berjaya disimpan!");
    });
}

function updateSignaturePreview() {
    if (state.signature) {
        signaturePreviewImg.src = state.signature;
        signaturePreviewImg.classList.remove("hidden");
        noSignatureText.classList.add("hidden");
    } else {
        signaturePreviewImg.src = "";
        signaturePreviewImg.classList.add("hidden");
        noSignatureText.classList.remove("hidden");
    }
}

// Load Log for Active Date
function loadActiveDateLog() {
    const selectedDate = new Date(state.activeDate);
    const dayOfWeek = selectedDate.getDay(); // 0 = Ahad, 1 = Isnin, 2 = Selasa, ...
    
    // Display active date label
    const dayName = DAY_NAMES[dayOfWeek] || "";
    const dateFormatted = `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    activeLogDateLabel.innerText = `${dayName}, ${dateFormatted}`;

    // WFH Tuesday/Thursday Warning (Official days are Tuesday (2) & Thursday (4))
    if (dayOfWeek === 2 || dayOfWeek === 4) {
        wfhDayWarning.classList.add("hidden");
    } else {
        wfhDayWarning.classList.remove("hidden");
    }

    // Render Timetable status helper widget
    renderTimetableWidget(dayOfWeek);

    // Reset log form fields
    const form = document.getElementById("daily-log-form");
    form.reset();

    // Check if log exists in state
    const savedLog = state.logs[state.activeDate];

    // Initialize temporary hourly attachments
    state.tempHourAttachments = {};
    
    // Setup inputs for hours 8 to 17 (8:00 AM - 6:00 PM)
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    hours.forEach(hr => {
        const itemRow = document.querySelector(`.timeline-item[data-hour="${hr}"]`);
        const dropdown = itemRow.querySelector(".task-dropdown");
        const textarea = itemRow.querySelector(".task-desc");
        
        // Reset hourly attachment preview and file input
        const preview = itemRow.querySelector(".hour-attachment-preview");
        const removeBtn = itemRow.querySelector(".remove-hour-attachment-btn");
        const fileInput = itemRow.querySelector(".hour-attachment-input");
        if (fileInput) fileInput.value = "";
        if (preview) preview.innerText = "";
        if (removeBtn) removeBtn.classList.add("hidden");

        // Remove active class styling
        itemRow.className = "timeline-item";

        // Remove any old class badge indicator
        const oldIndicator = itemRow.querySelector(".class-info-indicator");
        if (oldIndicator) oldIndicator.remove();

        const customInput = itemRow.querySelector(".custom-task-input");
        customInput.classList.add("hidden");
        customInput.value = "";

        const defaultTasks = ["Urusan Kerja ICT", "Urusan Penyediaan PdP", "Pembangunan Inovasi", "Pelaksanaan Kelas"];

        const isLecturer = state.profile.isLecturer;

        // 1. If saved log exists
        if (savedLog && savedLog[hr]) {
            const savedTask = savedLog[hr].task;
            textarea.value = savedLog[hr].desc;
            
            // Populate attachment if saved
            if (savedLog[hr].attachment) {
                state.tempHourAttachments[hr] = savedLog[hr].attachment;
                if (preview) {
                    preview.innerText = savedLog[hr].attachment.name;
                    preview.title = savedLog[hr].attachment.name;
                }
                if (removeBtn) removeBtn.classList.remove("hidden");
            }
            
            if (defaultTasks.includes(savedTask)) {
                dropdown.value = savedTask;
            } else {
                dropdown.value = "Lain-lain";
                customInput.classList.remove("hidden");
                customInput.value = savedTask === "Lain-lain" ? "" : savedTask;
            }
            
            if (savedTask === "Pelaksanaan Kelas") {
                itemRow.classList.add("active-class");
                
                // Add helper class name if it is class WFH day (and user is lecturer)
                if (isLecturer) {
                    const timetableDay = state.timetable[dayOfWeek];
                    if (timetableDay && timetableDay[hr]) {
                        insertClassIndicator(itemRow, timetableDay[hr].info);
                    }
                }
            } else {
                itemRow.classList.add("active-task");
            }
        } 
        // 2. Pre-populate classes for official days if no saved log exists
        else {
            const timetableDay = isLecturer ? state.timetable[dayOfWeek] : null;
            if (timetableDay && timetableDay[hr]) {
                dropdown.value = timetableDay[hr].task;
                textarea.value = `Kelas: ${timetableDay[hr].info}\nCatatan Pengajaran: `;
                itemRow.classList.add("active-class");
                insertClassIndicator(itemRow, timetableDay[hr].info);
            } else {
                // If it's WFH lunch hour, default to Lain-lain (Rehat)
                if ((dayOfWeek === 2 && hr === 13) || (dayOfWeek === 4 && hr === 14)) {
                    dropdown.value = "Lain-lain";
                    textarea.value = "Makan tengah hari / Rehat";
                    customInput.classList.remove("hidden");
                    customInput.value = "Rehat / Makan Tengah Hari";
                } else {
                    dropdown.value = "Urusan Kerja ICT";
                    textarea.value = "";
                }
                itemRow.classList.add("active-task");
            }
        }

        // Add dropdown change listener to dynamically style timeline indicator
        dropdown.onchange = (e) => {
            itemRow.className = "timeline-item";
            if (e.target.value === "Pelaksanaan Kelas") {
                itemRow.classList.add("active-class");
            } else {
                itemRow.classList.add("active-task");
            }

            if (e.target.value === "Lain-lain") {
                customInput.classList.remove("hidden");
                customInput.focus();
            } else {
                customInput.classList.add("hidden");
                customInput.value = "";
            }
        };
    });

    // Check if daily print can be enabled
    if (savedLog) {
        printDailyBtn.removeAttribute("disabled");
        if (wordDailyBtn) wordDailyBtn.removeAttribute("disabled");
    } else {
        printDailyBtn.setAttribute("disabled", "true");
        if (wordDailyBtn) wordDailyBtn.setAttribute("disabled", "true");
    }
}

function insertClassIndicator(rowElement, classInfo) {
    const contentDiv = rowElement.querySelector(".timeline-content");
    const indicator = document.createElement("div");
    indicator.className = "class-info-indicator";
    indicator.innerHTML = `<span><i class="fa-solid fa-chalkboard-user"></i> Jadual Rasmi: ${classInfo}</span> <span class="class-badge">Automatik</span>`;
    contentDiv.insertBefore(indicator, contentDiv.firstChild);
}

// Render Timetable Helper Widget
function renderTimetableWidget(dayOfWeek) {
    if (!state.profile.isLecturer) {
        timetableStatusBody.innerHTML = `
            <div class="text-center placeholder-text">
                <i class="fa-solid fa-user-gear" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
                Mod Pentadbiran Aktif. Tiada pengisian jadual waktu kuliah automatik dijalankan.
            </div>
        `;
        return;
    }

    const timetableDay = state.timetable[dayOfWeek];
    
    if (!timetableDay) {
        timetableStatusBody.innerHTML = `
            <div class="text-center placeholder-text">
                <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem; display: block;"></i>
                Tiada kuliah rasmi dijadualkan bagi hari ${DAY_NAMES[dayOfWeek] || "ini"}.
            </div>
        `;
        return;
    }

    let html = '<div class="class-widget-list">';
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    hours.forEach(hr => {
        if (timetableDay[hr]) {
            let timeStr = formatHourRange(hr);
            html += `
                <div class="class-widget-item">
                    <span class="class-time-tag">${timeStr}</span>
                    <div class="class-details-tag">
                        <h4>${timetableDay[hr].info.split(" [")[0]}</h4>
                        <p>${timetableDay[hr].info.substring(timetableDay[hr].info.indexOf("["))}</p>
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    timetableStatusBody.innerHTML = html;
}

function formatHourRange(hr) {
    let startStr = hr < 12 ? `${hr}:00 AM` : (hr === 12 ? "12:00 PM" : `${hr - 12}:00 PM`);
    let nextHr = hr + 1;
    let endStr = nextHr < 12 ? `${nextHr}:00 AM` : (nextHr === 12 ? "12:00 PM" : `${nextHr - 12}:00 PM`);
    return `${startStr} - ${endStr}`;
}

// Save Log Harian
function saveActiveDateLog() {
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const dailyData = {};

    hours.forEach(hr => {
        const itemRow = document.querySelector(`.timeline-item[data-hour="${hr}"]`);
        const dropdown = itemRow.querySelector(".task-dropdown");
        const textarea = itemRow.querySelector(".task-desc");
        const customInput = itemRow.querySelector(".custom-task-input");
        
        let taskName = dropdown.value;
        if (taskName === "Lain-lain" && customInput) {
            const customVal = customInput.value.trim();
            taskName = customVal ? customVal : "Lain-lain";
        }
        
        dailyData[hr] = {
            task: taskName,
            desc: textarea.value.trim()
        };

        if (state.tempHourAttachments[hr] !== undefined) {
            if (state.tempHourAttachments[hr] !== null) {
                dailyData[hr].attachment = state.tempHourAttachments[hr];
            }
        } else if (state.logs[state.activeDate] && state.logs[state.activeDate][hr] && state.logs[state.activeDate][hr].attachment) {
            dailyData[hr].attachment = state.logs[state.activeDate][hr].attachment;
        }
    });

    state.logs[state.activeDate] = dailyData;
    localStorage.setItem("bdr_logs", JSON.stringify(state.logs));
    if (typeof saveUserDataToCloud === 'function') saveUserDataToCloud(true);
    
    printDailyBtn.removeAttribute("disabled");
    if (wordDailyBtn) wordDailyBtn.removeAttribute("disabled");
    updateDashboardStats();
    updateHistoryTable();
    if (printDailyDateSelect) {
        printDailyDateSelect.value = state.activeDate;
        checkDailyPrintDateStatus(printDailyDateSelect.value);
    }
    updateMonthlyPrintStatus();
    showToast("Log harian berjaya disimpan!");
}

// Update Stats Cards
function updateDashboardStats() {
    const logKeys = Object.keys(state.logs);
    totalDaysCount.innerText = logKeys.length;
    
    // Total hours: each logged day represents 10 hours (8:00 AM - 6:00 PM)
    totalHoursCount.innerText = logKeys.length * 10;
}

// Render Quick Month Filter Pills
function renderRecordedMonthsBar() {
    const pillsContainer = document.getElementById("recorded-months-pills");
    if (!pillsContainer) return;
    pillsContainer.innerHTML = "";

    const logKeys = Object.keys(state.logs || {});
    if (logKeys.length === 0) {
        pillsContainer.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-secondary);">Tiada sebarang rekod tersimpan di dalam akaun ini lagi.</span>`;
        return;
    }

    // Group dates by YYYY-MM
    const monthCounts = {};
    logKeys.forEach(dateStr => {
        const monthKey = dateStr.slice(0, 7); // "YYYY-MM"
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    const sortedMonthKeys = Object.keys(monthCounts).sort((a, b) => b.localeCompare(a));
    const activeValue = filterMonthInput ? filterMonthInput.value : "all";

    // 1. "Semua Rekod" Pill
    const allPill = document.createElement("button");
    allPill.type = "button";
    allPill.className = `btn btn-sm ${activeValue === 'all' ? 'btn-primary' : 'btn-secondary'}`;
    allPill.style.fontSize = "0.75rem";
    allPill.style.padding = "0.25rem 0.6rem";
    allPill.style.borderRadius = "15px";
    allPill.innerHTML = `<i class="fa-solid fa-folder"></i> Semua Rekod (${logKeys.length} Hari)`;
    allPill.addEventListener("click", () => {
        if (filterMonthInput) filterMonthInput.value = "all";
        updateHistoryTable();
        updateMonthlyPrintStatus();
    });
    pillsContainer.appendChild(allPill);

    // 2. Individual Month Pills
    sortedMonthKeys.forEach(mKey => {
        const [y, m] = mKey.split("-");
        const monthLabel = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
        const count = monthCounts[mKey];

        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = `btn btn-sm ${activeValue === mKey ? 'btn-primary' : 'btn-secondary'}`;
        pill.style.fontSize = "0.75rem";
        pill.style.padding = "0.25rem 0.6rem";
        pill.style.borderRadius = "15px";
        pill.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ${monthLabel} (${count} Hari)`;
        pill.addEventListener("click", () => {
            if (filterMonthInput) filterMonthInput.value = mKey;
            updateHistoryTable();
            updateMonthlyPrintStatus();
        });
        pillsContainer.appendChild(pill);
    });
}

// Auto select month with available logs if current month is empty
function selectBestDefaultMonth() {
    if (!filterMonthInput) return;
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const logKeys = Object.keys(state.logs || {});
    if (logKeys.length === 0) {
        filterMonthInput.value = currentMonthKey;
        return;
    }

    // Auto-select latest logged date in daily print selector if current selection has no record
    if (printDailyDateSelect && !state.logs[printDailyDateSelect.value]) {
        const sortedDates = [...logKeys].sort((a, b) => new Date(b) - new Date(a));
        if (sortedDates.length > 0) {
            printDailyDateSelect.value = sortedDates[0];
        }
    }

    // If current month has logs, keep it. Otherwise default to most recent recorded month!
    const currentMonthLogs = logKeys.filter(k => k.startsWith(currentMonthKey));
    if (currentMonthLogs.length > 0) {
        filterMonthInput.value = currentMonthKey;
    } else {
        const sortedMonths = Array.from(new Set(logKeys.map(k => k.slice(0, 7)))).sort((a, b) => b.localeCompare(a));
        filterMonthInput.value = sortedMonths[0] || currentMonthKey;
    }
}

// Populate and Update History Table
function updateHistoryTable() {
    renderRecordedMonthsBar();

    let filterMonth = filterMonthInput ? filterMonthInput.value : "all";
    historyTableBody.innerHTML = "";

    const logKeys = Object.keys(state.logs || {});
    if (logKeys.length === 0) {
        historyTableBody.innerHTML = `<tr><td colspan="5" class="text-center placeholder-text">Tiada rekod BDR tersimpan di dalam akaun ini lagi.</td></tr>`;
        return;
    }

    let filteredKeys = [];
    if (!filterMonth || filterMonth === "all") {
        filteredKeys = logKeys.sort((a, b) => new Date(b) - new Date(a));
    } else {
        filteredKeys = logKeys
            .filter(key => key.startsWith(filterMonth))
            .sort((a, b) => new Date(b) - new Date(a));
    }

    if (filteredKeys.length === 0) {
        const parts = filterMonth.split("-");
        const monthName = parts.length === 2 ? `${MONTH_NAMES[parseInt(parts[1]) - 1]} ${parts[0]}` : filterMonth;
        
        const existingMonths = Array.from(new Set(logKeys.map(k => k.slice(0, 7))))
            .map(mKey => {
                const [y, m] = mKey.split("-");
                return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
            }).join(", ");

        historyTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="padding: 1.5rem;">
                    <div style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                        <i class="fa-solid fa-folder-open" style="font-size: 2rem; color: var(--primary-color);"></i>
                    </div>
                    <h4 style="margin-bottom: 0.25rem;">Tiada rekod bagi bulan ${monthName} lagi.</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">
                        Data anda pada bulan lain (${existingMonths}) selamat tersimpan. Klik butang bulan di atas atau pilih "Semua Rekod" untuk menyemak & mencetak.
                    </p>
                </td>
            </tr>
        `;
        return;
    }

    filteredKeys.forEach((key, index) => {
        const logDate = new Date(key);
        const dayOfWeek = logDate.getDay();
        const dateFormatted = `${logDate.getDate()} ${MONTH_NAMES[logDate.getMonth()]} ${logDate.getFullYear()}`;
        
        const dailyLogs = state.logs[key];
        const categories = [];
        for (let hr in dailyLogs) {
            if (dailyLogs[hr] && dailyLogs[hr].task && !categories.includes(dailyLogs[hr].task)) {
                categories.push(dailyLogs[hr].task);
            }
        }
        const categoriesStr = categories.join(", ");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${dateFormatted}</strong></td>
            <td>${DAY_NAMES[dayOfWeek]}</td>
            <td><span class="help-text">${categoriesStr || 'Tiada catatan'}</span></td>
            <td>
                <button class="btn btn-secondary btn-icon" onclick="editLoggedDate('${key}')" title="Edit Log"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn btn-secondary btn-icon" onclick="triggerDailyPrintForDate('${key}')" title="Cetak Hari Ini"><i class="fa-solid fa-print"></i></button>
                <button class="btn btn-secondary btn-icon" style="color: #2563eb; border-color: #2563eb;" onclick="triggerDailyWordForDate('${key}')" title="Muat Turun Word (.doc)"><i class="fa-solid fa-file-word"></i></button>
                <button class="btn btn-danger btn-icon" onclick="deleteLoggedDate('${key}')" title="Padam Log"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        historyTableBody.appendChild(tr);
    });
}

// Global functions linked in table actions
window.editLoggedDate = (dateKey) => {
    logDateInput.value = dateKey;
    state.activeDate = dateKey;
    loadActiveDateLog();
    
    // Switch to dashboard tab
    document.querySelector('.menu-item[data-tab="dashboard"]').click();
};

window.triggerDailyPrintForDate = (dateKey) => {
    // Temporarily change active date to populate printing
    const previousActive = state.activeDate;
    state.activeDate = dateKey;
    triggerDailyPrint();
    state.activeDate = previousActive;
};

window.triggerDailyWordForDate = (dateKey) => {
    exportDailyWord(dateKey);
};

window.deleteLoggedDate = (dateKey) => {
    if (confirm(`Adakah anda pasti untuk memadam log bertarikh ${dateKey}?`)) {
        delete state.logs[dateKey];
        localStorage.setItem("bdr_logs", JSON.stringify(state.logs));
        updateDashboardStats();
        updateHistoryTable();
        loadActiveDateLog();
        if (printDailyDateSelect) checkDailyPrintDateStatus(printDailyDateSelect.value);
        updateMonthlyPrintStatus();
        showToast("Log berjaya dipadam.", "warning");
    }
};

// Daily Report Printing Logic
function triggerDailyPrint() {
    const savedLog = state.logs[state.activeDate];
    if (!savedLog) {
        showToast("Tiada rekod disimpan bagi tarikh ini untuk dicetak.", "warning");
        return;
    }

    const logDate = new Date(state.activeDate);
    const dayOfWeek = logDate.getDay();
    const dateStrFormatted = `${logDate.getDate()} ${MONTH_NAMES[logDate.getMonth()]} ${logDate.getFullYear()}`;

    // Fill daily template fields
    document.getElementById("print-daily-inst").innerText = state.profile.institution.toUpperCase();
    document.getElementById("print-daily-name").innerText = state.profile.name.toUpperCase();
    document.getElementById("print-daily-desig").innerText = state.profile.designation;
    document.getElementById("print-daily-day").innerText = DAY_NAMES[dayOfWeek];
    document.getElementById("print-daily-date").innerText = dateStrFormatted;
    document.getElementById("print-daily-dept").innerText = state.profile.department;

    // Fill Signatures labels
    document.getElementById("print-daily-user-name-label").innerText = state.profile.name.toUpperCase();
    document.getElementById("print-daily-user-desig-label").innerText = state.profile.designation;
    document.getElementById("print-daily-user-date-label").innerText = `Tarikh: ${dateStrFormatted}`;
    
    document.getElementById("print-daily-hod-name-label").innerText = state.profile.hodName.toUpperCase();
    document.getElementById("print-daily-hod-desig-label").innerText = state.profile.hodDesignation;

    // Signature image insertion
    const sigImg = document.getElementById("print-daily-user-sig");
    if (state.signature) {
        sigImg.src = state.signature;
        sigImg.style.display = "block";
    } else {
        sigImg.src = "";
        sigImg.style.display = "none";
    }

    // Populate activities table
    const tableBody = document.getElementById("print-daily-activities-body");
    tableBody.innerHTML = "";

    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    hours.forEach((hr, index) => {
        const timeRangeStr = formatHourRange(hr);
        const taskName = savedLog[hr] ? savedLog[hr].task : "";
        const taskDesc = savedLog[hr] ? savedLog[hr].desc : "";
        const taskAttachment = (savedLog[hr] && savedLog[hr].attachment) ? savedLog[hr].attachment : null;

        // Format description text nicely for printing (handle carriage returns)
        let formattedDesc = taskDesc.replace(/\n/g, "<br>");

        if (taskAttachment) {
            if (taskAttachment.type.startsWith("image/")) {
                formattedDesc += `
                    <div style="margin-top: 0.5rem; text-align: left; page-break-inside: avoid;">
                        <img src="${taskAttachment.data}" style="max-height: 100px; max-width: 100%; border: 1px solid #ccc; border-radius: 4px; padding: 2px;">
                    </div>
                `;
            } else if (taskAttachment.type.startsWith("video/")) {
                formattedDesc += `
                    <div style="margin-top: 0.5rem; text-align: left; font-size: 0.75rem; color: #475569; display: flex; align-items: center; gap: 0.25rem; page-break-inside: avoid;">
                        <i class="fa-solid fa-file-video"></i>
                        <span>Bukti Video: ${taskAttachment.name}</span>
                    </div>
                `;
            }
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center; white-space: nowrap;">${timeRangeStr}</td>
            <td style="font-weight: 500;">${taskName}</td>
            <td>${formattedDesc}</td>
        `;
        tableBody.appendChild(tr);
    });

    const printAttachmentSec = document.getElementById("print-daily-attachment-section");
    if (printAttachmentSec) printAttachmentSec.classList.add("hidden");

    // Set print mode body class to prevent double-printing
    document.body.classList.add("print-mode-daily");
    document.body.classList.remove("print-mode-monthly");

    if (typeof executeSystemPrint === 'function') {
        executeSystemPrint("print-daily-report", "Laporan_Harian_BDR_" + state.activeDate);
    } else {
        window.print();
    }

    // Clean up after print window closes
    setTimeout(() => {
        document.body.classList.remove("print-mode-daily");
    }, 1000);
}

// Monthly Consolidated Report Printing
function triggerMonthlyPrint() {
    const filterMonth = filterMonthInput.value; // YYYY-MM
    if (!filterMonth) {
        showToast("Sila pilih bulan dan tahun di bahagian sejarah.", "warning");
        return;
    }

    const filteredKeys = Object.keys(state.logs)
        .filter(key => key.startsWith(filterMonth))
        .sort((a, b) => new Date(a) - new Date(b));

    if (filteredKeys.length === 0) {
        showToast("Tiada rekod log ditemui bagi bulan yang dipilih.", "warning");
        return;
    }

    const monthParts = filterMonth.split("-");
    const monthName = MONTH_NAMES[parseInt(monthParts[1]) - 1];
    const yearStr = monthParts[0];
    const monthlyPeriodStr = `${monthName} ${yearStr}`;

    // 1. Populate Monthly Summary Page
    document.getElementById("print-monthly-inst").innerText = state.profile.institution.toUpperCase();
    document.getElementById("print-monthly-name").innerText = state.profile.name.toUpperCase();
    document.getElementById("print-monthly-desig").innerText = state.profile.designation;
    document.getElementById("print-monthly-dept").innerText = state.profile.department;
    document.getElementById("print-monthly-period").innerText = monthlyPeriodStr;

    // Monthly sign
    document.getElementById("print-monthly-user-name-label").innerText = state.profile.name.toUpperCase();
    document.getElementById("print-monthly-user-desig-label").innerText = state.profile.designation;
    document.getElementById("print-monthly-user-date-label").innerText = `Tarikh: 30 ${monthName} ${yearStr}`; // Last day of month representation
    document.getElementById("print-monthly-hod-name-label").innerText = state.profile.hodName.toUpperCase();
    document.getElementById("print-monthly-hod-desig-label").innerText = state.profile.hodDesignation;

    const monthlySigImg = document.getElementById("print-monthly-user-sig");
    if (state.signature) {
        monthlySigImg.src = state.signature;
        monthlySigImg.style.display = "block";
    } else {
        monthlySigImg.src = "";
        monthlySigImg.style.display = "none";
    }

    const summaryTableBody = document.getElementById("print-monthly-summary-body");
    summaryTableBody.innerHTML = "";

    // 2. Populate Detailed Daily sheets inside monthly pages container
    const detailedLogsContainer = document.getElementById("print-monthly-detailed-logs-container");
    detailedLogsContainer.innerHTML = "";

    filteredKeys.forEach((key, index) => {
        const logDate = new Date(key);
        const dayOfWeek = logDate.getDay();
        const dateStrFormatted = `${logDate.getDate()} ${MONTH_NAMES[logDate.getMonth()]} ${logDate.getFullYear()}`;
        const dailyLog = state.logs[key];

        // Gather categories for summary sheet
        const catMap = {};
        for (let hr in dailyLog) {
            let c = dailyLog[hr].task;
            catMap[c] = (catMap[c] || 0) + 1;
        }
        const summaryTextParts = [];
        for (let cat in catMap) {
            summaryTextParts.push(`${cat} (${catMap[cat]} Jam)`);
        }
        const summaryText = summaryTextParts.join(", ");

        // Append to summary sheet table
        const trSummary = document.createElement("tr");
        trSummary.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;"><strong>${dateStrFormatted}</strong></td>
            <td style="text-align: center;">${DAY_NAMES[dayOfWeek]}</td>
            <td style="text-align: center;">${Object.keys(dailyLog).length} Jam</td>
            <td>${summaryText}</td>
        `;
        summaryTableBody.appendChild(trSummary);

        // Create Detailed Sheet with page-break-before
        const dailySheetDiv = document.createElement("div");
        dailySheetDiv.className = "page-break";
        dailySheetDiv.style.marginTop = "30px";
        
        let activitiesRows = "";
        const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        hours.forEach((hr, hrIndex) => {
            const timeRangeStr = formatHourRange(hr);
            const taskName = dailyLog[hr] ? dailyLog[hr].task : "";
            const taskDesc = dailyLog[hr] ? dailyLog[hr].desc : "";
            const taskAttachment = (dailyLog[hr] && dailyLog[hr].attachment) ? dailyLog[hr].attachment : null;
            let formattedDesc = taskDesc.replace(/\n/g, "<br>");

            if (taskAttachment) {
                if (taskAttachment.type.startsWith("image/")) {
                    formattedDesc += `
                        <div style="margin-top: 0.5rem; text-align: left; page-break-inside: avoid;">
                            <img src="${taskAttachment.data}" style="max-height: 100px; max-width: 100%; border: 1px solid #ccc; border-radius: 4px; padding: 2px;">
                        </div>
                    `;
                } else if (taskAttachment.type.startsWith("video/")) {
                    formattedDesc += `
                        <div style="margin-top: 0.5rem; text-align: left; font-size: 0.75rem; color: #475569; display: flex; align-items: center; gap: 0.25rem; page-break-inside: avoid;">
                            <i class="fa-solid fa-file-video"></i>
                            <span>Bukti Video: ${taskAttachment.name}</span>
                        </div>
                    `;
                }
            }

            activitiesRows += `
                <tr>
                    <td style="text-align: center;">${hrIndex + 1}</td>
                    <td style="text-align: center; white-space: nowrap;">${timeRangeStr}</td>
                    <td style="font-weight: 500;">${taskName}</td>
                    <td>${formattedDesc}</td>
                </tr>
            `;
        });

        const sigImageHTML = state.signature ? `<img class="sig-img" src="${state.signature}" alt="Tandatangan Pegawai">` : '';

        dailySheetDiv.innerHTML = `
            <div class="print-header" style="margin-top: 40px;">
                <img src="logo.jpg" alt="Logo Politeknik Malaysia" class="print-logo">
                <h2 class="print-title">LAPORAN AKTIVITI BEKERJA DARI RUMAH (BDR) - PERINCIAN HARIAN</h2>
                <h3 class="print-subtitle">${state.profile.institution.toUpperCase()}</h3>
            </div>

            <table class="info-table">
                <tr>
                    <td class="info-label">NAMA PEGAWAI</td>
                    <td class="info-val">: ${state.profile.name.toUpperCase()}</td>
                    <td class="info-label">HARI / TARIKH</td>
                    <td class="info-val">: ${DAY_NAMES[dayOfWeek].toUpperCase()} (${dateStrFormatted})</td>
                </tr>
                <tr>
                    <td class="info-label">JAWATAN / GRED</td>
                    <td class="info-val">: ${state.profile.designation}</td>
                    <td class="info-label">WAKTU BEKERJA BDR</td>
                    <td class="info-val">: 8:00 AM - 6:00 PM (10 Jam)</td>
                </tr>
            </table>

            <h4 class="table-section-title">PERINCIAN AKTIVITI HARIAN</h4>
            <table class="activities-print-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">Bil</th>
                        <th style="width: 20%;">Waktu</th>
                        <th style="width: 25%;">Kategori Aktiviti</th>
                        <th style="width: 50%;">Perincian Tugasan / Catatan Pengajaran</th>
                    </tr>
                </thead>
                <tbody>
                    ${activitiesRows}
                </tbody>
            </table>

            <div class="print-signatures-row">
                <div class="sig-col">
                    <p class="sig-title">Disediakan oleh:</p>
                    <div class="sig-space">
                        ${sigImageHTML}
                    </div>
                    <p class="sig-line">............................................................</p>
                    <p class="sig-name">${state.profile.name.toUpperCase()}</p>
                    <p class="sig-designation">${state.profile.designation}</p>
                    <p class="sig-date">Tarikh: ${dateStrFormatted}</p>
                </div>
                <div class="sig-col align-right">
                    <p class="sig-title">Disahkan oleh:</p>
                    <div class="sig-space">
                        <!-- Space for verification signature -->
                    </div>
                    <p class="sig-line">............................................................</p>
                    <p class="sig-name">${state.profile.hodName.toUpperCase()}</p>
                    <p class="sig-designation">${state.profile.hodDesignation}</p>
                    <p class="sig-date">Tarikh: .......................................</p>
                </div>
            </div>
        `;
        detailedLogsContainer.appendChild(dailySheetDiv);
    });

    // Set print mode body class to prevent double-printing
    document.body.classList.add("print-mode-monthly");
    document.body.classList.remove("print-mode-daily");

    if (typeof executeSystemPrint === 'function') {
        executeSystemPrint("print-monthly-report", "Laporan_Bulanan_BDR_" + filterMonth);
    } else {
        window.print();
    }

    // Clean up after print window closes
    setTimeout(() => {
        document.body.classList.remove("print-mode-monthly");
    }, 1000);
}

// Helper function to execute print safely across Browsers, Mobile Devices, and Android WebViews (APK)
function executeSystemPrint(elementId, filename) {
    const isMobileOrAPK = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const element = elementId ? document.getElementById(elementId) : null;

    if (isMobileOrAPK && typeof html2pdf !== 'undefined' && element) {
        showToast("📄 Menjana fail PDF Laporan...", "info");

        // Save original styles
        const origDisplay = element.style.display;
        const origPos = element.style.position;
        const origZIndex = element.style.zIndex;
        const origBg = element.style.backgroundColor;

        // Temporarily reveal element for html2canvas capture
        element.style.display = "block";
        element.style.position = "fixed";
        element.style.top = "0";
        element.style.left = "0";
        element.style.width = "100%";
        element.style.zIndex = "99999";
        element.style.backgroundColor = "#ffffff";

        const opt = {
            margin:       [5, 5, 5, 5],
            filename:     (filename || 'Laporan_BDR') + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = origDisplay;
            element.style.position = origPos;
            element.style.zIndex = origZIndex;
            element.style.backgroundColor = origBg;
            showToast("✅ Fail PDF Laporan berjaya dimuat turun!");
        }).catch(err => {
            console.error("html2pdf error:", err);
            element.style.display = origDisplay;
            element.style.position = origPos;
            element.style.zIndex = origZIndex;
            element.style.backgroundColor = origBg;
            window.print();
        });
    } else {
        try {
            if (window.AndroidPrint && typeof window.AndroidPrint.printPage === 'function') {
                window.AndroidPrint.printPage();
            } else {
                window.print();
            }
        } catch (err) {
            console.error("Print execution error:", err);
            window.print();
        }
    }
}

// JSON Export functionality
function exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    
    const formattedDate = new Date().toISOString().slice(0,10);
    downloadAnchor.setAttribute("download", `bdr_system_backup_${formattedDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Data log berjaya dieksport!");
}

// Custom Toast Notification System
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");
    
    toastMessage.innerHTML = message;
    
    // Style by type
    if (type === "success") {
        toast.style.borderLeftColor = "var(--success-color)";
    } else if (type === "warning") {
        toast.style.borderLeftColor = "var(--warning-color)";
    } else if (type === "danger") {
        toast.style.borderLeftColor = "var(--danger-color)";
    }

    toast.classList.remove("hidden");
    
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

// Check Daily Log print status in history tab
function checkDailyPrintDateStatus(dateStr) {
    if (state.logs[dateStr]) {
        printDailyStatusBox.classList.remove("hidden");
        printDailyStatusError.classList.add("hidden");
        printDailySelectedBtn.removeAttribute("disabled");
        if (wordDailySelectedBtn) wordDailySelectedBtn.removeAttribute("disabled");
    } else {
        printDailyStatusBox.classList.add("hidden");
        printDailyStatusError.classList.remove("hidden");
        printDailySelectedBtn.setAttribute("disabled", "true");
        if (wordDailySelectedBtn) wordDailySelectedBtn.setAttribute("disabled", "true");
    }
}

// Update Monthly print status and stats in history tab
function updateMonthlyPrintStatus() {
    const filterMonth = filterMonthInput.value;
    const allKeys = Object.keys(state.logs || {});
    if (!filterMonth || filterMonth === "all") {
        const count = allKeys.length;
        printMonthlyStatusText.innerText = `${count} hari BDR direkodkan secara keseluruhan.`;
        if (count > 0) {
            printMonthlyStatusBox.classList.remove("hidden");
            printMonthlyBtn.removeAttribute("disabled");
            if (wordMonthlyBtn) wordMonthlyBtn.removeAttribute("disabled");
        } else {
            printMonthlyStatusBox.classList.add("hidden");
            printMonthlyBtn.setAttribute("disabled", "true");
            if (wordMonthlyBtn) wordMonthlyBtn.setAttribute("disabled", "true");
        }
        return;
    }
    const filteredKeys = allKeys.filter(key => key.startsWith(filterMonth));
    const count = filteredKeys.length;
    
    printMonthlyStatusText.innerText = `${count} hari BDR direkodkan pada bulan ini.`;
    
    if (count > 0) {
        printMonthlyStatusBox.classList.remove("hidden");
        printMonthlyBtn.removeAttribute("disabled");
        if (wordMonthlyBtn) wordMonthlyBtn.removeAttribute("disabled");
    } else {
        printMonthlyStatusBox.classList.add("hidden");
        printMonthlyBtn.setAttribute("disabled", "true");
        if (wordMonthlyBtn) wordMonthlyBtn.setAttribute("disabled", "true");
    }
}

// ==========================================
// MICROSOFT WORD (.DOC) EXPORT FUNCTIONALITY
// ==========================================
let cachedLogoBase64 = null;

function getLogoBase64() {
    return new Promise((resolve) => {
        if (cachedLogoBase64) return resolve(cachedLogoBase64);
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                const c = document.createElement("canvas");
                c.width = img.naturalWidth || 200;
                c.height = img.naturalHeight || 80;
                const context = c.getContext("2d");
                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, c.width, c.height);
                context.drawImage(img, 0, 0);
                cachedLogoBase64 = c.toDataURL("image/jpeg", 0.95);
                resolve(cachedLogoBase64);
            } catch (err) {
                resolve("");
            }
        };
        img.onerror = () => resolve("");
        img.src = "logo.jpg";
    });
}

function buildWordDailySheetHTML(dateStr, logoBase64, isSubPage = false) {
    const savedLog = state.logs[dateStr];
    if (!savedLog) return "";

    const logDate = new Date(dateStr);
    const dayOfWeek = logDate.getDay();
    const dateStrFormatted = `${logDate.getDate()} ${MONTH_NAMES[logDate.getMonth()]} ${logDate.getFullYear()}`;
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

    let rowsHTML = "";
    hours.forEach((hr, index) => {
        const timeRangeStr = formatHourRange(hr);
        const taskName = savedLog[hr] ? (savedLog[hr].task || "") : "";
        const taskDesc = savedLog[hr] ? (savedLog[hr].desc || "") : "";
        const taskAttachment = (savedLog[hr] && savedLog[hr].attachment) ? savedLog[hr].attachment : null;

        let formattedDesc = taskDesc.replace(/\n/g, "<br>");
        if (taskAttachment) {
            if (taskAttachment.type && taskAttachment.type.startsWith("image/") && taskAttachment.data) {
                formattedDesc += `<br><div style="margin-top: 4pt;"><img src="${taskAttachment.data}" width="140" style="border: 1px solid #999; padding: 2px;"></div>`;
            } else if (taskAttachment.type && taskAttachment.type.startsWith("video/")) {
                formattedDesc += `<br><span style="font-size: 8.5pt; color: #475569;">[Bukti Video: ${taskAttachment.name}]</span>`;
            }
        }

        rowsHTML += `
            <tr>
                <td width="6%" style="border: 1pt solid #000000; padding: 4pt 5pt; text-align: center; vertical-align: top; font-size: 9.5pt;">${index + 1}</td>
                <td width="20%" style="border: 1pt solid #000000; padding: 4pt 5pt; text-align: center; vertical-align: top; font-size: 9.5pt; white-space: nowrap;">${timeRangeStr}</td>
                <td width="24%" style="border: 1pt solid #000000; padding: 4pt 5pt; vertical-align: top; font-weight: bold; font-size: 9.5pt;">${taskName}</td>
                <td width="50%" style="border: 1pt solid #000000; padding: 4pt 5pt; vertical-align: top; font-size: 9.5pt;">${formattedDesc}</td>
            </tr>
        `;
    });

    const logoTag = logoBase64
        ? `<div style="text-align: center; margin-bottom: 4pt;"><img src="${logoBase64}" width="150" height="60" style="width: 150px; height: auto;"></div>`
        : "";

    const sigTag = state.signature
        ? `<img src="${state.signature}" width="130" height="55" style="width: 130px; height: 55px; display: block;">`
        : `<div style="height: 55px;">&nbsp;</div>`;

    const titleText = isSubPage
        ? "LAPORAN AKTIVITI BEKERJA DARI RUMAH (BDR) - PERINCIAN HARIAN"
        : "LAPORAN AKTIVITI BEKERJA DARI RUMAH (BDR)";

    return `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #000000;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border: none; border-bottom: 1.5pt solid #000000; margin-bottom: 10pt; padding-bottom: 6pt;">
                <tr>
                    <td style="text-align: center; border: none;">
                        ${logoTag}
                        <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">${titleText}</div>
                        <div style="font-size: 10.5pt; font-weight: bold; color: #222222; margin-top: 2pt;">${state.profile.institution.toUpperCase()}</div>
                    </td>
                </tr>
            </table>

            <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse: collapse; border: 1pt solid #000000; margin-bottom: 10pt; font-size: 9.5pt;">
                <tr>
                    <td width="18%" style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Nama Pegawai</td>
                    <td width="38%" style="border: 1pt solid #000000; padding: 4pt 6pt;">${state.profile.name.toUpperCase()}</td>
                    <td width="16%" style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Hari BDR</td>
                    <td width="28%" style="border: 1pt solid #000000; padding: 4pt 6pt;">${DAY_NAMES[dayOfWeek]}</td>
                </tr>
                <tr>
                    <td style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Jawatan / Gred</td>
                    <td style="border: 1pt solid #000000; padding: 4pt 6pt;">${state.profile.designation}</td>
                    <td style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Tarikh BDR</td>
                    <td style="border: 1pt solid #000000; padding: 4pt 6pt;">${dateStrFormatted}</td>
                </tr>
                <tr>
                    <td style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Bahagian/Jabatan</td>
                    <td style="border: 1pt solid #000000; padding: 4pt 6pt;">${state.profile.department}</td>
                    <td style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Waktu Bekerja</td>
                    <td style="border: 1pt solid #000000; padding: 4pt 6pt;">8:00 AM - 6:00 PM (10 Jam)</td>
                </tr>
            </table>

            <div style="font-size: 10pt; font-weight: bold; text-decoration: underline; margin-top: 8pt; margin-bottom: 5pt;">PERINCIAN AKTIVITI HARIAN</div>

            <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse: collapse; border: 1pt solid #000000; margin-bottom: 14pt; font-size: 9.5pt;">
                <thead>
                    <tr>
                        <th width="6%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Bil</th>
                        <th width="20%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Waktu</th>
                        <th width="24%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Kategori Aktiviti</th>
                        <th width="50%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Perincian Tugasan / Catatan Pengajaran</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="border: none; margin-top: 10pt; font-size: 9.5pt; page-break-inside: avoid;">
                <tr>
                    <td width="48%" style="vertical-align: top; border: none; padding-right: 10pt;">
                        <div style="font-weight: bold; margin-bottom: 4pt;">Disediakan oleh:</div>
                        <div style="height: 55px; margin-bottom: 2pt;">${sigTag}</div>
                        <div style="margin-bottom: 2pt;">............................................................</div>
                        <div style="font-weight: bold; text-transform: uppercase;">${state.profile.name.toUpperCase()}</div>
                        <div style="color: #333333;">${state.profile.designation}</div>
                        <div style="margin-top: 3pt;">Tarikh: ${dateStrFormatted}</div>
                    </td>
                    <td width="4%" style="border: none;">&nbsp;</td>
                    <td width="48%" style="vertical-align: top; border: none; padding-left: 10pt;">
                        <div style="font-weight: bold; margin-bottom: 4pt;">Disahkan oleh:</div>
                        <div style="height: 55px; margin-bottom: 2pt;">&nbsp;</div>
                        <div style="margin-bottom: 2pt;">............................................................</div>
                        <div style="font-weight: bold; text-transform: uppercase;">${state.profile.hodName.toUpperCase()}</div>
                        <div style="color: #333333;">${state.profile.hodDesignation}</div>
                        <div style="margin-top: 3pt;">Tarikh: .......................................</div>
                    </td>
                </tr>
            </table>
        </div>
    `;
}

function downloadWordDocument(bodyContentHTML, filename) {
    const fullWordHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${filename}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page WordSection1 {
    size: 595.3pt 841.9pt;
    margin: 36.0pt 36.0pt 36.0pt 36.0pt;
    mso-header-margin: 18.0pt;
    mso-footer-margin: 18.0pt;
}
div.WordSection1 {
    page: WordSection1;
}
body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #000000;
}
table {
    border-collapse: collapse;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
}
</style>
</head>
<body>
<div class="WordSection1">
${bodyContentHTML}
</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff', fullWordHTML], {
        type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function exportDailyWord(dateStr) {
    const targetDate = dateStr || state.activeDate;
    if (!state.logs[targetDate]) {
        showToast("Tiada rekod disimpan bagi tarikh ini untuk dimuat turun.", "warning");
        return;
    }

    const logoBase64 = await getLogoBase64();
    const sheetHTML = buildWordDailySheetHTML(targetDate, logoBase64, false);
    downloadWordDocument(sheetHTML, `Laporan_BDR_Harian_${targetDate}`);
    showToast("Laporan Harian Word (.doc) berjaya dimuat turun!");
}

async function exportMonthlyWord() {
    const filterMonth = filterMonthInput.value;
    const allKeys = Object.keys(state.logs || {});
    const filteredKeys = (!filterMonth || filterMonth === "all")
        ? allKeys.sort((a, b) => new Date(a) - new Date(b))
        : allKeys.filter(key => key.startsWith(filterMonth)).sort((a, b) => new Date(a) - new Date(b));

    if (filteredKeys.length === 0) {
        showToast("Tiada rekod log ditemui bagi bulan yang dipilih.", "warning");
        return;
    }

    const effectiveMonth = (filterMonth && filterMonth !== "all") ? filterMonth : filteredKeys[filteredKeys.length - 1].slice(0, 7);
    const monthParts = effectiveMonth.split("-");
    const monthName = MONTH_NAMES[parseInt(monthParts[1]) - 1] || "";
    const yearStr = monthParts[0] || "";
    const monthlyPeriodStr = `${monthName} ${yearStr}`;

    const logoBase64 = await getLogoBase64();
    const logoTag = logoBase64
        ? `<div style="text-align: center; margin-bottom: 4pt;"><img src="${logoBase64}" width="150" height="60" style="width: 150px; height: auto;"></div>`
        : "";
    const sigTag = state.signature
        ? `<img src="${state.signature}" width="130" height="55" style="width: 130px; height: 55px; display: block;">`
        : `<div style="height: 55px;">&nbsp;</div>`;

    let summaryRowsHTML = "";
    filteredKeys.forEach((key, index) => {
        const logDate = new Date(key);
        const dayOfWeek = logDate.getDay();
        const dateStrFormatted = `${logDate.getDate()} ${MONTH_NAMES[logDate.getMonth()]} ${logDate.getFullYear()}`;
        const dailyLog = state.logs[key];

        const catMap = {};
        for (let hr in dailyLog) {
            if (dailyLog[hr] && dailyLog[hr].task) {
                let c = dailyLog[hr].task;
                catMap[c] = (catMap[c] || 0) + 1;
            }
        }
        const summaryTextParts = [];
        for (let cat in catMap) {
            summaryTextParts.push(`${cat} (${catMap[cat]} Jam)`);
        }
        const summaryText = summaryTextParts.join(", ");

        summaryRowsHTML += `
            <tr>
                <td width="6%" style="border: 1pt solid #000000; padding: 4pt 5pt; text-align: center; vertical-align: top; font-size: 9.5pt;">${index + 1}</td>
                <td width="18%" style="border: 1pt solid #000000; padding: 4pt 5pt; text-align: center; vertical-align: top; font-weight: bold; font-size: 9.5pt;">${dateStrFormatted}</td>
                <td width="14%" style="border: 1pt solid #000000; padding: 4pt 5pt; text-align: center; vertical-align: top; font-size: 9.5pt;">${DAY_NAMES[dayOfWeek]}</td>
                <td width="12%" style="border: 1pt solid #000000; padding: 4pt 5pt; text-align: center; vertical-align: top; font-size: 9.5pt;">${Object.keys(dailyLog).length} Jam</td>
                <td width="50%" style="border: 1pt solid #000000; padding: 4pt 5pt; vertical-align: top; font-size: 9.5pt;">${summaryText}</td>
            </tr>
        `;
    });

    let fullContentHTML = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #000000;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border: none; border-bottom: 1.5pt solid #000000; margin-bottom: 10pt; padding-bottom: 6pt;">
                <tr>
                    <td style="text-align: center; border: none;">
                        ${logoTag}
                        <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">LAPORAN BULANAN AKTIVITI BEKERJA DARI RUMAH (BDR)</div>
                        <div style="font-size: 10.5pt; font-weight: bold; color: #222222; margin-top: 2pt;">${state.profile.institution.toUpperCase()}</div>
                    </td>
                </tr>
            </table>

            <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse: collapse; border: 1pt solid #000000; margin-bottom: 10pt; font-size: 9.5pt;">
                <tr>
                    <td width="18%" style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Nama Pegawai</td>
                    <td width="38%" style="border: 1pt solid #000000; padding: 4pt 6pt;">${state.profile.name.toUpperCase()}</td>
                    <td width="18%" style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Bulan Pelaporan</td>
                    <td width="26%" style="border: 1pt solid #000000; padding: 4pt 6pt;">${monthlyPeriodStr}</td>
                </tr>
                <tr>
                    <td style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Jawatan / Gred</td>
                    <td style="border: 1pt solid #000000; padding: 4pt 6pt;">${state.profile.designation}</td>
                    <td style="border: 1pt solid #000000; background-color: #f1f5f9; font-weight: bold; padding: 4pt 6pt;">Bahagian/Jabatan</td>
                    <td style="border: 1pt solid #000000; padding: 4pt 6pt;">${state.profile.department}</td>
                </tr>
            </table>

            <div style="font-size: 10pt; font-weight: bold; text-decoration: underline; margin-top: 8pt; margin-bottom: 5pt;">RINGKASAN PELAKSANAAN BDR BULANAN</div>

            <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse: collapse; border: 1pt solid #000000; margin-bottom: 14pt; font-size: 9.5pt;">
                <thead>
                    <tr>
                        <th width="6%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Bil</th>
                        <th width="18%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Tarikh BDR</th>
                        <th width="14%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Hari</th>
                        <th width="12%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Jam BDR</th>
                        <th width="50%" style="border: 1pt solid #000000; background-color: #e2e8f0; padding: 5pt; text-align: center; font-weight: bold;">Ringkasan Aktiviti Utama</th>
                    </tr>
                </thead>
                <tbody>
                    ${summaryRowsHTML}
                </tbody>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="border: none; margin-top: 10pt; font-size: 9.5pt; page-break-inside: avoid;">
                <tr>
                    <td width="48%" style="vertical-align: top; border: none; padding-right: 10pt;">
                        <div style="font-weight: bold; margin-bottom: 4pt;">Disediakan oleh:</div>
                        <div style="height: 55px; margin-bottom: 2pt;">${sigTag}</div>
                        <div style="margin-bottom: 2pt;">............................................................</div>
                        <div style="font-weight: bold; text-transform: uppercase;">${state.profile.name.toUpperCase()}</div>
                        <div style="color: #333333;">${state.profile.designation}</div>
                        <div style="margin-top: 3pt;">Tarikh: 30 ${monthName} ${yearStr}</div>
                    </td>
                    <td width="4%" style="border: none;">&nbsp;</td>
                    <td width="48%" style="vertical-align: top; border: none; padding-left: 10pt;">
                        <div style="font-weight: bold; margin-bottom: 4pt;">Disahkan oleh:</div>
                        <div style="height: 55px; margin-bottom: 2pt;">&nbsp;</div>
                        <div style="margin-bottom: 2pt;">............................................................</div>
                        <div style="font-weight: bold; text-transform: uppercase;">${state.profile.hodName.toUpperCase()}</div>
                        <div style="color: #333333;">${state.profile.hodDesignation}</div>
                        <div style="margin-top: 3pt;">Tarikh: .......................................</div>
                    </td>
                </tr>
            </table>
        </div>
    `;

    filteredKeys.forEach((key) => {
        fullContentHTML += `<br clear="all" style="page-break-before: always; mso-break-type: section-break;">`;
        fullContentHTML += buildWordDailySheetHTML(key, logoBase64, true);
    });

    downloadWordDocument(fullContentHTML, `Laporan_BDR_Bulanan_${effectiveMonth}`);
    showToast("Laporan Bulanan Word (.doc) berjaya dimuat turun!");
}

// Helper to parse CSV line, supporting quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Toggle display of manual timetable section
function toggleTimetableSection(isLecturer) {
    const section = document.getElementById("timetable-manual-section");
    if (section) {
        if (isLecturer) {
            section.style.display = "block";
        } else {
            section.style.display = "none";
        }
    }
}

// Render manual grid input boxes in settings
function renderManualGridInputs() {
    const gridSelasa = document.getElementById("manual-grid-selasa");
    const gridKhamis = document.getElementById("manual-grid-khamis");
    if (!gridSelasa || !gridKhamis) return;

    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    // Tuesday (Day 2)
    let selasaHtml = "";
    hours.forEach(hr => {
        let savedVal = "";
        if (state.timetable[2] && state.timetable[2][hr]) {
            savedVal = state.timetable[2][hr].info;
        }
        let timeRange = formatHourRange(hr);
        selasaHtml += `
            <div class="timetable-manual-row">
                <label>${timeRange.split(" - ")[0]}</label>
                <input type="text" class="form-control manual-slot-input" data-day="2" data-hour="${hr}" value="${savedVal}" placeholder="Cth: DFC10353...">
            </div>
        `;
    });
    gridSelasa.innerHTML = selasaHtml;

    // Thursday (Day 4)
    let khamisHtml = "";
    hours.forEach(hr => {
        let savedVal = "";
        if (state.timetable[4] && state.timetable[4][hr]) {
            savedVal = state.timetable[4][hr].info;
        }
        let timeRange = formatHourRange(hr);
        khamisHtml += `
            <div class="timetable-manual-row">
                <label>${timeRange.split(" - ")[0]}</label>
                <input type="text" class="form-control manual-slot-input" data-day="4" data-hour="${hr}" value="${savedVal}" placeholder="Cth: DFX50083...">
            </div>
        `;
    });
    gridKhamis.innerHTML = khamisHtml;
}

// Save manual timetable inputs
function saveManualTimetable() {
    const inputs = document.querySelectorAll(".manual-slot-input");
    
    // Re-initialize Tuesday (2) and Thursday (4) structures
    state.timetable[2] = {};
    state.timetable[4] = {};
    
    inputs.forEach(input => {
        const day = parseInt(input.getAttribute("data-day"));
        const hour = parseInt(input.getAttribute("data-hour"));
        const val = input.value.trim();
        
        if (val) {
            state.timetable[day][hour] = {
                task: "Pelaksanaan Kelas",
                info: val
            };
        }
    });

    localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
    syncLogsWithActiveTimetable();
    loadActiveDateLog();
    showToast("Jadual manual berjaya disimpan!");
}

// Synchronize all saved logs with the active timetable
function syncLogsWithActiveTimetable() {
    const isLecturer = state.profile.isLecturer;
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

    for (let dateKey in state.logs) {
        const logDate = new Date(dateKey);
        const logDay = logDate.getDay();
        
        // Only sync for Tuesday (2) and Thursday (4)
        if (logDay === 2 || logDay === 4) {
            if (!state.logs[dateKey]) continue;

            const timetableDay = isLecturer ? state.timetable[logDay] : null;

            hours.forEach(hr => {
                if (timetableDay && timetableDay[hr]) {
                    // New timetable has a class at this hour
                    if (!state.logs[dateKey][hr]) {
                        state.logs[dateKey][hr] = {
                            task: "Pelaksanaan Kelas",
                            desc: `Kelas: ${timetableDay[hr].info}\nCatatan Pengajaran: `
                        };
                    } else {
                        state.logs[dateKey][hr].task = "Pelaksanaan Kelas";
                        const currentDesc = state.logs[dateKey][hr].desc || "";
                        const match = currentDesc.match(/^(Kelas:\s*.*?\nCatatan Pengajaran:\s*)(.*)$/s);
                        if (match) {
                            state.logs[dateKey][hr].desc = `Kelas: ${timetableDay[hr].info}\nCatatan Pengajaran: ` + match[2];
                        } else {
                            // Strip old class prefix if it is there in some other format
                            const cleanDesc = currentDesc.replace(/^Kelas:\s*.*?\nCatatan Pengajaran:\s*/gi, "");
                            state.logs[dateKey][hr].desc = `Kelas: ${timetableDay[hr].info}\nCatatan Pengajaran: ` + cleanDesc;
                        }
                    }
                } else {
                    // New timetable does NOT have a class at this hour.
                    // If it was previously marked as "Pelaksanaan Kelas", revert it to "Urusan Kerja ICT"
                    if (state.logs[dateKey][hr] && state.logs[dateKey][hr].task === "Pelaksanaan Kelas") {
                        state.logs[dateKey][hr].task = "Urusan Kerja ICT";
                        state.logs[dateKey][hr].desc = "";
                    }
                }
            });
        }
    }
    localStorage.setItem("bdr_logs", JSON.stringify(state.logs));
}

// --- Data Backup & Restore (JSON Export / Import) ---
const exportJsonBtn = document.getElementById("export-json-btn");
const importJsonBtn = document.getElementById("import-json-btn");
const importJsonFile = document.getElementById("import-json-file");

if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", () => {
        const backupData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            profile: state.profile,
            logs: state.logs,
            timetable: state.timetable,
            signature: state.signature
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `HBH_PMTG_Backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("Fail backup .json berjaya dimuat turun!");
    });
}

if (importJsonBtn && importJsonFile) {
    importJsonBtn.addEventListener("click", () => importJsonFile.click());
    importJsonFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const imported = JSON.parse(evt.target.result);
                if (imported.logs) state.logs = imported.logs;
                if (imported.profile) state.profile = imported.profile;
                if (imported.timetable) state.timetable = imported.timetable;
                if (imported.signature) state.signature = imported.signature;

                localStorage.setItem("bdr_logs", JSON.stringify(state.logs));
                localStorage.setItem("bdr_profile", JSON.stringify(state.profile));
                localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
                localStorage.setItem("bdr_signature", state.signature);

                loadLocalStorageData();
                if (logDateInput && logDateInput.value) {
                    state.activeDate = logDateInput.value;
                    loadActiveDateLog();
                }
                updateDashboardStats();
                updateHistoryTable();
                showToast("Data backup berjaya dimasukkan!");
            } catch (err) {
                alert("Ralat: Fail backup tidak sah!");
            }
        };
        reader.readAsText(file);
    });
}

// ==========================================
// FIREBASE CLOUD SYNC & AUTHENTICATION SETUP
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDaZYfaLkXtfniOFA4EdOfDHngsSbdNffw",
  authDomain: "hbh-pmtg-2.firebaseapp.com",
  projectId: "hbh-pmtg-2",
  storageBucket: "hbh-pmtg-2.firebasestorage.app",
  messagingSenderId: "1096496691203",
  appId: "1:1096496691203:web:9fee2c565fc78812bdb636",
  measurementId: "G-87BRR9D33Q"
};

let auth = null;
let db = null;
let currentUser = null;

if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase Cloud initialized successfully.");
    } catch (e) {
        console.error("Firebase init error:", e);
    }
}

// UI Elements for Cloud Sync
const cloudAuthModal = document.getElementById("cloud-auth-modal");
const closeCloudAuthModal = document.getElementById("close-cloud-auth-modal");
const navCloudBtn = document.getElementById("nav-cloud-btn");
const navCloudText = document.getElementById("nav-cloud-text");
const cloudLoginBtn = document.getElementById("cloud-login-btn");

const authLoggedOutView = document.getElementById("auth-logged-out-view");
const authLoggedInView = document.getElementById("auth-logged-in-view");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const userDisplayEmail = document.getElementById("user-display-email");

const doLoginBtn = document.getElementById("do-login-btn");
const doRegisterBtn = document.getElementById("do-register-btn");
const doLogoutBtn = document.getElementById("do-logout-btn");
const syncNowBtn = document.getElementById("sync-now-btn");
const saveNowBtn = document.getElementById("save-now-btn");

function openCloudModal() {
    if (cloudAuthModal) cloudAuthModal.classList.remove("hidden");
}

function closeCloudModal() {
    if (cloudAuthModal) cloudAuthModal.classList.add("hidden");
}

if (navCloudBtn) navCloudBtn.addEventListener("click", openCloudModal);
if (cloudLoginBtn) cloudLoginBtn.addEventListener("click", openCloudModal);
if (closeCloudAuthModal) closeCloudAuthModal.addEventListener("click", closeCloudModal);

// Firebase Auth State Observer
if (auth) {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            console.log("Logged in user:", user.email);
            if (userDisplayEmail) userDisplayEmail.textContent = user.email;
            if (navCloudText) navCloudText.textContent = user.email.split("@")[0];
            if (authLoggedOutView) authLoggedOutView.classList.add("hidden");
            if (authLoggedInView) authLoggedInView.classList.remove("hidden");
            
            const cloudBadge = document.getElementById("cloud-status-badge");
            if (cloudBadge) {
                cloudBadge.style.background = "#22c55e";
                cloudBadge.style.color = "white";
                cloudBadge.textContent = `☁️ Akaun Awan: ${user.email}`;
            }
            
            // Auto fetch user data from Firestore on login
            fetchUserDataFromCloud(user.uid);
        } else {
            if (navCloudText) navCloudText.textContent = "Log Masuk Awan";
            if (authLoggedOutView) authLoggedOutView.classList.remove("hidden");
            if (authLoggedInView) authLoggedInView.classList.add("hidden");
            
            const cloudBadge = document.getElementById("cloud-status-badge");
            if (cloudBadge) {
                cloudBadge.style.background = "#e2e8f0";
                cloudBadge.style.color = "#475569";
                cloudBadge.textContent = "⚡ Akaun Tempatan (LocalStorage)";
            }
        }
    });
}

// Function to clear local state when logging out or switching accounts
function clearLocalState() {
    state.logs = {};
    state.signature = "";
    state.profile = {
        name: "NAMA PEGAWAI",
        designation: "Jawatan / Gred",
        department: "Jabatan",
        institution: "Politeknik METrO Tasek Gelugor",
        hodName: "Ketua Jabatan",
        hodDesignation: "Ketua Jabatan",
        isLecturer: true
    };
    state.timetable = JSON.parse(JSON.stringify(TIMETABLE));

    localStorage.removeItem("bdr_logs");
    localStorage.removeItem("bdr_profile");
    localStorage.removeItem("bdr_timetable");
    localStorage.removeItem("bdr_signature");

    loadLocalStorageData();
    if (logDateInput && logDateInput.value) {
        state.activeDate = logDateInput.value;
        loadActiveDateLog();
    }
    updateDashboardStats();
    updateHistoryTable();
}

// Helper to compress all evidence image attachments in state.logs before Cloud save
async function compressLogsAttachments(logs) {
    if (!logs) return {};
    const clonedLogs = JSON.parse(JSON.stringify(logs));
    
    const compressPromise = (dataUrl) => {
        return new Promise((resolve) => {
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith("data:image")) {
                return resolve(dataUrl);
            }
            // If already compressed (< 60KB Base64), keep as-is
            if (dataUrl.length < 60000) {
                return resolve(dataUrl);
            }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const maxDim = 500;

                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.5));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    };

    for (const dateKey of Object.keys(clonedLogs)) {
        const dayLog = clonedLogs[dateKey];
        if (dayLog && typeof dayLog === 'object') {
            for (const hrKey of Object.keys(dayLog)) {
                const item = dayLog[hrKey];
                if (item && item.attachment && item.attachment.data) {
                    item.attachment.data = await compressPromise(item.attachment.data);
                }
            }
        }
    }
    return clonedLogs;
}

// Function to save user state to Firestore Cloud
async function saveUserDataToCloud(silent = false) {
    if (!auth || !currentUser || !db) return;
    try {
        const userDocRef = db.collection("users").doc(currentUser.uid);
        
        // Auto-compress all attachments (including legacy uncompressed logs) before sending to Cloud
        const cleanLogs = await compressLogsAttachments(state.logs);
        const cleanProfile = JSON.parse(JSON.stringify(state.profile || {}));
        const cleanTimetable = JSON.parse(JSON.stringify(state.timetable || {}));
        const cleanSignature = state.signature || "";

        // Update local state with compressed logs to save disk space
        state.logs = cleanLogs;
        localStorage.setItem("bdr_logs", JSON.stringify(state.logs));

        await userDocRef.set({
            email: currentUser.email,
            profile: cleanProfile,
            logs: cleanLogs,
            timetable: cleanTimetable,
            signature: cleanSignature,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("Cloud save success for:", currentUser.email);
        if (!silent) showToast("☁️ Data & bukti berjaya disimpan ke Awan!");
    } catch (err) {
        console.error("Cloud save error:", err);
        showToast("⚠️ Ralat Simpan Awan: " + err.message);
        if (!silent) alert("Ralat menyimpan ke Awan: " + err.message);
    }
}

// Function to fetch user state from Firestore Cloud
async function fetchUserDataFromCloud(uid) {
    if (!db) return;
    try {
        // Fetch latest server document bypassing local cache
        const docSnap = await db.collection("users").doc(uid).get({ source: "server" }).catch(() => db.collection("users").doc(uid).get());
        if (docSnap.exists) {
            const data = docSnap.data();
            // Replace local state cleanly with fetched cloud user data
            state.logs = data.logs || {};
            state.profile = data.profile || {
                name: "NAMA PEGAWAI",
                designation: "Jawatan / Gred",
                department: "Jabatan",
                institution: "Politeknik METrO Tasek Gelugor",
                hodName: "Ketua Jabatan",
                hodDesignation: "Ketua Jabatan",
                isLecturer: true
            };
            state.timetable = data.timetable || JSON.parse(JSON.stringify(TIMETABLE));
            state.signature = data.signature || "";

            // Sync to localstorage for offline fallback
            localStorage.setItem("bdr_logs", JSON.stringify(state.logs));
            localStorage.setItem("bdr_profile", JSON.stringify(state.profile));
            localStorage.setItem("bdr_timetable", JSON.stringify(state.timetable));
            localStorage.setItem("bdr_signature", state.signature);

            loadLocalStorageData();
            if (logDateInput && logDateInput.value) {
                state.activeDate = logDateInput.value;
                loadActiveDateLog();
            }
            updateDashboardStats();
            selectBestDefaultMonth();
            updateHistoryTable();
            if (printDailyDateSelect) checkDailyPrintDateStatus(printDailyDateSelect.value);
            updateMonthlyPrintStatus();
            showToast("☁️ Data akaun berjaya diselaras dari Awan!");
        } else {
            console.log("No cloud doc found for new user, initializing fresh empty state.");
            clearLocalState();
            saveUserDataToCloud(true);
            showToast("☁️ Akaun baharu dimulakan!");
        }
    } catch (err) {
        console.error("Cloud fetch error:", err);
        if (err.message.includes("permission")) {
            alert("⚠️ Firestore Security Rules belum diaktifkan! Sila tetapkan Rules kepada 'allow read, write: if request.auth != null;'\n\n" + err.message);
        } else {
            showToast("⚠️ Ralat Muat Data Awan: " + err.message);
        }
    }
}

// Auth Handlers
if (doLoginBtn) {
    doLoginBtn.addEventListener("click", async () => {
        const email = authEmailInput.value.trim();
        const pass = authPasswordInput.value.trim();
        if (!email || !pass) return alert("Sila masukkan Emel dan Katalaluan.");
        try {
            await auth.signInWithEmailAndPassword(email, pass);
            showToast("Log masuk Awan berjaya!");
            closeCloudModal();
        } catch (err) {
            alert("Gagal Log Masuk: " + err.message);
        }
    });
}

if (doRegisterBtn) {
    doRegisterBtn.addEventListener("click", async () => {
        const email = authEmailInput.value.trim();
        const pass = authPasswordInput.value.trim();
        if (!email || !pass) return alert("Sila masukkan Emel dan Katalaluan.");
        if (pass.length < 6) return alert("Katalaluan mestilah sekurang-kurangnya 6 aksara.");
        try {
            await auth.createUserWithEmailAndPassword(email, pass);
            showToast("Akaun baharu berjaya didaftarkan di Awan!");
            closeCloudModal();
        } catch (err) {
            alert("Gagal Mendaftar Akaun: " + err.message);
        }
    });
}

if (doLogoutBtn) {
    doLogoutBtn.addEventListener("click", async () => {
        if (auth) {
            await auth.signOut();
            clearLocalState();
            showToast("Log keluar dari Awan & data dibersihkan.");
            closeCloudModal();
        }
    });
}

if (syncNowBtn) {
    syncNowBtn.addEventListener("click", () => {
        if (currentUser) {
            fetchUserDataFromCloud(currentUser.uid);
        }
    });
}

if (saveNowBtn) {
    saveNowBtn.addEventListener("click", () => {
        if (currentUser) {
            saveUserDataToCloud(false);
        }
    });
}

// --- Mobile Side Panel Drawer Controls ---
const openDrawerBtn = document.getElementById("open-drawer-btn");
const closeDrawerBtn = document.getElementById("close-drawer-btn");
const mobileDrawerOverlay = document.getElementById("mobile-drawer-overlay");
const appSidebar = document.getElementById("app-sidebar");

function openMobileDrawer() {
    if (appSidebar) appSidebar.classList.add("drawer-open");
    if (mobileDrawerOverlay) mobileDrawerOverlay.classList.add("active");
}

function closeMobileDrawer() {
    if (appSidebar) appSidebar.classList.remove("drawer-open");
    if (mobileDrawerOverlay) mobileDrawerOverlay.classList.remove("active");
}

if (openDrawerBtn) openDrawerBtn.addEventListener("click", openMobileDrawer);
if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeMobileDrawer);
if (mobileDrawerOverlay) mobileDrawerOverlay.addEventListener("click", closeMobileDrawer);

// Close drawer when menu items are clicked on mobile
const drawerMenuItems = document.querySelectorAll(".menu-item");
drawerMenuItems.forEach(item => {
    item.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            closeMobileDrawer();
        }
    });
});

// Function to hide APK Download buttons when running inside Mobile / APK WebView
function hideApkButtonsOnMobile() {
    const isMobileOrAPK = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768 || window.location.protocol === "file:";
    if (isMobileOrAPK) {
        document.querySelectorAll('.apk-download-btn, .apk-download-card').forEach(el => {
            el.style.display = 'none';
            el.style.setProperty('display', 'none', 'important');
        });
    }
}

// Run immediately and on DOMContentLoaded / resize
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideApkButtonsOnMobile);
} else {
    hideApkButtonsOnMobile();
}
window.addEventListener("resize", hideApkButtonsOnMobile);

// Force update Service Worker caches so new code is fetched from GitHub Pages
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
            registration.update();
        }
    });
}



