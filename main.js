/*
 *  main.js   v1-alpha.0.0
 * 
 *  Managment for TB addon.
 * 
 *  matmoj04    3.2025
 */

const messenger = window.messenger || window.browser;

let planner = { semesters: [], activeSemId: null, activeTab: null };
let isEditMode = false;

const Data = {
    async load() {
        try {
            const storedData = await messenger.storage.local.get("plannerJSON");
            if (storedData.plannerJSON) planner = storedData.plannerJSON;
        } 
        catch(e) { console.error("Storage failed:", e); } 
    },

    async save() {
        try {
            await messenger.storage.local.set({ plannerJSON: planner });
        } 
        catch (e) { console.error("Save failed:", e); }
    }
}

// TODO: Probably move the back button here
const UI = {
    showView(viewId) {
        isEditMode = false;
        
        document.querySelectorAll('.edit-active').forEach(btn => btn.classList.remove('edit-active'));
        document.querySelectorAll('.view-container').forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');

        if (viewId === "dashboardView") initDashboard();
        if (viewId === "plannerView") initPlanner();
    },

    toggleEdit(btnElement, refreshCallback) {
        isEditMode = !isEditMode;
        btnElement.classList.toggle("edit-active", isEditMode);
        refreshCallback();
    }
}

// TODO: Remove
const legendHeader = document.querySelector('.legend-header');
if (legendHeader) {
    legendHeader.addEventListener('click', () => {
        document.getElementById("legendContent").classList.toggle("hidden");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await Data.load().then(initDashboard);

    // Data export, import
    // TODO: Change style of mouse when over icon
    document.getElementById("exportBtn").onclick = () => {
        if (isEditMode)
            return;

        const blob = new Blob([JSON.stringify(planner, null, 2)], {type : 'application/json'});
        const a = document.createElement('a');

        a.href = URL.createObjectURL(blob);
        a.download = `backup_${Date.now()}.json`;
        a.click();
    };

    document.getElementById("importBtn").onclick = () => 
        !isEditMode &&  document.getElementById("importFile").click();

    document.getElementById("importFile").onchange = (e) => {
        const reader = new FileReader();
        const file = e.target.files[0];

        if (!file) 
            return;

        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result, (key, value) => {
                    return (typeof value === 'string') ? value.trim() : value;
                });

                if (importedData.semesters) {
                    planner.semesters = [...planner.semesters, ...importedData.semesters.filter(ns => !planner.semesters.some(es => es.id === ns.id))];
                    await Data.save().then(initDashboard);
                }
            } 
            catch (e) { alert("Error reading file: " + e.message); }
        };

        reader.readAsText(file);
    };

    // Edit buttons
    // TODO: this can probably be writen in a different way
    document.getElementById("editDashBtn").onclick = (e) => 
        UI.toggleEdit(e.currentTarget, initDashboard);

    document.getElementById("editPlannerBtn").onclick = (e) => {
        isEditMode = !isEditMode;
        e.currentTarget.classList.toggle("edit-active", isEditMode);
        
        // allows the CSS hover effects to work
        document.getElementById("plannerView").classList.toggle("edit-active-planner", isEditMode);
        
        initPlanner();
    };

    // Backspace
    document.getElementById("backToDash").onclick = () => 
        UI.showView("dashboardView");

    // Planner
    document.getElementById("newFolder").onclick = () => {
        const sem = getActiveCard();
        const name = "New Folder";

        sem.folders.push(name);
        planner.activeTab = name;

        Data.save().then(initPlanner); 
    };

    document.getElementById("startDatePicker").onchange = (e) => {
        getActiveCard().startDate = e.target.value;
        Data.save().then(initPlanner);
    };

    document.getElementById("legendToggle").onclick = () => 
        document.getElementById("legendContent").classList.toggle("hidden");
});

function getActiveCard() {
    return planner.semesters.find(s => s.id === planner.activeSemId);
}
