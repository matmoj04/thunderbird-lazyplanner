/*
 *  main.js   v1-alpha.0.0
 * 
 *  Managment for TB addon.
 * 
 *  matmoj04    3.2025
 */

const chrome = window.chrome || window.browser;

async function loadState() {
    try {
        const stored = await chrome.storage.local.get("plannerJSON");
        if (stored.plannerJSON)
            planner = stored.plannerJSON;
    } catch (e) {
        console.error("Storage failed:", e);
    }
}

async function saveState() {
    try {
        await chrome.storage.local.set({ plannerJSON: planner });
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

        const data = await chrome.storage.local.get("plannerJSON");
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
                const importedData = JSON.parse(event.target.result);
                
                // If it has the cards and if its an array
                if (importedData.semesters && Array.isArray(importedData.semesters)) {
                    let addedCount = 0;
                    let skippedCount = 0;

                    importedData.semesters.forEach(newSem => {
                        // Check if a semester with this ID already exists in our current planner
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
            // Reset the input so you can import the same file again if needed
            e.target.value = ""; 
        };
        
        reader.readAsText(file);
    };

    // Edit buttons
    document.getElementById("editDashBtn").onclick = (e) => toggleEdit(e.currentTarget, renderDashboard);

    document.getElementById("editPlannerBtn").onclick = (e) => toggleEdit(e.currentTarget, initPlanner);

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