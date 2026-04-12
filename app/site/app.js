const datasetStatus = document.querySelector("#dataset-status");

async function checkLocalDataset() {
  if (!datasetStatus) {
    return;
  }

  try {
    const response = await fetch("/content/new_crown1/content.json", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    datasetStatus.textContent =
      `Local package detected: ${data.content.id} ` +
      `(${data.unit_count} units, ${data.part_count} parts, ${data.item_count} items).`;
    datasetStatus.dataset.state = "ok";
  } catch (_error) {
    datasetStatus.textContent =
      "No local content package detected at /content/new_crown1/content.json.";
    datasetStatus.dataset.state = "missing";
  }
}

checkLocalDataset();
