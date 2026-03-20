/*
 *  script.js   v1.1
 * 
 *  Script for addon.
 * 
 *  matmoj04    3.2025
 */

const chrome = window.chrome || window.browser;

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

// load saved data from local storage of thunderbird
async function loadState() {
    try {
        const stored = await chrome.storage.local.get("plannerPro");
        if (stored.plannerPro) {
            planner = stored.plannerPro;
        }
    } catch (e) {
        console.error("Storage failed:", e);
    }
}

async function saveState() {
    try {
        await chrome.storage.local.set({ plannerPro: planner });
    } catch (e) {
        console.error("Save failed:", e);
    }
}
    
// buttons
document.addEventListener("DOMContentLoaded", async () => {
    await loadState();
    renderDashboard();

    // Data export
    document.getElementById("exportBtn").onclick = async () => {
    const data = await chrome.storage.local.get("plannerPro");
    const blob = new Blob([JSON.stringify(data.plannerPro, null, 2)], {type : 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup.json`;
    a.click();
    };

    // Data import
    document.getElementById("importBtn").onclick = () => {
        document.getElementById("importFile").click();
    };

    document.getElementById("importFile").onchange = (e) => {
        const file = e.target.files[0];
        if (!file) 
            return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // Basic validation: check if it has the semesters array
                if (importedData.semesters) {
                    planner = importedData;
                    await saveState();
                    renderDashboard();
                    alert("Data imported successfully!");
                } else {
                    alert("Invalid backup file format.");
                }
            } catch (err) {
                alert("Error reading file: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    //edit buttons
    document.getElementById("editDashBtn").onclick = (e) => {
        isEditMode = !isEditMode;
        e.currentTarget.classList.toggle("edit-active", isEditMode);
        renderDashboard();
    };

    document.getElementById("editPlannerBtn").onclick = (e) => {
        isEditMode = !isEditMode;
        e.currentTarget.classList.toggle("edit-active", isEditMode);
        initPlanner();
    };

    //backspace
    document.getElementById("backToDash").onclick = () => {
        isEditMode = false;

        document.getElementById("editPlannerBtn").classList.remove("edit-active");
        document.getElementById("editDashBtn").classList.remove("edit-active");
        
        document.getElementById("plannerView").classList.add("hidden");
        document.getElementById("dashboardView").classList.remove("hidden");

        renderDashboard();
    };

    //planner
    document.getElementById("newTabBtn").onclick = () => {
        const sem = getActiveSemester();
        const name = "New Folder";

        sem.folders.push(name);

        planner.activeTab = name; // focus new

        saveState(); 
        initPlanner();
    };

    document.getElementById("startDatePicker").onchange = (e) => {
        getActiveSemester().startDate = e.target.value;
        saveState();
        initPlanner(); 
    };
});

//date assigned to tab
function getActiveSemester() {
    return planner.semesters.find(s => s.id === planner.activeSemId);
}

// Dashboard view
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

function openSemester(id) {
    planner.activeSemId = id;
    const sem = getActiveSemester();

    planner.activeTab = sem.folders[0] || "";
    document.getElementById("dashboardView").classList.add("hidden");
    document.getElementById("plannerView").classList.remove("hidden");
    initPlanner();
}

// Table
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

    // Header
    let html = `<thead><tr><th class="col-subject">Predmet</th><th class="col-abbr">Skratka</th>`;
    
    for (let i=1; i<=totalWeeks; i++) 
        html += `<th class="${i===currentWW?'current-week-col':''}">WW${i}</th>`;
    html += `</tr></thead><tbody id="subBody"></tbody>`;
    
    table.innerHTML = html;
    container.appendChild(table);

    const subs = sem.subjects[planner.activeTab] || [];
    const tbody = table.querySelector("#subBody");
    
    // Cells
    subs.forEach((sub, sIdx) => {
        const row = document.createElement("tr");
        
        const tdName = document.createElement("td");
        tdName.className = "col-subject";
        tdName.textContent = sub.name;
        tdName.contentEditable = isEditMode;

        tdName.onblur = () => {
            sub.name = tdName.textContent;
            saveState(); 
            initPlanner();
        }; 

        row.appendChild(tdName);

        const tdAbbr = document.createElement("td");
        tdAbbr.className = "col-abbr";
        tdAbbr.textContent = sub.abbr;
        tdAbbr.contentEditable = isEditMode;

        tdAbbr.onblur = () => {
            sub.abbr = tdAbbr.textContent;
            saveState();
        };

        row.appendChild(tdAbbr);
        
        // Cells
        for(let w = 1; w <= totalWeeks; w++) {
            const td = document.createElement("td");
            const id = `${sem.id}-${planner.activeTab}-${sIdx}-${w}`;
            const data = sem.schedule[id] || {text:"", class:"", note:""};

            td.innerHTML = data.text || "";

            if (data.class) {
                td.className = data.class;
            }
            
            if (data.note) {
                td.title = data.note;
                // Ensures that the corner is there
                td.classList.add("note-indicator");
            }

            //Changes the coloring 
            if(w === currentWW) {
                td.classList.add("current-week-col");
            }

            // Shuffle the icons on click
            td.onclick = () => {
                // Disable the cell while editing
                if(isEditMode)
                    return;
                
                // TODO: Change for item picker                
                // Find current icon index by comparing HTML, and then find next
                let currentIdx = iconData.findIndex(icon => icon.html === td.innerHTML);
                let nextIdx = (currentIdx + 1) % iconData.length;
                let nextIcon = iconData[nextIdx];

                td.innerHTML = nextIcon.html;

                const allIconClasses = iconData.map(i => i.class).filter(c => c !== "");
                td.classList.remove(...allIconClasses);

                if (nextIcon.class) {
                    td.classList.add(nextIcon.class);
                }

                saveCell(id, td.innerHTML, td.className, td.title);
            };

            // Add comment to cell
            td.oncontextmenu = (e) => {
                e.preventDefault();
                
                if(isEditMode) 
                    return;
                
                const note = prompt("Comment:", td.title || "");
                
                if(note !== null) {
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
            if(!sem.subjects[planner.activeTab]) 
                sem.subjects[planner.activeTab] = [];
            
            sem.subjects[planner.activeTab].push({name: "New Subject", abbr: "SUB"});

            saveState();
            initPlanner();
        };

        container.appendChild(addBtn);
    }
}

// Save value
function saveCell(id, html, color, note) {
    const sem = getActiveSemester();
    sem.schedule[id] = { 
        text: html || "",
        class: color || "",
        note: note || ""
    };
    saveState();
}

// Calculate the relative week
function calculateWW(start) {
    if (!start) return -1;
    const diff = Math.floor((new Date() - new Date(start)) / (1000*60*60*24*7));
    return (diff >= 0 && diff < totalWeeks) ? diff + 1 : -1;
}

// Dragging in dashboard
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
        
        if (e.dataTransfer.getData("type") !== type) return;

        const list = type === 'folder' ? getActiveSemester().folders : planner.semesters;
        const item = list.splice(sIdx, 1)[0];
        list.splice(idx, 0, item);
        saveState(); type === 'folder' ? initPlanner() : renderDashboard();
    };
}
