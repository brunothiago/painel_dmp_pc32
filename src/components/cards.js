function createNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = text;
  return node;
}

export function metricGrid(metrics) {
  const grid = createNode("div", "metrics-grid");
  for (const metric of metrics) grid.append(metricCard(metric));
  return grid;
}

export function metricCard({label, value, detail, tone = "default"}) {
  const card = createNode("article", `metric-card tone-${tone}`);
  const labelNode = createNode("p", "metric-label", label);
  const valueRow = createNode("div", "metric-value-row");
  const valueNode = createNode("strong", "metric-value", value);
  valueRow.append(valueNode);
  card.append(labelNode, valueRow);
  if (detail) card.append(createNode("p", "metric-detail", detail));
  return card;
}
