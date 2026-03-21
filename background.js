messenger.action.onClicked.addListener(async () => {
  // Check if a planner tab is already open to avoid duplicates
  let tabs = await messenger.tabs.query({ url: messenger.runtime.getURL("front.html") });
  
  if (tabs.length > 0) {
    messenger.tabs.update(tabs[0].id, { active: true });
  } else {
    messenger.tabs.create({
      url: "front.html",
      active: true
    });
  }
});
