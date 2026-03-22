messenger.action.onClicked.addListener(async () => {
  const url = messenger.runtime.getURL("front.html");
  let [existingTab] = await messenger.tabs.query({ url });
  
  if (existingTab) {
    messenger.tabs.update(existingTab.id, { active: true });
  } else {
    messenger.tabs.create({ url, active: true });
  }
});
