/**
 * DAG Visualization Module
 * Extracted from app.js for maintainability
 */

let _state = null;
let _escapeHtml = null;

/**
 * Initialize DAG module with shared dependencies
 * @param {Object} state - Shared application state
 * @param {Function} escapeHtmlFn - HTML escape utility
 */
export function initDAGModule(state, escapeHtmlFn) {
    _state = state;
    _escapeHtml = escapeHtmlFn;
}

/**
 * Compute layer for each node (topological sort based on dependencies)
 * @param {Object} nodes - Nodes object with depends_on arrays
 * @returns {Object} - Map of nodeId to layer number
 */
export function computeLayers(nodes) {
    const layers = {};
    const memo = {};

    const computeLayer = (nodeId) => {
        if (memo[nodeId] !== undefined) return memo[nodeId];

        const node = nodes[nodeId];
        if (!node || !node.depends_on || node.depends_on.length === 0) {
            memo[nodeId] = 0;
            return 0;
        }

        const maxDepLayer = Math.max(
            ...node.depends_on.map((d) => (nodes[d] ? computeLayer(d) : -1)),
        );

        memo[nodeId] = maxDepLayer + 1;
        return maxDepLayer + 1;
    };

    Object.keys(nodes).forEach((id) => {
        layers[id] = computeLayer(id);
    });

    return layers;
}

/**
 * Compute DAG layout using layered layout algorithm
 * @param {Object} nodes - Nodes object
 * @param {Object} options - Layout options
 * @returns {Object} - Positioned nodes
 */
export function computeDAGLayout(nodes, options = {}) {
    const {
        nodeWidth = 220,
        nodeHeight = 90,
        horizontalGap = 80,
        verticalGap = 20,
    } = options;

    const layers = computeLayers(nodes);

    const layerMap = {};
    Object.entries(nodes).forEach(([id, node]) => {
        const layer = layers[id] || 0;
        if (!layerMap[layer]) layerMap[layer] = [];
        layerMap[layer].push({ id, ...node });
    });

    const positionedNodes = {};
    const layerCount = Object.keys(layerMap).length;

    Object.entries(layerMap).forEach(([layerIdx, nodesAtLayer]) => {
        const layer = parseInt(layerIdx);
        const x = layer * (nodeWidth + horizontalGap) + 40;

        const totalHeight =
            nodesAtLayer.length * nodeHeight +
            (nodesAtLayer.length - 1) * verticalGap;
        const maxLayerHeight =
            layerCount * nodeHeight + (layerCount - 1) * verticalGap;
        const startY = (maxLayerHeight - totalHeight) / 2 + 20;

        nodesAtLayer.forEach((node, index) => {
            positionedNodes[node.id] = {
                ...node,
                x,
                y: startY + index * (nodeHeight + verticalGap),
                layer,
                rank: index,
            };
        });
    });

    return positionedNodes;
}

/**
 * Build edges from nodes' depends_on field
 * @param {Object} nodes - Original nodes
 * @param {Object} positionedNodes - Positioned nodes
 * @returns {Array} - Edge arrays with coordinates
 */
export function buildEdgesFromNodes(nodes, positionedNodes) {
    const edges = [];
    const nodeWidth = 220;
    const nodeHeight = 90;

    Object.entries(nodes).forEach(([id, node]) => {
        const deps = node.depends_on || [];
        deps.forEach((depId) => {
            if (positionedNodes[depId] && positionedNodes[id]) {
                const fromNode = positionedNodes[depId];
                const toNode = positionedNodes[id];
                edges.push({
                    from: depId,
                    to: id,
                    fromX: fromNode.x + nodeWidth,
                    fromY: fromNode.y + nodeHeight / 2,
                    toX: toNode.x,
                    toY: toNode.y + nodeHeight / 2,
                });
            }
        });
    });

    return edges;
}

/**
 * Compute serial layout for steps without DAG dependencies
 * @param {Array} steps - Steps array
 * @param {Object} options - Layout options
 * @returns {Object} - Positioned nodes and edges
 */
export function computeSerialLayout(steps, options = {}) {
    const { nodeWidth = 220, nodeHeight = 90, verticalGap = 20 } = options;

    const nodes = {};
    const edges = [];

    steps.forEach((step, index) => {
        const id = step.step_id || `step_${index + 1}`;
        nodes[id] = {
            ...step,
            x: 40,
            y: index * (nodeHeight + verticalGap) + 20,
            layer: 0,
            rank: index,
        };

        if (index > 0) {
            const prevId = steps[index - 1].step_id || `step_${index}`;
            edges.push({
                from: prevId,
                to: id,
                fromX: 40 + nodeWidth,
                fromY:
                    (index - 1) * (nodeHeight + verticalGap) +
                    20 +
                    nodeHeight / 2,
                toX: 40,
                toY: index * (nodeHeight + verticalGap) + 20 + nodeHeight / 2,
            });
        }
    });

    return { nodes, edges };
}

/**
 * Generate edge path using bezier curve
 * @param {Object} edge - Edge with coordinates
 * @returns {string} - SVG path string
 */
export function generateEdgePath(edge) {
    const { fromX, fromY, toX, toY } = edge;
    const deltaX = toX - fromX;
    const controlOffset = Math.min(Math.abs(deltaX) / 2, 80);

    return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;
}

/**
 * Render node as SVG group
 * @param {Object} node - Node with position and data
 * @returns {string} - SVG group string
 */
export function renderNodeSVG(node, status = "pending") {
    const { id, x, y, goal, skill, depends_on = [], success_criteria } = node;
    const width = 220;
    const height = 90;

    const displayGoal =
        goal?.length > 35 ? goal.substring(0, 32) + "..." : goal || "";
    const displaySkill = skill || "";

    const statusClass = status === "completed" ? "completed" : status === "running" ? "running" : "";
    const statusIcon = status === "completed" ? "✓" : status === "running" ? "⟳" : "";

    const nodeData = encodeURIComponent(
        JSON.stringify({
            id,
            goal: goal || "",
            skill: displaySkill,
            depends_on,
            success_criteria: success_criteria || "",
            status,
        }),
    );

    return `<g class="dag-node" data-id="${_escapeHtml(id)}" data-node="${nodeData}" transform="translate(${x}, ${y})">
    <rect class="dag-node-bg ${statusClass}" x="0" y="0" width="${width}" height="${height}" rx="8"/>
    <text class="dag-node-id" x="12" y="22" fill="#fbbf24" font-size="12" font-weight="600">${_escapeHtml(id)}</text>
    <text class="dag-node-goal" x="12" y="48" fill="#e5e5e5" font-size="13">${_escapeHtml(displayGoal)}</text>
    ${displaySkill ? `<text class="dag-node-skill" x="12" y="72" fill="#a78bfa" font-size="11">${_escapeHtml(displaySkill)}</text>` : ""}
    ${statusIcon ? `<text class="dag-node-status" x="200" y="20" fill="${status === "completed" ? "#22c55e" : "#3b82f6"}" font-size="16" font-weight="bold">${statusIcon}</text>` : ""}
  </g>`;
}

/**
 * Generate SVG with nodes and edges
 * @param {Object} nodes - Positioned nodes
 * @param {Array} edges - Edge arrays
 * @param {Object} options - Layout options
 * @param {Object} nodeStatuses - Node status map { stepId: status }
 * @returns {string} - SVG string
 */
export function generateSVG(nodes, edges, options, nodeStatuses = {}) {
    const { nodeWidth = 220, nodeHeight = 90 } = options;

    const nodeValues = Object.values(nodes);
    if (nodeValues.length === 0) {
        return '<div class="empty-plan">No nodes to display</div>';
    }

    const maxX = Math.max(...nodeValues.map((n) => n.x)) + nodeWidth + 40;
    const maxY = Math.max(...nodeValues.map((n) => n.y)) + nodeHeight + 40;

    let svg = `<svg class="dag-svg" width="${maxX}" height="${maxY}" style="display:block;">
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#525252"/>
      </marker>
    </defs>`;

    edges.forEach((edge) => {
        const path = generateEdgePath(edge);
        svg += `<path class="dag-edge" d="${path}" marker-end="url(#arrowhead)"/>`;
    });

    nodeValues.forEach((node) => {
        const status = nodeStatuses[node.id] || "pending";
        svg += renderNodeSVG(node, status);
    });

    svg += "</svg>";
    return svg;
}

/**
 * Calculate DAG bounding box and optimal scale to fit container
 * @param {Object} nodes - Positioned nodes
 * @param {number} containerWidth - Container width
 * @param {number} containerHeight - Container height
 * @returns {Object} - { width, height, scale, x, y }
 */
export function calculateDAGScale(nodes, containerWidth, containerHeight) {
    const nodeValues = Object.values(nodes);
    if (nodeValues.length === 0) {
        return { width: containerWidth, height: containerHeight, scale: 1, x: 0, y: 0 };
    }

    const nodeWidth = 220;
    const nodeHeight = 90;
    const padding = 40;

    const dagWidth = Math.max(...nodeValues.map((n) => n.x)) + nodeWidth + padding * 2;
    const dagHeight = Math.max(...nodeValues.map((n) => n.y)) + nodeHeight + padding * 2;

    const scaleX = (containerWidth - padding * 2) / dagWidth;
    const scaleY = (containerHeight - padding * 2) / dagHeight;
    const scale = Math.min(scaleX, scaleY);

    return {
        width: dagWidth,
        height: dagHeight,
        scale: Math.max(scale, 0.1),
        x: (containerWidth - dagWidth * scale) / 2,
        y: (containerHeight - dagHeight * scale) / 2,
    };
}

/**
 * Generate SVG with scaling transform for mini map display
 * @param {Object} nodes - Positioned nodes
 * @param {Array} edges - Edge arrays
 * @param {Object} nodeStatuses - Node status map
 * @param {number} containerWidth - Container width for scaling
 * @param {number} containerHeight - Container height for scaling
 * @returns {string} - HTML string with scaled SVG
 */
export function generateScaledSVG(nodes, edges, nodeStatuses, containerWidth, containerHeight) {
    const scaleInfo = calculateDAGScale(nodes, containerWidth, containerHeight);
    const svgContent = generateSVG(nodes, edges, {}, nodeStatuses);

    const svgMatch = svgContent.match(/<svg[^>]*>/);
    if (!svgMatch) return svgContent;

    const svgTag = svgMatch[0];
    const newSvgTag = `<svg class="dag-svg" width="${containerWidth}" height="${containerHeight}" viewBox="0 0 ${scaleInfo.width} ${scaleInfo.height}" style="display:block;">`;

    return svgContent.replace(svgTag, newSvgTag);
}

/**
 * Render DAG visualization
 * @param {Object} log - Plan log with steps/nodes/edges
 * @returns {string} - HTML string
 */
export function renderDAGVisualization(log) {
    const steps = log.steps || [];
    const nodes = log.nodes || {};

    const hasDAG = Object.keys(nodes).length > 0;
    const isSerial = steps.length > 0 && !hasDAG;

    let positionedNodes, layoutEdges;

    if (hasDAG) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            horizontalGap: 80,
            verticalGap: 20,
        };
        positionedNodes = computeDAGLayout(nodes, layoutOptions);
        layoutEdges = buildEdgesFromNodes(nodes, positionedNodes);
    } else if (isSerial) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            verticalGap: 20,
        };
        const layout = computeSerialLayout(steps, layoutOptions);
        positionedNodes = layout.nodes;
        layoutEdges = layout.edges;
    }

    if (!positionedNodes || Object.keys(positionedNodes).length === 0) {
        return '<div class="empty-plan">No plan to display</div>';
    }

    _state.dagData = { nodes, steps };
    _state.dagPositionedNodes = positionedNodes;
    _state.dagLayoutEdges = layoutEdges;
    _state.dagFloatingVisible = true;

    const nodeValues = Object.values(positionedNodes);
    const nodeWidth = 220, nodeHeight = 90;
    const maxCol = Math.max(...nodeValues.map((n) => n.layer || 0)) + 1;
    const maxRow = Math.max(...nodeValues.map((n) => {
        const layerNodes = nodeValues.filter(nd => (nd.layer || 0) === (n.layer || 0));
        return layerNodes.indexOf(n);
    }), 0) + 1;

    const dagWidth = maxCol * nodeWidth + (maxCol - 1) * 80 + 80;
    const dagHeight = maxRow * nodeHeight + (maxRow - 1) * 20 + 80;

    const containerWidth = 600;
    const scale = Math.min(1, containerWidth / dagWidth);

    const scaledSvg = generateScaledSVG(positionedNodes, layoutEdges, _state.dagNodeStatuses, containerWidth, dagHeight);

    return `<div class="dag-container" onclick="showDAGPreview()" data-dag-svg='${encodeURIComponent(generateSVG(positionedNodes, layoutEdges, {}, _state.dagNodeStatuses))}'>
    <div class="dag-scroll-area" style="overflow: hidden;">
      ${scaledSvg}
    </div>
  </div>`;
}

/**
 * Render floating DAG container (always visible after plan is generated)
 * @param {Object} positionedNodes - Positioned nodes
 * @param {Array} layoutEdges - Layout edges
 * @returns {string} - HTML string
 */
export function renderDAGFloatingContainer(positionedNodes, layoutEdges) {
    const floatingWidth = 400;
    const floatingHeight = 230;
    const svg = generateScaledSVG(positionedNodes, layoutEdges, _state.dagNodeStatuses, floatingWidth, floatingHeight);
    const collapsedClass = _state.dagCollapsed ? "collapsed" : "";
    const collapseIcon = _state.dagCollapsed ? "▶" : "▼";
    const collapseTitle = _state.dagCollapsed ? "Expand" : "Collapse";
    const stepCount = Object.keys(positionedNodes).length;
    const completedCount = Object.values(_state.dagNodeStatuses).filter(s => s === "completed").length;

    return `<div class="dag-floating-container" id="dag-floating" onclick="showDAGPreview()">
    <div class="dag-floating-header">
      <span>📋 Execution Plan (${completedCount}/${stepCount} completed)</span>
      <div class="dag-floating-controls">
        <button class="dag-floating-collapse-btn" onclick="toggleDAGCollapse(); event.stopPropagation();" title="${collapseTitle}">${collapseIcon}</button>
      </div>
    </div>
    <div class="dag-floating-body ${collapsedClass}">
      <div class="dag-floating-viewport">
        <div class="dag-floating-canvas">
          ${svg}
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * Create DAG viewport HTML with transform support (legacy, kept for compatibility)
 * @param {string} svgContent - SVG string
 * @param {Object} transform - Transform state {x, y, scale}
 * @returns {string} - HTML string
 */
export function createDAGViewport(svgContent, transform) {
    return `<div class="dag-viewport" data-transform='${JSON.stringify(transform)}'>
    <div class="dag-canvas" style="transform: translate(${transform.x}px, ${transform.y}px) scale(${transform.scale});">
        ${svgContent}
    </div>
</div>`;
}

/**
 * Show DAG preview in modal with Canvas renderer
 */
export function showDAGPreview() {
    if (!_state.dagPositionedNodes || !_state.dagLayoutEdges) {
        return;
    }

    const existingOverlay = document.querySelector(".dag-preview-overlay");
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const transform = _state.dagViewTransform || { x: 0, y: 0, scale: 1 };

    const overlay = document.createElement("div");
    overlay.className = "dag-preview-overlay";
    overlay.innerHTML = `
    <div class="dag-preview-modal">
      <div class="dag-preview-toolbar">
        <button class="dag-toolbar-btn" data-action="zoom-in" title="放大">+</button>
        <button class="dag-toolbar-btn" data-action="zoom-out" title="缩小">−</button>
        <button class="dag-toolbar-btn" data-action="fit" title="适应窗口">⊡</button>
        <button class="dag-toolbar-btn" data-action="reset" title="重置">⟲</button>
        <span class="dag-zoom-level">${Math.round(transform.scale * 100)}%</span>
      </div>
      <div class="dag-preview-viewport-wrapper">
        <div class="dag-canvas-container">
          <canvas class="dag-canvas-el"></canvas>
        </div>
      </div>
      <button class="dag-preview-close">&times;</button>
    </div>
  `;
    document.body.appendChild(overlay);

    const canvasEl = overlay.querySelector('.dag-canvas-el');

    // Dynamically import and create Canvas renderer
    import('./dag-canvas.js').then(({ DAGCanvasRenderer }) => {
        const renderer = new DAGCanvasRenderer(
            canvasEl,
            _state.dagPositionedNodes,
            _state.dagLayoutEdges,
            { ..._state.dagNodeStatuses }
        );

        _state.dagCanvasRenderer = renderer;

        // Set initial transform
        renderer.setTransform(transform);

        // Auto-fit to window
        renderer.fitToWindow();

        // Zoom level display update
        const zoomLevelEl = overlay.querySelector('.dag-zoom-level');
        renderer.onZoomChange = (t) => {
            zoomLevelEl.textContent = Math.round(t.scale * 100) + '%';
        };

        // Toolbar button handlers
        overlay.querySelectorAll('.dag-toolbar-btn').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action;
                switch(action) {
                    case 'zoom-in': renderer.zoomIn(); break;
                    case 'zoom-out': renderer.zoomOut(); break;
                    case 'fit': renderer.fitToWindow(); break;
                    case 'reset': renderer.reset(); break;
                }
            };
        });

        // Node click handler
        renderer.onNodeClick((node) => {
            showNodeDetail(node);
        });
    });

    const saveAndClose = () => {
        if (_state.dagCanvasRenderer) {
            _state.dagViewTransform = _state.dagCanvasRenderer.getTransform();
            _state.dagCanvasRenderer.destroy();
            _state.dagCanvasRenderer = null;
        }
        overlay.remove();
    };

    overlay.querySelector(".dag-preview-close").onclick = saveAndClose;
    overlay.onclick = (e) => {
        if (e.target === overlay) saveAndClose();
    };
}

/**
 * Show node detail modal
 * @param {Object} node - Node data
 */
function showNodeDetail(node) {
    const overlay = document.createElement("div");
    overlay.className = "dag-preview-overlay";
    overlay.innerHTML = `
    <div class="dag-node-modal">
      <button class="dag-preview-close">&times;</button>
      <div class="dag-node-detail">
        <div class="dag-node-detail-header">
          <span class="dag-node-detail-id">${_escapeHtml(node.id)}</span>
          <span class="dag-node-detail-skill">${_escapeHtml(node.skill || '')}</span>
        </div>
        <div class="dag-node-detail-section">
          <div class="dag-node-detail-label">Goal</div>
          <div class="dag-node-detail-content">${_escapeHtml(node.goal || '')}</div>
        </div>
        ${(node.depends_on || []).length > 0 ? `
        <div class="dag-node-detail-section">
          <div class="dag-node-detail-label">Dependencies</div>
          <div class="dag-node-detail-content">${(node.depends_on || []).map(d => _escapeHtml(d)).join(", ")}</div>
        </div>` : ""}
        ${node.success_criteria ? `
        <div class="dag-node-detail-section">
          <div class="dag-node-detail-label">Success Criteria</div>
          <div class="dag-node-detail-content">${_escapeHtml(node.success_criteria)}</div>
        </div>` : ""}
      </div>
    </div>
  `;
    document.body.appendChild(overlay);

    overlay.querySelector(".dag-preview-close").onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

/**
 * Initialize DAG interaction handlers
 */
export function initDAGInteractions() {
    const existingOverlay = document.querySelector(".dag-preview-overlay");
    if (existingOverlay) {
        existingOverlay.remove();
    }

    document.querySelectorAll(".dag-preview-btn").forEach((btn) => {
        btn.onclick = () => {
            let svgContent;
            if (!_state.dagPositionedNodes || !_state.dagLayoutEdges) {
                const container = btn.closest(".dag-container");
                const svgData = container?.dataset.dagSvg;
                if (!svgData) return;
                svgContent = decodeURIComponent(svgData);
            } else {
                svgContent = generateSVG(_state.dagPositionedNodes, _state.dagLayoutEdges, {}, _state.dagNodeStatuses);
            }

            const overlay = document.createElement("div");
            overlay.className = "dag-preview-overlay";
            overlay.innerHTML = `
        <div class="dag-preview-modal">
          <button class="dag-preview-close">&times;</button>
          ${svgContent}
        </div>
      `;
            document.body.appendChild(overlay);

            const svg = overlay.querySelector(".dag-svg");
            if (svg) {
                svg.classList.add("dag-preview-svg");
                const viewBox = svg.viewBox.baseVal;
                if (viewBox.width && viewBox.height) {
                    const aspect = viewBox.width / viewBox.height;
                    if (aspect > 1) {
                        svg.style.width = "80vw";
                        svg.style.height = "auto";
                    } else {
                        svg.style.height = "80vh";
                        svg.style.width = "auto";
                    }
                }
            }

            initDAGNodeClick(overlay);

            overlay.querySelector(".dag-preview-close").onclick = () =>
                overlay.remove();
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.remove();
            };
        };
    });

    initDAGNodeClick(document);
}

/**
 * Initialize DAG node click handlers
 * @param {Element|Document} parent - Parent element to search for nodes
 */
export function initDAGNodeClick(parent) {
    parent.querySelectorAll(".dag-node").forEach((node) => {
        node.style.cursor = "pointer";
        node.onclick = (e) => {
            e.stopPropagation();
            const nodeData = node.dataset.node;
            if (!nodeData) return;

            const data = JSON.parse(decodeURIComponent(nodeData));

            const overlay = document.createElement("div");
            overlay.className = "dag-preview-overlay";
            overlay.innerHTML = `
        <div class="dag-node-modal">
          <button class="dag-preview-close">&times;</button>
          <div class="dag-node-detail">
            <div class="dag-node-detail-header">
              <span class="dag-node-detail-id">${_escapeHtml(data.id)}</span>
              <span class="dag-node-detail-skill">${_escapeHtml(data.skill)}</span>
            </div>
            <div class="dag-node-detail-section">
              <div class="dag-node-detail-label">Goal</div>
              <div class="dag-node-detail-content">${_escapeHtml(data.goal)}</div>
            </div>
            ${
                data.depends_on.length > 0
                    ? `
              <div class="dag-node-detail-section">
                <div class="dag-node-detail-label">Dependencies</div>
                <div class="dag-node-detail-content">${data.depends_on.map((d) => _escapeHtml(d)).join(", ")}</div>
              </div>
            `
                    : ""
            }
            ${
                data.success_criteria
                    ? `
              <div class="dag-node-detail-section">
                <div class="dag-node-detail-label">Success Criteria</div>
                <div class="dag-node-detail-content">${_escapeHtml(data.success_criteria)}</div>
              </div>
            `
                    : ""
            }
          </div>
        </div>
      `;
            document.body.appendChild(overlay);

            overlay.querySelector(".dag-preview-close").onclick = () =>
                overlay.remove();
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.remove();
            };
        };
    });
}

/**
 * Add floating DAG container to page
 */
export function addFloatingDAGContainer() {
    const existing = document.getElementById("dag-floating");
    if (existing) {
        existing.remove();
    }

    if (!_state.dagFloatingVisible || !_state.dagPositionedNodes || !_state.dagLayoutEdges) {
        return;
    }

    const floatingHtml = renderDAGFloatingContainer(_state.dagPositionedNodes, _state.dagLayoutEdges);

    const messageList = document.getElementById("message-list");
    if (messageList) {
        const wrapper = document.createElement("div");
        wrapper.id = "dag-floating-wrapper";
        wrapper.innerHTML = floatingHtml;
        wrapper.style.cssText = "position: fixed; right: 0; bottom: 0; z-index: 999; pointer-events: none;";
        wrapper.querySelector(".dag-floating-container").style.pointerEvents = "auto";
        document.body.appendChild(wrapper);
    }
}

/**
 * Toggle DAG floating container collapse
 */
export function toggleDAGCollapse() {
    _state.dagCollapsed = !_state.dagCollapsed;
    const container = document.getElementById("dag-floating");
    if (container) {
        const body = container.querySelector(".dag-floating-body");
        const btn = container.querySelector(".dag-floating-collapse-btn");
        if (_state.dagCollapsed) {
            body.classList.add("collapsed");
            btn.textContent = "▶";
            btn.title = "Expand";
        } else {
            body.classList.remove("collapsed");
            btn.textContent = "▼";
            btn.title = "Collapse";
        }
    }
}

/**
 * Restore DAG from workflow logs (for page refresh or workspace switch)
 * @param {Array} logs - Workflow logs
 */
export function restoreDAGFromLogs(logs) {
    const planLog = logs.find((log) => log.type === "plan_generated");
    if (!planLog) {
        return;
    }

    const steps = planLog.steps || [];
    const nodes = planLog.nodes || {};

    const hasDAG = Object.keys(nodes).length > 0;
    const isSerial = steps.length > 0 && !hasDAG;

    let positionedNodes, layoutEdges;

    if (hasDAG) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            horizontalGap: 80,
            verticalGap: 20,
        };
        positionedNodes = computeDAGLayout(nodes, layoutOptions);
        layoutEdges = buildEdgesFromNodes(nodes, positionedNodes);
    } else if (isSerial) {
        const layoutOptions = {
            nodeWidth: 220,
            nodeHeight: 90,
            verticalGap: 20,
        };
        const layout = computeSerialLayout(steps, layoutOptions);
        positionedNodes = layout.nodes;
        layoutEdges = layout.edges;
    }

    if (!positionedNodes || Object.keys(positionedNodes).length === 0) {
        return;
    }

    _state.dagData = { nodes, steps };
    _state.dagPositionedNodes = positionedNodes;
    _state.dagLayoutEdges = layoutEdges;
    _state.dagFloatingVisible = true;

    const convertStepNameToNodeId = (stepName) => {
        if (!stepName) return null;
        if (stepName.startsWith("step_")) {
            return stepName;
        }
        const match = stepName.match(/^Step\s+(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10) + 1;
            return `step_${num}`;
        }
        return stepName;
    };

    const nodeStatuses = {};
    const completedSteps = logs.filter((log) => log.type === "step_completed");
    const startedSteps = logs.filter((log) => log.type === "step_started");
    const currentStepLog = logs.find((log) => log.type === "step_started");

    completedSteps.forEach((log) => {
        const stepId = log.step_id || log.stepName || log.step_name;
        const nodeId = convertStepNameToNodeId(stepId);
        if (nodeId) {
            nodeStatuses[nodeId] = "completed";
        }
    });

    const currentStepId = currentStepLog?.step_id || currentStepLog?.stepName || currentStepLog?.step_name;
    const currentNodeId = convertStepNameToNodeId(currentStepId);
    const currentStepCompleted = completedSteps.some((c) => {
        const cStepId = c.step_id || c.stepName || c.step_name;
        return convertStepNameToNodeId(cStepId) === currentNodeId;
    });
    if (currentStepLog && currentNodeId && !currentStepCompleted) {
        nodeStatuses[currentNodeId] = "running";
    }

    _state.dagNodeStatuses = nodeStatuses;
}

/**
 * Convert step name to node ID format
 * @param {string} name - Step name
 * @returns {string|null} - Node ID
 */
function convertStepNameToNodeId(name) {
    if (!name) return null;
    if (name.startsWith("step_")) {
        return name;
    }
    const match = name.match(/^Step\s+(\d+)$/i);
    if (match) {
        const num = parseInt(match[1], 10) + 1;
        return `step_${num}`;
    }
    return name;
}

/**
 * Update DAG node status and re-render
 * @param {string} stepName - Step ID
 * @param {string} status - Status: "pending" | "running" | "completed"
 */
export function updateDAGNodeStatus(stepName, status) {
    if (!_state.dagFloatingVisible || !stepName) {
        return;
    }

    const nodeId = convertStepNameToNodeId(stepName);

    _state.dagNodeStatuses[nodeId] = status;

    // Re-render floating DAG using scaled SVG (fix: use generateScaledSVG instead of generateSVG)
    const container = document.getElementById("dag-floating");
    if (container && _state.dagPositionedNodes && _state.dagLayoutEdges) {
        const floatingWidth = 400;
        const floatingHeight = 230;
        const svg = generateScaledSVG(_state.dagPositionedNodes, _state.dagLayoutEdges, _state.dagNodeStatuses, floatingWidth, floatingHeight);
        const viewport = container.querySelector(".dag-floating-canvas");
        if (viewport) {
            viewport.innerHTML = svg;
        }

        const stepCount = Object.keys(_state.dagPositionedNodes).length;
        const completedCount = Object.values(_state.dagNodeStatuses).filter(s => s === "completed").length;
        const header = container.querySelector(".dag-floating-header span");
        if (header) {
            header.textContent = `📋 Execution Plan (${completedCount}/${stepCount} completed)`;
        }
    }

    // Update Canvas renderer if preview modal is open
    if (_state.dagCanvasRenderer) {
        _state.dagCanvasRenderer.updateNodeStatus(nodeId, status);
    }
}

// Register global functions for HTML onclick handlers
export function registerGlobals() {
    window.showDAGPreview = showDAGPreview;
    window.toggleDAGCollapse = toggleDAGCollapse;
}
