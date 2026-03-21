/*
 *  main.js   v1-alpha.0.0
 * 
 *  Managment for TB addon.
 * 
 *  matmoj04    3.2025
 */

const messenger = window.messenger || window.browser;

async function loadState() {
    try {
        const stored = await messenger.storage.local.get("plannerJSON");
        if (stored.plannerJSON)
            planner = stored.plannerJSON;
    } catch (e) {
        console.error("Storage failed:", e);
    }
}

async function saveState() {
    try {
        await messenger.storage.local.set({ plannerJSON: planner });
    } catch (e) {
        console.error("Save failed:", e);
    }
}

// Helper functions
function toggleEdit(btnElement, refreshCallback) {
    isEditMode = !isEditMode;
    btnElement.classList.toggle("edit-active", isEditMode);
    refreshCallback();
}

function showView(viewId) {
    isEditMode = false;
    
    document.querySelectorAll('.edit-active').forEach(btn => btn.classList.remove('edit-active'));

    document.querySelectorAll('.view-container').forEach(view => view.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    if (viewId === "dashboardView") renderDashboard();
    if (viewId === "plannerView") initPlanner();
}

function getActiveSemester() {
    return planner.semesters.find(s => s.id === planner.activeSemId);
}

// Buttons
document.addEventListener("DOMContentLoaded", async () => {
    await loadState();
    renderDashboard();

    // Data export, import
    // TODO: Change style of mouse when over icon
    document.getElementById("exportBtn").onclick = async () => {
        if (isEditMode)
            return;

        const data = await messenger.storage.local.get("plannerJSON");
        const blob = new Blob([JSON.stringify(data.plannerJSON, null, 2)], {type : 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `backup_${Date.now().toString()}.json`;

        a.click();
    };

    document.getElementById("importBtn").onclick = () =>{ 
        if (isEditMode)
            return;

        document.getElementById("importFile").click();
    };

    document.getElementById("importFile").onchange = (e) => {
        const file = e.target.files[0];

        if (!file) 
            return;

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result, (key, value) => {
                    return (typeof value === 'string') ? value.trim() : value;
                });
                
                if (importedData.semesters && Array.isArray(importedData.semesters)) {
                    let addedCount = 0;
                    let skippedCount = 0;

                    importedData.semesters.forEach(newSem => {
                        const exists = planner.semesters.some(existingSem => existingSem.id === newSem.id);
                        
                        if (!exists) {
                            planner.semesters.push(newSem);
                            addedCount++;
                        } else {
                            skippedCount++;
                        }
                    });

                    await saveState();
                    renderDashboard();
                    
                    alert(`Import Complete!\nAdded: ${addedCount} new semesters\nSkipped: ${skippedCount} duplicates`);
                } else {
                    alert("Invalid backup file format.");
                }
            } catch (err) {
                alert("Error reading file: " + err.message);
            }
            e.target.value = ""; 
        };
        
        reader.readAsText(file);
    };

    // Edit buttons
    document.getElementById("editDashBtn").onclick = (e) => toggleEdit(e.currentTarget, renderDashboard);

    document.getElementById("editPlannerBtn").onclick = (e) => {
        isEditMode = !isEditMode;
        e.currentTarget.classList.toggle("edit-active", isEditMode);
        
        // This allows the CSS hover effects to work
        document.getElementById("plannerView").classList.toggle("edit-active-planner", isEditMode);
        
        initPlanner();
    };

    // Backspace
    document.getElementById("backToDash").onclick = () => showView("dashboardView");

    // Planner
    document.getElementById("newFolder").onclick = () => {
        const sem = getActiveSemester();
        const name = "New Folder";

        sem.folders.push(name);

        planner.activeTab = name;

        saveState(); 
        initPlanner();
    };

    document.getElementById("startDatePicker").onchange = (e) => {
        getActiveSemester().startDate = e.target.value;
        saveState();
        initPlanner(); 
    };
});