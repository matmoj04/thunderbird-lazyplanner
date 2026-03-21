/*
 *  script.js   v1-alpha.0.0
 * 
 *  Script for TB addon.
 * 
 *  matmoj04    3.2025
 */

const totalWeeks = 14;
const iconData = [
    { html: "", class: "" },
    { html: '<i>󰄱</i>', class: "icon-empty" },
    { html: '<i>󰄵</i>', class: "icon-check" },
    { html: '<i>󰅘</i>', class: "icon-close" },
    { html: '<i>󰤌</i>', class: "icon-notes" },
    { html: '<i>󰄮</i>', class: "icon-homew" }
];
let planner = { semesters: [], activeSemId: null, activeTab: null };
let isEditMode = false;

// Dashboard view
// TODO: Restructure code
function renderDashboard() {
    const grid = document.getElementById("semesterGrid");
    const dashView = document.getElementById("dashboardView");
    grid.innerHTML = "";

    isEditMode ? dashView.classList.add("edit-mode-on") : dashView.classList.remove("edit-mode-on");

    // Render cards
    planner.semesters.forEach((sem, idx) => {
        const card = document.createElement("div");
        card.className = "sem-card";
        const titleSpan = document.createElement("span");

        titleSpan.textContent = sem.name;
        titleSpan.contentEditable = isEditMode;
        titleSpan.onblur = () => { sem.name = titleSpan.textContent; saveState(); };
        card.appendChild(titleSpan);
        
        if (!isEditMode) 
            card.onclick = () => openSemester(sem.id);

        // Delete item
        const del = document.createElement("button");
        del.className = "delete-btn";
        del.innerHTML = '<span class="nf">\uf00d</span>';

        del.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Delete ${sem.name}?`)) {
                planner.semesters.splice(idx, 1);
                saveState(); renderDashboard();
            }
        };

        card.appendChild(del);
        addDragListeners(card, 'semester', idx);
        grid.appendChild(card);
    });

    if (isEditMode) {
        // Render add card
        const addCard = document.createElement("div");
        addCard.className = "sem-card add-card";
        addCard.innerHTML = "+";

        addCard.onclick = () => {
            planner.semesters.push({ 
                id: Date.now().toString(), 
                name: "New Semester", 
                startDate: "", 
                folders: ["Protokoly", "Cvičenia", "Testy, Odovzdania", "Protokoly, Príprava"], 
                subjects: {}, 
                schedule: {} 
            });

            saveState(); 
            renderDashboard();
        };

        grid.appendChild(addCard);
    }
}

// Helper functions
function openSemester(id) {
    planner.activeSemId = id;
    const sem = getActiveSemester();

    planner.activeTab = sem.folders[0] || "";
    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("plannerView").classList.remove("hidden");
    
    initPlanner();
}

// Table view
// TODO: Restructure code
function initPlanner() {
    const tabBar = document.getElementById("tabBar");
    const container = document.getElementById("tablesContainer");
    const plannerView = document.getElementById("plannerView");

    tabBar.innerHTML = ""; 
    container.innerHTML = "";
    
    isEditMode ? plannerView.classList.add("edit-mode-on") : plannerView.classList.remove("edit-mode-on");
    
    const sem = getActiveSemester();
    const currentWW = calculateWW(sem.startDate);
    document.getElementById("activeSemesterTitle").textContent = sem.name;
    document.getElementById("startDatePicker").value = sem.startDate || "";

    sem.folders.forEach((cat, idx) => {
        const tab = document.createElement("div");
        tab.className = `tab ${cat === planner.activeTab ? 'active' : ''}`;
        
        const textSpan = document.createElement("span");
        textSpan.textContent = cat;
        textSpan.contentEditable = isEditMode;
        tab.appendChild(textSpan);

        // Delete Button for Tab
        if (isEditMode) {
            const delTab = document.createElement("button");
            delTab.className = "delete-btn-tab";
            delTab.innerHTML = '<span class="nf">\uf00d</span>';

            delTab.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete folder "${cat}"?`)) {
                    // Remove folder name
                    sem.folders.splice(idx, 1);
                    // Clean up subjects and schedule associated with this folder name
                    delete sem.subjects[cat];
                    
                    // Reset active tab if we deleted the current one
                    if (planner.activeTab === cat) {
                        planner.activeTab = sem.folders[0] || "";
                    }
                    
                    saveState(); 
                    initPlanner();
                }
            };
            tab.appendChild(delTab);
        }

        textSpan.onblur = () => {
            const newName = textSpan.textContent.trim();

            if (newName && newName !== sem.folders[idx]) {
                const oldName = sem.folders[idx];
                sem.subjects[newName] = sem.subjects[oldName] || [];
                delete sem.subjects[oldName];
                sem.folders[idx] = newName;
                planner.activeTab = newName;
                saveState();
            }
        };

        tab.onclick = () => {
            if (!isEditMode) {
                planner.activeTab = cat;
                initPlanner();
            }
        };

        addDragListeners(tab, 'folder', idx);
        tabBar.appendChild(tab);
    });

    renderSubjectTable(sem, currentWW, container);
}

// Render table
function renderSubjectTable(sem, currentWW, container) {
    const table = document.createElement("table");

    // Header render
    let html = `<thead><tr><th class="col-subject">Predmet</th><th class="col-abbr">Skratka</th>`;
    
    for (let i = 1; i <= totalWeeks; i++) 
        html += `<th class="${i===currentWW ? 'current-week-col' : ''}">WW${i}</th>`;
    html += `</tr></thead><tbody id="subBody"></tbody>`;
    
    table.innerHTML = html;
    container.appendChild(table);

    const subs = sem.subjects[planner.activeTab] || [];
    const tbody = table.querySelector("#subBody");
    
    // Cells
    subs.forEach((sub, sIdx) => {
        const row = document.createElement("tr");

        // Name Column
        const tdName = createEditableCell(sub.name, "col-subject", (val) => {
            const cleanName = val.trim();
            sub.name = cleanName;

            if (cleanName.includes(" ")) {
                sub.abbr = cleanName.split(" ")[0].slice(-3).toUpperCase();
                
                saveState();
                initPlanner(); 
            }
        });

        // Delete row
        tdName.onclick = (e) => {
            if (isEditMode) {
                // Check if the user clicked the far-left side (where the icon is)
                // 30px matches the padding we set in CSS
                if (e.offsetX < 30) { 
                    e.preventDefault();
                    e.stopPropagation(); // Stop the text-editor from opening
                    
                    if (confirm(`Delete subject "${sub.name || 'this row'}"?`)) {
                        sem.subjects[planner.activeTab].splice(sIdx, 1);
                        saveState();
                        initPlanner();
                    }
                    return false;
                }
            }
        };

        row.appendChild(tdName);

        // Abbreviation Column
        row.appendChild(createEditableCell(sub.abbr, "col-abbr", (val) => {
            sub.abbr = val.trim().toUpperCase();
        }));
        
        // Cells
        for(let w = 1; w <= totalWeeks; w++) {
            const td = document.createElement("td");
            const id = `${sem.id}-${planner.activeTab}-${sIdx}-${w}`;
            const data = sem.schedule[id] || {text:"", class:"", note:""};

            td.innerHTML = data.text || "";

            if (data.class)
                td.className = data.class;
            
            if (data.note) {
                td.title = data.note;
                td.classList.add("note-indicator");
            }

            if(w === currentWW)
                td.classList.add("current-week-col");

            // Shuffle the icons on click
            td.onclick = () => {
                // Disable the cell while editing
                if (isEditMode)
                    return;

                // TODO: Change for item picker                
                // Find current icon index by comparing HTML, and then find next
                let currentIdx = iconData.findIndex(icon => icon.html === td.innerHTML);
                let nextIdx = (currentIdx + 1) % iconData.length;
                let nextIcon = iconData[nextIdx];

                td.innerHTML = nextIcon.html;

                const allIconClasses = iconData.map(i => i.class).filter(c => c !== "");
                td.classList.remove(...allIconClasses);

                if (nextIcon.class)
                    td.classList.add(nextIcon.class);

                saveCell(id, td.innerHTML, td.className, td.title);
            };

            // Add comment to cell
            td.oncontextmenu = (e) => {
                e.preventDefault();
                
                if (isEditMode) 
                    return;
                
                const note = prompt("Comment:", td.title || "");
                
                if (note !== null) {
                    td.title = note;
                    note ? td.classList.add("note-indicator") : td.classList.remove("note-indicator");

                    saveCell(id, td.innerHTML, td.className, td.title);
                }
            };

            row.appendChild(td);
        }

        tbody.appendChild(row);
    });

    // Add row
    if (isEditMode) {
        const addBtn = document.createElement("button");
        addBtn.className = "add-row-btn";
        addBtn.innerHTML = '<span class="nf">\uf055</span> Add Subject';

        addBtn.onclick = () => {
            if (!sem.subjects[planner.activeTab]) 
                sem.subjects[planner.activeTab] = [];
            
            sem.subjects[planner.activeTab].push({
                name: "",
                abbr: ""
            });

            saveState();
            initPlanner();
        };

        container.appendChild(addBtn);
    }
}

// Helper functions
function createEditableCell(text, className, onSave) {
    const td = document.createElement("td");

    td.className = className;
    td.textContent = text;
    td.contentEditable = isEditMode;

    td.onblur = () => {
        onSave(td.textContent);
        saveState();
    };

    return td;
}

function saveCell(id, html, color, note) {
    const sem = getActiveSemester();

    sem.schedule[id] = { 
        text: html || "",
        class: color || "",
        note: note || ""
    };

    saveState();
}

function calculateWW(start) {
    if (!start) 
        return -1;
    const diff = Math.floor((new Date() - new Date(start)) / (1000*60*60*24*7));

    return (diff >= 0 && diff < totalWeeks) ? diff + 1 : -1;
}

function deleteSubject(sIdx) {
    const sem = getActiveSemester();
    const activeTab = planner.activeTab;

    // Remove the subject from the array
    sem.subjects[activeTab].splice(sIdx, 1);

    // CRITICAL: Clean up the schedule data for this row 
    // to prevent "ghost" data if a new row is added later
    Object.keys(sem.schedule).forEach(key => {
        if (key.includes(`-${activeTab}-${sIdx}-`)) {
            delete sem.schedule[key];
        }
    });

    saveState();
    initPlanner();
}

// TODO: Look closer at function of the code
// TODO: Folder drag not working
function addDragListeners(el, type, idx) {
    el.draggable = isEditMode;

    el.ondragstart = (e) => { 
        if(!isEditMode)
            return e.preventDefault();

        e.dataTransfer.setData("idx", idx); 
        e.dataTransfer.setData("type", type); 
        el.classList.add("dragging"); 
    };

    /* Makes droping possible */
    el.ondragover = (e) => {
        e.preventDefault();
    }

    /* Letting go of the mouse */
    el.ondrop = (e) => {
        e.preventDefault();
        el.classList.remove("dragging");

        const sIdx = parseInt(e.dataTransfer.getData("idx"));
        
        if (e.dataTransfer.getData("type") !== type) 
            return;

        const list = type === 'folder' ? getActiveSemester().folders : planner.semesters;
        const item = list.splice(sIdx, 1)[0];
        list.splice(idx, 0, item);

        saveState();

        type === 'folder' ? initPlanner() : renderDashboard();
    };
}
