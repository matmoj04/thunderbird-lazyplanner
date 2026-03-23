/*
 *  script.js   v1-alpha.0.0
 * 
 *  Script for TB addon.
 * 
 *  matmoj04    3.2025
 */

const WEEKS_COUNT = 14;
const ICON_SET = [
    { html: "", class: "" },
    { html: '<icon>󰄱</icon>', class: "icon-empty" },
    { html: '<icon>󰄵</icon>', class: "icon-check" },
    { html: '<icon>󰅘</icon>', class: "icon-close" },
    { html: '<icon>󰤌</icon>', class: "icon-notes" },
    { html: '<icon>󰄮</icon>', class: "icon-homew" }
];


// Dashboard view
// TODO: Restructure code
function initDashboard() {
    const grid = document.getElementById("semesterGrid");
    grid.innerHTML = "";

    document.getElementById("dashboardView").classList.toggle("edit-mode-on", isEditMode);

    // Render cards
    planner.semesters.forEach((sem, idx) => {
        const card = createCard(sem, idx);
        grid.appendChild(card);
    });

    if (isEditMode) {
        // Render add card
        const addCardBtn = document.createElement("div");
        addCardBtn.className = "sem-card add-card";
        addCardBtn.innerHTML = "+";

        // TODO: Start with date now
        addCardBtn.onclick = () => {
            planner.semesters.push({ 
                id: Date.now().toString(), 
                name: "New Semester", 
                startDate: Date.now(), 
                folders: ["Lectures", "Seminars", "Notes, Tests, Prep.", "Protocols, Submited"], 
                subjects: {}, 
                schedule: {} 
            });

            Data.save().then(initDashboard);
        };

        grid.appendChild(addCardBtn);
    }
}

// Helper functions
// TODO: Make button func for these type of operations
function createCard(sem, idx) {
    const card = document.createElement("div");
    card.className = "sem-card";
    
    const title = document.createElement("span");
    title.textContent = sem.name;
    title.contentEditable = isEditMode;

    title.onblur = () => { 
        sem.name = title.textContent.trim(); 
        Data.save();
    };

    title.onkeydown = (e) => e.key === 'Enter' && title.blur();

    // Delete item 
    const del = document.createElement("button");
    del.className = "delete-btn";
    del.innerHTML = '<span class="nf">\uf00d</span>';
    del.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete ${sem.name}?`)) {
            planner.semesters.splice(idx, 1);
            Data.save().then(initDashboard);
        }
    };

    card.append(title, del);

    if (!isEditMode)
        card.onclick = () => openSemester(sem.id);

    addDragListeners(card, 'semester', idx);

    return card;
}

function openSemester(id) {
    planner.activeSemId = id;
    const sem = getActiveCard();
    planner.activeTab = sem.folders[0] || "";
    UI.showView("plannerView");
}

// Table view
// TODO: Restructure code
function initPlanner() {
    const sem = getActiveCard();
    
    if (!sem) 
        return;

    const tabBar = document.getElementById("tabBar");
    const container = document.getElementById("tablesContainer");
    tabBar.innerHTML = ""; 
    
    document.getElementById("plannerView").classList.toggle("edit-mode-on", isEditMode);
    document.getElementById("activeSemesterTitle").textContent = sem.name;
    document.getElementById("startDatePicker").value = sem.startDate || "";
    
    sem.folders.forEach((folder, idx) => {
        const tab = createTab(folder, idx, sem);
        tabBar.appendChild(tab);
    });

    renderSubjectTable(sem, container);
}

function createTab(name, idx, sem) {
    const tab = document.createElement("div");
    tab.className = `tab ${name === planner.activeTab ? 'active' : ''}`;

    const text = document.createElement("span");
    text.textContent = name;
    text.contentEditable = isEditMode;
    text.onblur = () => renameFolder(idx, text.textContent.trim(), sem);

    tab.appendChild(text);

    // Delete Button for Tab
    if (isEditMode) {
        const delFolder = document.createElement("button");
        delFolder.className = "delete-btn-tab";
        delFolder.innerHTML = '<span class="nf">\uf00d</span>';

        delFolder.onclick = (e) => {
            e.stopPropagation();

            if (confirm(`Delete folder "${name}"?`)) {
                // Remove folder name from list
                sem.folders.splice(idx, 1);
                // Clean up subjects and schedule associated with this folder name
                delete sem.subjects[name];
                
                // Reset active tab if we deleted the current one
                if (planner.activeTab === name)
                    planner.activeTab = sem.folders[0] || "";
                
                Data.save().then(initPlanner);
            }
        };

        tab.appendChild(delFolder);
    } else {
        tab.onclick = () => { 
            planner.activeTab = name;
            initPlanner();
        }
    }

    addDragListeners(tab, 'folder', idx);

    return tab;
}

function renameFolder(idx, newName, sem) {
    const oldName = sem.folders[idx];
    if (!newName || newName === oldName) 
        return;
    
    sem.subjects[newName] = sem.subjects[oldName] || [];
    delete sem.subjects[oldName];
    
    Object.keys(sem.schedule).forEach(key => {
        const parts = key.split('-');
        if (parts[1] === oldName) {
            parts[1] = newName;
            sem.schedule[parts.join('-')] = sem.schedule[key];
            delete sem.schedule[key];
        }
    });

    sem.folders[idx] = newName;
    planner.activeTab = newName;

    Data.save().then(initPlanner);
}

// Render table contents
function renderSubjectTable(sem, container) {
    container.innerHTML = "";
    const currentWW = calculateWW(sem.startDate);
    const subs = sem.subjects[planner.activeTab] || [];

    let table = container.querySelector("table");

    if (!table) {
        table = document.createElement("table");
        container.appendChild(table);
    }
    // Table header
    let head = `<thead><tr><th class="col-subject">Subject</th><th class="col-abbr">Abbr.</th>`;
    
    for (let i = 1; i <= WEEKS_COUNT; i++){
        const isCurrentWW = (i === currentWW);
        head += `<th class="${isCurrentWW ? 'current-week-col' : ''}">WW${i}</th>`;
    }
        
    head += `</tr></thead><tbody id="subBody"></tbody>`;
    table.innerHTML = head;

    // Table Cells
    const tbody = table.querySelector("#subBody");
    subs.forEach((sub, sIdx) => {
        const row = document.createElement("tr");

        // First two columns
        row.append(
            createEditableCell(sub.name, "col-subject", (v) => {
                sub.name = v;
                if (v.includes(" "))
                    sub.abbr = v.split(" ")[0].slice(5).toUpperCase();

                Data.save().then(initPlanner);
            }, true, sIdx),
            
            createEditableCell(sub.abbr, "col-abbr", (v) => {
                sub.abbr = v.toUpperCase();

                Data.save();
            })
        );

        // Rest of the table
        for (let w = 1; w <= WEEKS_COUNT; w++) {
            const cellId = `${sem.id}-${planner.activeTab}-${sIdx}-${w}`;

            row.appendChild(createDataCell(cellId, w === currentWW, sem));
        }

        tbody.appendChild(row);
    });

    // Buttons in edit mode
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

            Data.save().then(initPlanner);
        };

        container.appendChild(addBtn);
    }
}

function createEditableCell(text, className, onSave, isSubject = false, sIdx = null) {
    const td = document.createElement("td");
    td.className = className;
    td.textContent = text;
    td.contentEditable = isEditMode;
    td.onblur = () => onSave(td.textContent.trim());
    
    if (isSubject && isEditMode) {
        // Delete row icon in edit mode
        td.onclick = (e) => {
            if (e.offsetX < 30 && confirm("Delete this row?"))
                deleteSubject(sIdx);
        };
    }

    return td;
}

function createDataCell(id, isCurrentWW, sem) {
    const td = document.createElement("td");
    const data = sem.schedule[id] || {text : "", class : "", note : ""};
    
    td.innerHTML = data.text;

    if (data.class) 
        td.className = data.class;

    if (data.note) { 
        td.title = data.note;
        td.classList.add("note-indicator");
    }

    if (isCurrentWW)
        td.classList.add("current-week-col");

    // Shuffle the icons on click
    // TODO: Change for item picker
    td.onclick = () => {
        if (isEditMode) 
            return;

        // Find current icon index by comparing HTML, and then find next
        const currIdx = ICON_SET.findIndex(i => i.html === td.innerHTML);
        const nextIdx = (currIdx + 1) % ICON_SET.length
        const nextIcon = ICON_SET[nextIdx];

        // Copy the info from the old cell
        td.innerHTML = nextIcon.html;
        td.className = nextIcon.class + (isCurrentWW ? " current-week-col" : "") + (td.title ? " note-indicator" : "");

        saveCellState(id, td, sem);
    };

    // Add comment to cell
    td.oncontextmenu = (e) => {
        e.preventDefault();
        if (isEditMode) 
            return;

        const note = prompt("Note:", td.title || "");
        
        if (note !== null) {
            td.title = note;
            note ? td.classList.add("note-indicator") : td.classList.remove("note-indicator");
            saveCellState(id, td, sem);
        }
    };

    return td;
}

function saveCellState(id, el, sem) {
    sem.schedule[id] = {
        text: el.innerHTML,
        class: el.className.replace("current-week-col", "").replace("note-indicator", "").trim(),
        note: el.title };
    Data.save();
}

function calculateWW(start) {
    if (!start) 
        return -1;
    const diff = Math.floor((new Date() - new Date(start)) / (1000*60*60*24*7));

    return (diff >= 0 && diff < WEEKS_COUNT) ? diff + 1 : -1;
}

function deleteSubject(sIdx) {
    const sem = getActiveCard();
    const activeTab = planner.activeTab;

    // Remove the subject from the array
    sem.subjects[activeTab].splice(sIdx, 1);

    // Clean associated schedule IDs
    Object.keys(sem.schedule).forEach(key => {
        if (key.includes(`-${activeTab}-${sIdx}-`)) {
            delete sem.schedule[key];
        }
    });

    Data.save().then(initPlanner);
}

// Move, cards folders, rows
// TODO: Make the rows draggable
function addDragListeners(el, type, idx) {
    el.draggable = isEditMode;

    el.ondragstart = (e) => { 
        if (!isEditMode)
            return e.preventDefault();

        e.dataTransfer.setData("idx", idx); 
        e.dataTransfer.setData("type", type); 
        el.classList.add("dragging"); 
    };

    // Makes droping possible
    el.ondragover = (e) =>
        e.preventDefault();

    // Letting go of the mouse
    el.ondrop = (e) => {
        el.classList.remove("dragging");
        const fromIdx = parseInt(e.dataTransfer.getData("idx"));
        
        if (e.dataTransfer.getData("type") !== type || fromIdx === idx) 
            return;

        const list = (type === 'folder') ? getActiveCard().folders : planner.semesters;
        const [movedItem] = list.splice(fromIdx, 1);
        list.splice(idx, 0, movedItem);

        Data.save().then(type === 'folder' ? initPlanner : initDashboard);
    };
}
